import { describe, expect, it } from "bun:test";
import { counterDigits } from "./counter-digits";

describe("counter digits", () => {
  it("keys digits from the right so units keep their slot when the number grows", () => {
    expect(counterDigits(9)).toEqual([{ key: 0, digit: "9" }]);
    expect(counterDigits(10)).toEqual([
      { key: 1, digit: "1" },
      { key: 0, digit: "0" },
    ]);
  });

  it("never shows negative or fractional values", () => {
    expect(counterDigits(-3)).toEqual([{ key: 0, digit: "0" }]);
    expect(counterDigits(4.7)).toEqual([{ key: 0, digit: "4" }]);
  });
});
