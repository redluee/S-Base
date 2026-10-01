import { eq, and, desc, sql } from "drizzle-orm";
import db from "../../db/client";
import { measurements, measurementPhotos } from "../../db/schema";
import { join } from "path";
import { unlink } from "fs/promises";
import { MEASUREMENT_PHOTO_PATTERN, UPLOAD_NAME_PATTERN } from "../../utils/uploads";
import { ConflictError, ValidationError, optionalNumber, requireId, requireObject } from "../../utils/validation";

const MEASUREMENT_FIELDS = [
  "height", "weight", "bodyFat", "skeletalMuscle", "fatMass", "waist",
  "chest", "hips", "biceps", "thighs", "shoulders", "neck", "calves",
] as const;

function requireMeasurementDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("Date must be in YYYY-MM-DD format");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError("Date must be in YYYY-MM-DD format");
  }
  return value;
}

function validateMeasurementFields(input: Record<string, any>) {
  for (const field of MEASUREMENT_FIELDS) {
    const value = optionalNumber(input[field], field);
    if (value !== undefined && value !== null && value < 0) throw new ValidationError(`${field} cannot be negative`);
  }
}

const uploadsDir = join(import.meta.dir, "../../../uploads");

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

export class MeasurementService {
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

    const result: any[] = [];
    const map = new Map();
    for (const r of rows) {
      let m = map.get(r.measurement.measurementId);
      if (!m) {
        m = { ...r.measurement, photos: [] };
        map.set(r.measurement.measurementId, m);
        result.push(m);
      }
      if (r.photo) {
        m.photos.push(r.photo);
      }
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

  getByIdForUser(measurementId: number, userId: number) {
    const measurement = db.select().from(measurements)
      .where(and(eq(measurements.measurementId, measurementId), eq(measurements.userId, userId)))
      .get();
    if (!measurement) return null;
    return this.getById(measurementId);
  }

  ownsPhotoFile(userId: number, filename: string) {
    const rows = db.select({ userId: measurements.userId })
      .from(measurementPhotos)
      .innerJoin(measurements, eq(measurementPhotos.measurementId, measurements.measurementId))
      .where(sql`${measurementPhotos.filePath} LIKE ${"%/" + filename}`)
      .all();
    if (rows.length === 0) return null;
    return rows.some((r) => r.userId === userId);
  }

  getById(measurementId: number) {
    const measurement = db.select().from(measurements).where(eq(measurements.measurementId, measurementId)).get();
    if (!measurement) return null;
    const photos = db.select().from(measurementPhotos).where(eq(measurementPhotos.measurementId, measurementId)).all();
    return { ...measurement, photos };
  }

  save(userId: number, data: {
    date: string;
    height?: number | null;
    weight?: number | null;
    bodyFat?: number | null;
    skeletalMuscle?: number | null;
    fatMass?: number | null;
    waist?: number | null;
    chest?: number | null;
    hips?: number | null;
    biceps?: number | null;
    thighs?: number | null;
    shoulders?: number | null;
    neck?: number | null;
    calves?: number | null;
  }) {
    const input = requireObject(data);
    requireMeasurementDate(input.date);
    validateMeasurementFields(input);
    const existing = db.select()
      .from(measurements)
      .where(and(eq(measurements.userId, userId), eq(measurements.date, data.date)))
      .get();

    if (existing) {
      db.update(measurements)
        .set({
          height: data.height !== undefined ? data.height : existing.height,
          weight: data.weight !== undefined ? data.weight : existing.weight,
          bodyFat: data.bodyFat !== undefined ? data.bodyFat : existing.bodyFat,
          skeletalMuscle: data.skeletalMuscle !== undefined ? data.skeletalMuscle : existing.skeletalMuscle,
          fatMass: data.fatMass !== undefined ? data.fatMass : existing.fatMass,
          waist: data.waist !== undefined ? data.waist : existing.waist,
          chest: data.chest !== undefined ? data.chest : existing.chest,
          hips: data.hips !== undefined ? data.hips : existing.hips,
          biceps: data.biceps !== undefined ? data.biceps : existing.biceps,
          thighs: data.thighs !== undefined ? data.thighs : existing.thighs,
          shoulders: data.shoulders !== undefined ? data.shoulders : existing.shoulders,
          neck: data.neck !== undefined ? data.neck : existing.neck,
          calves: data.calves !== undefined ? data.calves : existing.calves,
        })
        .where(eq(measurements.measurementId, existing.measurementId))
        .run();
      return this.getById(existing.measurementId);
    } else {
      const inserted = db.insert(measurements)
        .values({
          userId,
          date: data.date,
          height: data.height ?? null,
          weight: data.weight ?? null,
          bodyFat: data.bodyFat ?? null,
          skeletalMuscle: data.skeletalMuscle ?? null,
          fatMass: data.fatMass ?? null,
          waist: data.waist ?? null,
          chest: data.chest ?? null,
          hips: data.hips ?? null,
          biceps: data.biceps ?? null,
          thighs: data.thighs ?? null,
          shoulders: data.shoulders ?? null,
          neck: data.neck ?? null,
          calves: data.calves ?? null,
        })
        .returning()
        .get();
      return this.getById(inserted.measurementId);
    }
  }

  update(userId: number, measurementIdRaw: unknown, data: Record<string, any>) {
    const measurementId = requireId(measurementIdRaw, "Measurement id");
    const input = requireObject(data);
    if (input.date !== undefined) requireMeasurementDate(input.date);
    validateMeasurementFields(input);

    const existing = db.select().from(measurements)
      .where(and(eq(measurements.measurementId, measurementId), eq(measurements.userId, userId)))
      .get();
    if (!existing) return null;

    const targetDate: string = input.date ?? existing.date;
    if (targetDate !== existing.date) {
      const collision = db.select({ measurementId: measurements.measurementId }).from(measurements)
        .where(and(eq(measurements.userId, userId), eq(measurements.date, targetDate)))
        .get();
      if (collision) {
        throw new ConflictError("A measurement already exists for this date", {
          existingMeasurementId: collision.measurementId,
          date: targetDate,
        });
      }
    }

    const values: Record<string, unknown> = { date: targetDate };
    for (const field of MEASUREMENT_FIELDS) {
      if (input[field] !== undefined) values[field] = input[field];
    }
    db.update(measurements).set(values).where(eq(measurements.measurementId, measurementId)).run();
    return this.getById(measurementId);
  }

  addPhoto(measurementId: number, userId: number, filePath: unknown) {
    if (typeof filePath !== "string" || !MEASUREMENT_PHOTO_PATTERN.test(filePath)) {
      throw new ValidationError("Invalid photo path");
    }
    const owned = db.select({ id: measurements.measurementId }).from(measurements)
      .where(and(eq(measurements.measurementId, measurementId), eq(measurements.userId, userId)))
      .get();
    if (!owned) return null;
    const inUse = db.select({ id: measurementPhotos.photoId }).from(measurementPhotos)
      .where(eq(measurementPhotos.filePath, filePath))
      .get();
    if (inUse) throw new ValidationError("Photo is already in use");
    db.insert(measurementPhotos)
      .values({
        measurementId,
        filePath,
      })
      .run();
    return this.getById(measurementId);
  }

  async deletePhoto(photoId: number, userId: number) {
    const photo = db.select({
      photoId: measurementPhotos.photoId,
      filePath: measurementPhotos.filePath,
      userId: measurements.userId,
    })
    .from(measurementPhotos)
    .innerJoin(measurements, eq(measurementPhotos.measurementId, measurements.measurementId))
    .where(and(eq(measurementPhotos.photoId, photoId), eq(measurements.userId, userId)))
    .get();

    if (!photo) return false;

    const shared = referencedElsewhere(photo.filePath, [photoId]);
    db.delete(measurementPhotos).where(eq(measurementPhotos.photoId, photoId)).run();
    if (!shared) await removeUploadedFile(photo.filePath);
    return true;
  }

  async deleteMeasurement(measurementId: number, userId: number) {
    const m = db.select()
      .from(measurements)
      .where(and(eq(measurements.measurementId, measurementId), eq(measurements.userId, userId)))
      .get();

    if (!m) return false;

    const photos = db.select().from(measurementPhotos).where(eq(measurementPhotos.measurementId, measurementId)).all();
    const photoIds = photos.map((p) => p.photoId);
    const deletable = photos.filter((p) => !referencedElsewhere(p.filePath, photoIds));

    db.delete(measurements).where(eq(measurements.measurementId, measurementId)).run();
    for (const photo of deletable) await removeUploadedFile(photo.filePath);
    return true;
  }
}
