import { describe, expect, it, beforeEach } from "bun:test";
import { isSoundEnabled, setSoundEnabled } from "./sound";

class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, val: string) {
    this.store[key] = val;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

describe("Frontend sound utility preferences", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", { value: {}, writable: true, configurable: true });
    Object.defineProperty(globalThis, "localStorage", { value: new MockLocalStorage(), writable: true, configurable: true });
  });

  it("defaults sound enabled to true", () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it("updates and persists sound preference", () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });
});
