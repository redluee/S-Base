import { eq, and, desc, sql } from "drizzle-orm";
import { join } from "path";
import { unlink } from "fs/promises";
import db from "../../db/client";
import { measurements, measurementPhotos } from "../../db/schema";
import { ConflictError, ValidationError, orNotFound } from "../../utils/errors";
import { MEASUREMENT_PHOTO_PATTERN, UPLOAD_NAME_PATTERN } from "../../utils/uploads";
import type { MeasurementSaveInput, MeasurementUpdateInput } from "./workout-schemas";
import { invalidRequest, requireId, requireObject } from "./workout-validation";

const MEASUREMENT_FIELDS = [
  "height", "weight", "bodyFat", "skeletalMuscle", "fatMass", "waist",
  "chest", "hips", "biceps", "thighs", "shoulders", "neck", "calves",
] as const;

const uploadsDir = join(import.meta.dir, "../../../uploads");

function requireMeasurementDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("workout.invalidMeasurementDate");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError("workout.invalidMeasurementDate");
  }
  return value;
}

function validateMeasurementFields(input: Record<string, unknown>) {
  for (const field of MEASUREMENT_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) throw invalidRequest();
    if (value < 0) throw new ValidationError("workout.measurementNegative", { field });
  }
}

function referencedElsewhere(filePath: string, excludePhotoIds: number[]) {
  const rows = db.select({ photoId: measurementPhotos.photoId }).from(measurementPhotos)
    .where(eq(measurementPhotos.filePath, filePath))
    .all();
  return rows.some((r) => !excludePhotoIds.includes(r.photoId));
}

async function removeUploadedFile(filePath: string) {
  const match = /^\/api\/uploads\/([^/]+)$/.exec(filePath);
  if (!match || !UPLOAD_NAME_PATTERN.test(match[1])) return;
  try {
    await unlink(join(uploadsDir, match[1]));
  } catch (err) {
    console.error("Failed to delete physical photo file:", err);
  }
}

export class WorkoutMeasurements {
  list(userId: number) {
    const rows = db.select({
      measurement: measurements,
      photo: measurementPhotos,
    })
    .from(measurements)
    .leftJoin(measurementPhotos, eq(measurements.measurementId, measurementPhotos.measurementId))
    .where(eq(measurements.userId, userId))
    .orderBy(desc(measurements.date), desc(measurements.createdAt))
    .all();

    const result: (typeof measurements.$inferSelect & { photos: (typeof measurementPhotos.$inferSelect)[] })[] = [];
    const map = new Map<number, (typeof result)[number]>();
    for (const r of rows) {
      let m = map.get(r.measurement.measurementId);
      if (!m) {
        m = { ...r.measurement, photos: [] };
        map.set(r.measurement.measurementId, m);
        result.push(m);
      }
      if (r.photo) m.photos.push(r.photo);
    }
    return result;
  }

  getLatest(userId: number) {
    return db.select()
      .from(measurements)
      .where(eq(measurements.userId, userId))
      .orderBy(desc(measurements.date), desc(measurements.createdAt))
      .limit(1)
      .get() ?? null;
  }

  getById(measurementId: number) {
    const measurement = orNotFound(
      db.select().from(measurements).where(eq(measurements.measurementId, measurementId)).get(),
      "workout.measurementNotFound",
    );
    const photos = db.select().from(measurementPhotos).where(eq(measurementPhotos.measurementId, measurementId)).all();
    return { ...measurement, photos };
  }

  isForeignPhoto(userId: number, filename: string) {
    const rows = db.select({ userId: measurements.userId })
      .from(measurementPhotos)
      .innerJoin(measurements, eq(measurementPhotos.measurementId, measurements.measurementId))
      .where(sql`${measurementPhotos.filePath} LIKE ${"%/" + filename}`)
      .all();
    return rows.length > 0 && !rows.some((r) => r.userId === userId);
  }

  save(userId: number, data: MeasurementSaveInput) {
    const input = requireObject(data);
    requireMeasurementDate(input.date);
    validateMeasurementFields(input);
    const existing = db.select()
      .from(measurements)
      .where(and(eq(measurements.userId, userId), eq(measurements.date, data.date)))
      .get();

    if (existing) {
      const values: Record<string, unknown> = {};
      for (const field of MEASUREMENT_FIELDS) {
        values[field] = data[field] !== undefined ? data[field] : existing[field];
      }
      db.update(measurements).set(values).where(eq(measurements.measurementId, existing.measurementId)).run();
      return this.getById(existing.measurementId);
    }

    const values: Record<string, unknown> = { userId, date: data.date };
    for (const field of MEASUREMENT_FIELDS) values[field] = data[field] ?? null;
    const inserted = db.insert(measurements)
      .values(values as typeof measurements.$inferInsert)
      .returning()
      .get();
    return this.getById(inserted.measurementId);
  }

  update(userId: number, measurementIdRaw: unknown, data: MeasurementUpdateInput) {
    const measurementId = requireId(measurementIdRaw);
    const input = requireObject(data);
    if (input.date !== undefined) requireMeasurementDate(input.date);
    validateMeasurementFields(input);

    const existing = this.requireOwned(measurementId, userId);

    const targetDate = data.date ?? existing.date;
    if (targetDate !== existing.date) {
      const collision = db.select({ measurementId: measurements.measurementId }).from(measurements)
        .where(and(eq(measurements.userId, userId), eq(measurements.date, targetDate)))
        .get();
      if (collision) {
        throw new ConflictError("workout.measurementDateExists", {
          existingMeasurementId: collision.measurementId,
          date: targetDate,
        });
      }
    }

    const values: Record<string, unknown> = { date: targetDate };
    for (const field of MEASUREMENT_FIELDS) {
      if (data[field] !== undefined) values[field] = data[field];
    }
    db.update(measurements).set(values).where(eq(measurements.measurementId, measurementId)).run();
    return this.getById(measurementId);
  }

  addPhoto(measurementIdRaw: unknown, userId: number, filePath: string) {
    const measurementId = requireId(measurementIdRaw);
    if (!MEASUREMENT_PHOTO_PATTERN.test(filePath)) throw new ValidationError("workout.invalidPhotoPath");
    this.requireOwned(measurementId, userId);
    const inUse = db.select({ id: measurementPhotos.photoId }).from(measurementPhotos)
      .where(eq(measurementPhotos.filePath, filePath))
      .get();
    if (inUse) throw new ValidationError("workout.photoInUse");
    db.insert(measurementPhotos).values({ measurementId, filePath }).run();
    return this.getById(measurementId);
  }

  async deletePhoto(photoIdRaw: unknown, userId: number) {
    const photoId = requireId(photoIdRaw);
    const photo = orNotFound(
      db.select({
        photoId: measurementPhotos.photoId,
        filePath: measurementPhotos.filePath,
      })
        .from(measurementPhotos)
        .innerJoin(measurements, eq(measurementPhotos.measurementId, measurements.measurementId))
        .where(and(eq(measurementPhotos.photoId, photoId), eq(measurements.userId, userId)))
        .get(),
      "workout.photoNotFound",
    );

    const shared = referencedElsewhere(photo.filePath, [photoId]);
    db.delete(measurementPhotos).where(eq(measurementPhotos.photoId, photoId)).run();
    if (!shared) await removeUploadedFile(photo.filePath);
    return { success: true };
  }

  async remove(measurementIdRaw: unknown, userId: number) {
    const measurementId = requireId(measurementIdRaw);
    this.requireOwned(measurementId, userId);

    const photos = db.select().from(measurementPhotos).where(eq(measurementPhotos.measurementId, measurementId)).all();
    const photoIds = photos.map((p) => p.photoId);
    const deletable = photos.filter((p) => !referencedElsewhere(p.filePath, photoIds));

    db.delete(measurements).where(eq(measurements.measurementId, measurementId)).run();
    for (const photo of deletable) await removeUploadedFile(photo.filePath);
    return { success: true };
  }

  private requireOwned(measurementId: number, userId: number) {
    return orNotFound(
      db.select().from(measurements)
        .where(and(eq(measurements.measurementId, measurementId), eq(measurements.userId, userId)))
        .get(),
      "workout.measurementNotFound",
    );
  }
}
