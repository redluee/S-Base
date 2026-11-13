import { describe, expect, it } from "bun:test";
import { t } from "./lang";

describe("t()", () => {
  it("fills every occurrence of a placeholder and leaves unknown keys as they are", () => {
    expect(t("NonExistentKey {x} and {x}", { x: "1" })).toBe("NonExistentKey 1 and 1");
    expect(t("NonExistentKey123")).toBe("NonExistentKey123");
  });

  it("does not treat replacement values as regex patterns", () => {
    expect(t("Value: {v}", { v: "$&$1" })).toBe("Value: $&$1");
  });
});
