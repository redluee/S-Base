import { describe, expect, it } from "bun:test";
import { buildTemplateMeta } from "./template-payload";

describe("buildTemplateMeta", () => {
  it("sends explicit nulls when optional fields are cleared", () => {
    const meta = buildTemplateMeta({ name: "Push", description: "", targetMuscleGroups: "  ", estimatedTime: "" });
    expect(meta).toEqual({ name: "Push", description: null, targetMuscleGroups: null, estimatedTime: null });
    const json = JSON.parse(JSON.stringify(meta));
    expect("description" in json).toBe(true);
    expect(json.estimatedTime).toBeNull();
  });

  it("keeps filled values", () => {
    const meta = buildTemplateMeta({ name: "Push", description: "Heavy", targetMuscleGroups: "chest", estimatedTime: "45" });
    expect(meta).toEqual({ name: "Push", description: "Heavy", targetMuscleGroups: "chest", estimatedTime: 45 });
  });
});
