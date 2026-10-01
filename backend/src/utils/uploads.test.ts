import { describe, expect, it } from "bun:test";
import {
  ATTACHMENT_EXTENSIONS,
  DOWNLOAD_ONLY_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MEASUREMENT_PHOTO_PATTERN,
  resolveUploadExtension,
  uploadResponseHeaders,
} from "./uploads";

const file = (name: string) => new File(["x"], name);

describe("upload allow-lists", () => {
  it("accepts avif and bmp images and serves them inline", () => {
    expect(resolveUploadExtension(file("photo.AVIF"), IMAGE_EXTENSIONS)).toBe("avif");
    expect(resolveUploadExtension(file("scan.bmp"), IMAGE_EXTENSIONS)).toBe("bmp");
    expect(uploadResponseHeaders("x.avif")["Content-Type"]).toBe("image/avif");
    expect(uploadResponseHeaders("x.bmp")["Content-Type"]).toBe("image/bmp");
    expect(uploadResponseHeaders("x.avif")["Content-Disposition"]).toBeUndefined();
  });

  it("keeps image-only lists free of download-only types", () => {
    for (const ext of DOWNLOAD_ONLY_EXTENSIONS) {
      expect(() => resolveUploadExtension(file(`a.${ext}`), IMAGE_EXTENSIONS)).toThrow("File type not allowed");
    }
  });

  it("allows download-only attachment types and serves them as attachments", () => {
    for (const ext of ["zip", "mp4", "mov", "webm", "mp3", "m4a", "odt", "ods", "odp", "rtf", "json"]) {
      expect(resolveUploadExtension(file(`evidence.${ext}`), ATTACHMENT_EXTENSIONS)).toBe(ext);
      const headers = uploadResponseHeaders(`minor_123e4567-e89b-12d3-a456-426614174000.${ext}`);
      expect(headers["Content-Type"]).toBe("application/octet-stream");
      expect(headers["Content-Disposition"]).toBe("attachment");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    }
  });

  it("never allows markup or script types", () => {
    for (const ext of ["svg", "html", "htm", "js", "mjs", "xhtml", "xml", "php"]) {
      expect(() => resolveUploadExtension(file(`evil.${ext}`), ATTACHMENT_EXTENSIONS)).toThrow("File type not allowed");
    }
  });

  it("only matches prefixed measurement photo paths", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(MEASUREMENT_PHOTO_PATTERN.test(`/api/uploads/measurement_${uuid}.jpg`)).toBe(true);
    expect(MEASUREMENT_PHOTO_PATTERN.test(`/api/uploads/measurement_${uuid}.avif`)).toBe(true);
    expect(MEASUREMENT_PHOTO_PATTERN.test(`/api/uploads/${uuid}.jpg`)).toBe(false);
    expect(MEASUREMENT_PHOTO_PATTERN.test(`/api/uploads/minor_${uuid}.jpg`)).toBe(false);
    expect(MEASUREMENT_PHOTO_PATTERN.test(`/api/uploads/measurement_${uuid}.zip`)).toBe(false);
    expect(MEASUREMENT_PHOTO_PATTERN.test(`x/api/uploads/measurement_${uuid}.jpg`)).toBe(false);
  });
});
