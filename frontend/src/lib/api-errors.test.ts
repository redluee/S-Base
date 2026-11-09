import { describe, expect, it } from "bun:test";
import { ApiError, apiErrorMessage } from "@/lib/api";

describe("API error keys", () => {
  it("translates a backend error key through t()", () => {
    const err = new ApiError("recipes.wineNotFound", 404, { error: "recipes.wineNotFound" });
    expect(err.key).toBe("recipes.wineNotFound");
    expect(err.message).toBe("Wijn niet gevonden.");
  });

  it("fills params from the error details", () => {
    const err = new ApiError("upload.typeNotAllowed", 400, { error: "upload.typeNotAllowed", allowed: ["jpg", "png"] });
    expect(err.message).toBe("Bestandstype niet toegestaan. Toegestaan: jpg, png");
  });

  it("keeps untranslated legacy messages as they are", () => {
    expect(new ApiError("Something legacy", 400).message).toBe("Something legacy");
  });

  it("falls back to a translated key for non-API errors", () => {
    expect(apiErrorMessage(new TypeError("fetch failed"), "Failed to upload photo")).toBe("Foto uploaden mislukt");
    expect(apiErrorMessage(new ApiError("common.notFound", 404), "Save failed")).toBe("Niet gevonden.");
  });
});
