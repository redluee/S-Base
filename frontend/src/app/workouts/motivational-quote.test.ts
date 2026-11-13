import { describe, expect, it } from "bun:test";
import { quoteOfTheDay } from "./motivational-quote";
import quotes from "./workout-quotes.json";

describe("quoteOfTheDay", () => {
  it("shows the same quote all day, the next one tomorrow, and starts at the first quote on 1 January", () => {
    expect(quoteOfTheDay(new Date(2026, 7, 12, 1))).toBe(quoteOfTheDay(new Date(2026, 7, 12, 23)));
    expect(quoteOfTheDay(new Date(2026, 7, 13))).not.toBe(quoteOfTheDay(new Date(2026, 7, 12)));
    expect(quoteOfTheDay(new Date(2026, 0, 1))).toBe(quotes[0]);
  });
});
