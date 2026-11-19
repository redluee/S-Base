import { describe, expect, it } from "bun:test";
import type { JsonGenerationRequest } from "../../lib/gemini";
import { RECIPE_IMPORT_MAX_LENGTH } from "../../shared/recipes";
import { RecipeImporter, toRecipeDraft } from "./recipes-import";

const sample = {
  name: " Romige  tomatenpasta ",
  description: "Snelle pasta.",
  cookingTime: 29.6,
  kitchen: "Italiaans",
  ingredients: [
    { name: "Penne", quantity: 400, unit: "g", isOptional: false },
    { name: "Basilicum", quantity: 0, unit: "bunch", isOptional: true },
    { name: "Boter", quantity: 78.87, unit: "g", isOptional: false },
    { name: "Gist", quantity: 7.5, unit: "g", isOptional: false },
    { name: "  ", quantity: 1, unit: "g", isOptional: false },
  ],
  steps: [{ description: "Kook de penne." }, { description: " " }],
};

describe("toRecipeDraft", () => {
  it("normalises the generated recipe", () => {
    expect(toRecipeDraft(sample)).toEqual({
      name: "Romige tomatenpasta",
      description: "Snelle pasta.",
      cookingTime: 30,
      kitchen: "Italiaans",
      ingredients: [
        { name: "Penne", quantity: 400, unit: "g", isOptional: false },
        { name: "Basilicum", quantity: 1, unit: "pcs", isOptional: true },
        { name: "Boter", quantity: 80, unit: "g", isOptional: false },
        { name: "Gist", quantity: 7.5, unit: "g", isOptional: false },
      ],
      steps: [{ description: "Kook de penne." }],
    });
  });

  it("tolerates malformed output", () => {
    expect(toRecipeDraft("nonsense")).toEqual({
      name: "",
      description: "",
      cookingTime: null,
      kitchen: null,
      ingredients: [],
      steps: [],
    });
  });
});

describe("RecipeImporter", () => {
  it("sends the pasted text and returns a draft", async () => {
    const requests: JsonGenerationRequest[] = [];
    const importer = new RecipeImporter(async (request) => {
      requests.push(request);
      return sample;
    });
    const draft = await importer.fromText("  Tomatenpasta\n400 g penne  ");
    expect(draft.name).toBe("Romige tomatenpasta");
    expect(requests[0].input).toBe("Tomatenpasta\n400 g penne");
    expect(requests[0].instructions).toContain("Never mention amounts in steps");
  });

  it("rejects empty and oversized text without calling the model", async () => {
    let calls = 0;
    const importer = new RecipeImporter(async () => {
      calls++;
      return sample;
    });
    await expect(importer.fromText("   ")).rejects.toMatchObject({ status: 400, key: "recipes.importTextRequired" });
    await expect(importer.fromText("x".repeat(RECIPE_IMPORT_MAX_LENGTH + 1))).rejects.toMatchObject({
      status: 400,
      key: "recipes.importTextTooLong",
    });
    expect(calls).toBe(0);
  });

  it("reports text without a recipe", async () => {
    const importer = new RecipeImporter(async () => ({ name: "Nieuwsbrief", ingredients: [], steps: [] }));
    await expect(importer.fromText("Schrijf je in")).rejects.toMatchObject({
      status: 422,
      key: "recipes.importNoRecipe",
    });
  });
});
