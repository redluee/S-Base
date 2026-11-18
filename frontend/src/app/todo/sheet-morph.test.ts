import { describe, expect, it } from "bun:test";
import { morphFrames } from "./sheet-morph";

const sheet = { left: 0, top: 500, width: 375, height: 200 };

describe("sheet morph", () => {
  it("starts as the tapped button's circle and ends as the full sheet", () => {
    const fab = { rect: { left: 300, top: 730, width: 56, height: 56 }, radius: 9999, color: null };
    expect(morphFrames(fab, sheet, "16px 16px 0px 0px")).toEqual([
      { transform: "translate(300px, 230px)", clipPath: "inset(0px 319px 144px 0px round 28px)" },
      { transform: "translate(0px, 0px)", clipPath: "inset(0px 0px 0px 0px round 16px 16px 0px 0px)" },
    ]);
  });

  it("starts as the add row higher up the page", () => {
    const row = { rect: { left: 16, top: 240.5, width: 343, height: 56 }, radius: 0, color: null };
    expect(morphFrames(row, sheet, "16px")[0]).toEqual({
      transform: "translate(16px, -259.5px)",
      clipPath: "inset(0px 32px 144px 0px round 0px)",
    });
  });

  it("never clips wider or taller than the sheet itself", () => {
    const wide = { rect: { left: 0, top: 0, width: 900, height: 900 }, radius: 12, color: null };
    expect(morphFrames(wide, sheet, "16px")[0].clipPath).toBe("inset(0px 0px 0px 0px round 12px)");
  });
});
