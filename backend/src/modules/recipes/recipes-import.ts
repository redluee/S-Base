import { type JsonGenerator, generateJson } from "../../lib/gemini";
import { DEFAULT_RECIPE_UNIT, isRecipeUnit, RECIPE_IMPORT_MAX_LENGTH, RECIPE_UNITS } from "../../shared/recipes";
import { AppError, ValidationError } from "../../utils/errors";

export interface RecipeDraftIngredient {
  name: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
}

export interface RecipeDraft {
  name: string;
  description: string;
  cookingTime: number | null;
  kitchen: string | null;
  ingredients: RecipeDraftIngredient[];
  steps: { description: string }[];
}

const INSTRUCTIONS = `You turn recipe text that a user copied from a recipe website into structured data for a Dutch recipe app.

General
- Ignore everything that is not part of the recipe: stories, ads, navigation, comments, reviews, nutrition facts, related recipes.
- Write every text field in Dutch, translating when the source is in another language. Use natural, everyday Dutch cooking language.
- Never invent ingredients or steps that are not in the source.

Fields
- name: the recipe title, short, in sentence case.
- description: one short sentence describing the dish, or an empty string.
- cookingTime: total preparation plus cooking time in whole minutes, or null when the source does not say.
- kitchen: the cuisine as a Dutch adjective (Italiaans, Mexicaans, Thais, Nederlands, ...), or null when unclear.
- ingredients: every ingredient exactly once, in the order of the source.
  - name: only the ingredient itself, capitalised, without amounts or preparation notes ("Rode ui", not "2 rode uien, fijngesneden").
  - quantity: a positive number (use decimals for fractions: 1/2 becomes 0.5).
  - unit: exactly one of ${RECIPE_UNITS.join(", ")}. Convert other units: el/eetlepel = tbsp, tl/theelepel = tsp, snufje/mespunt = pinch, stuks/teen/blik/bos/plak/zakje = pcs, cl and dl to ml, cups and ounces to g or ml. Round converted amounts to practical kitchen values (75 g, not 78.87 g). For ingredients without an amount ("zout en peper naar smaak") use quantity 1 with unit pinch.
  - isOptional: true only when the source marks the ingredient as optional.
  - Split combined lines into separate ingredients ("zout en peper" becomes Zout and Peper).
- steps: the preparation, in order, split into logically separate steps.
  - Each step covers one coherent action or stage (prepare, then cook, then finish), in one or two short imperative sentences.
  - Be concise: drop tips, explanations and repeated information.
  - Never mention amounts in steps: no quantities, weights, volumes, counts or units. Refer to ingredients by name only ("Snijd de ui fijn", not "Snijd 2 uien fijn"; "Voeg de bloem toe", not "Voeg 250 g bloem toe").
  - Temperatures, times and pan sizes may stay ("Bak 10 minuten op 200 °C").`;

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    cookingTime: { type: ["integer", "null"] },
    kitchen: { type: ["string", "null"] },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string", enum: [...RECIPE_UNITS] },
          isOptional: { type: "boolean" },
        },
        required: ["name", "quantity", "unit", "isOptional"],
      },
    },
    steps: {
      type: "array",
      items: { type: "object", properties: { description: { type: "string" } }, required: ["description"] },
    },
  },
  required: ["name", "description", "cookingTime", "kitchen", "ingredients", "steps"],
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function positiveNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function practicalQuantity(quantity: number, unit: string): number {
  if ((unit === "g" || unit === "ml") && quantity >= 20) return Math.round(quantity / 5) * 5;
  return quantity;
}

export function toRecipeDraft(raw: unknown): RecipeDraft {
  const data = record(raw);
  const time = positiveNumber(data.cookingTime);
  const ingredients = list(data.ingredients)
    .map((ing) => {
      const unit = isRecipeUnit(ing.unit) ? ing.unit : DEFAULT_RECIPE_UNIT;
      return {
        name: text(ing.name),
        quantity: practicalQuantity(positiveNumber(ing.quantity) ?? 1, unit),
        unit,
        isOptional: ing.isOptional === true,
      };
    })
    .filter((ing) => ing.name);
  const steps = list(data.steps)
    .map((step) => ({ description: text(step.description) }))
    .filter((step) => step.description);

  return {
    name: text(data.name),
    description: text(data.description),
    cookingTime: time === null ? null : Math.round(time),
    kitchen: text(data.kitchen) || null,
    ingredients,
    steps,
  };
}

export class RecipeImporter {
  constructor(private readonly generate: JsonGenerator = generateJson) {}

  async fromText(source: string): Promise<RecipeDraft> {
    const input = source.trim();
    if (!input) throw new ValidationError("recipes.importTextRequired");
    if (input.length > RECIPE_IMPORT_MAX_LENGTH) {
      throw new ValidationError("recipes.importTextTooLong", { max: RECIPE_IMPORT_MAX_LENGTH });
    }

    const draft = toRecipeDraft(await this.generate({ instructions: INSTRUCTIONS, input, schema: SCHEMA }));
    if (!draft.name || (!draft.ingredients.length && !draft.steps.length)) {
      throw new AppError(422, "recipes.importNoRecipe");
    }
    return draft;
  }
}
