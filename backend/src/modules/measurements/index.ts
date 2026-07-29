import { eq, and, desc, sql } from "drizzle-orm";
import db from "../../db/client";
import { measurements, measurementPhotos } from "../../db/schema";
import { join } from "path";
import { unlink } from "fs/promises";

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
  }) {
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
        })
        .where(eq(measurements.measurementId, existing.measurementId))
        .run();
      return this.getById(existing.measurementId);
    } else {
      const insertResult = db.insert(measurements)
        .values({
          userId,
          date: data.date,
          height: data.height ?? null,
          weight: data.weight ?? null,
          bodyFat: data.bodyFat ?? null,
          skeletalMuscle: data.skeletalMuscle ?? null,
          fatMass: data.fatMass ?? null,
        })
        .run();
      
      const measurementId = Number(insertResult.lastInsertRowid);
      return this.getById(measurementId);
    }
  }

  addPhoto(measurementId: number, filePath: string) {
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

    db.delete(measurementPhotos).where(eq(measurementPhotos.photoId, photoId)).run();
    
    try {
      const filename = photo.filePath.split("/").pop();
      if (filename) {
        const fullPath = join(import.meta.dir, "../../../uploads", filename);
        await unlink(fullPath);
      }
    } catch (err) {
      console.error("Failed to delete physical photo file:", err);
    }
    return true;
  }

  async deleteMeasurement(measurementId: number, userId: number) {
    const m = db.select()
      .from(measurements)
      .where(and(eq(measurements.measurementId, measurementId), eq(measurements.userId, userId)))
      .get();

    if (!m) return false;

    const photos = db.select().from(measurementPhotos).where(eq(measurementPhotos.measurementId, measurementId)).all();
    for (const photo of photos) {
      try {
        const filename = photo.filePath.split("/").pop();
        if (filename) {
          const fullPath = join(import.meta.dir, "../../../uploads", filename);
          await unlink(fullPath);
        }
      } catch (err) {
        console.error("Failed to delete physical photo file:", err);
      }
    }

    db.delete(measurements).where(eq(measurements.measurementId, measurementId)).run();
    return true;
  }
}
