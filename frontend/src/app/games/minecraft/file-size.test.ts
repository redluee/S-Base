import { describe, expect, it } from "bun:test";
import { formatFileSize } from "./file-size";

describe("formatFileSize", () => {
  it("uses bytes, kilobytes and megabytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.00 MB");
  });

  it("shows a dash for missing sizes", () => {
    expect(formatFileSize(Number.NaN)).toBe("-");
  });
});
