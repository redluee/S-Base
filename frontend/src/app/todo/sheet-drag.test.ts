import { describe, expect, it } from "bun:test";
import { keyboardInset, sheetDragOffset, shouldCloseSheet } from "./sheet-drag";

describe("sheet drag", () => {
  it("follows a downward drag and resists an upward one", () => {
    expect(sheetDragOffset(80)).toBe(80);
    expect(sheetDragOffset(-40)).toBe(-10);
  });

  it("closes past a quarter of the sheet, capped at 120 px", () => {
    expect(shouldCloseSheet({ distance: 70, velocity: 0.1, height: 280 })).toBe(true);
    expect(shouldCloseSheet({ distance: 60, velocity: 0.1, height: 280 })).toBe(false);
    expect(shouldCloseSheet({ distance: 120, velocity: 0.1, height: 800 })).toBe(true);
    expect(shouldCloseSheet({ distance: 110, velocity: 0.1, height: 800 })).toBe(false);
  });

  it("closes on a quick flick but not on a tap or an upward move", () => {
    expect(shouldCloseSheet({ distance: 30, velocity: 0.8, height: 800 })).toBe(true);
    expect(shouldCloseSheet({ distance: 10, velocity: 2, height: 800 })).toBe(false);
    expect(shouldCloseSheet({ distance: -200, velocity: 1, height: 800 })).toBe(false);
  });

  it("measures the on-screen keyboard from the visual viewport", () => {
    expect(keyboardInset(800, { height: 460, offsetTop: 0 })).toBe(340);
    expect(keyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0);
    expect(keyboardInset(800, null)).toBe(0);
  });
});
