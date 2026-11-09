import { describe, expect, it } from "bun:test";
import {
  formSignature,
  shouldPersistDraft,
  buildDraft,
  parseDraft,
  evaluateDraft,
  type TemplateDraftForm,
} from "./template-draft";

type Row = { id: string; name: string; weight: string };

const base: TemplateDraftForm<Row> = {
  name: "Push",
  description: "",
  targetMuscleGroups: "",
  estimatedTime: "",
  exercises: [{ id: "ex-0", name: "Bench", weight: "60" }],
};

describe("Template draft logic", () => {
  it("does not persist an untouched form (viewing the edit page)", () => {
    const sig = formSignature(base);
    expect(shouldPersistDraft(base, sig)).toBe(false);
    expect(shouldPersistDraft({ ...base, exercises: [{ ...base.exercises[0], id: "other" }] }, sig)).toBe(false);
  });

  it("persists real edits", () => {
    const sig = formSignature(base);
    expect(shouldPersistDraft({ ...base, name: "Pull" }, sig)).toBe(true);
    expect(shouldPersistDraft({ ...base, exercises: [{ ...base.exercises[0], weight: "65" }] }, sig)).toBe(true);
  });

  it("treats a draft as fresh when the server version is unchanged", () => {
    const sig = formSignature(base);
    const draft = buildDraft({ ...base, name: "Pull" }, sig);
    expect(evaluateDraft(parseDraft<Row>(JSON.stringify(draft))!, sig)).toBe("fresh");
  });

  it("treats a draft as stale when the server version changed", () => {
    const draft = buildDraft({ ...base, name: "Pull" }, formSignature(base));
    const newServer = formSignature({ ...base, exercises: [{ id: "x", name: "Bench", weight: "70" }] });
    expect(evaluateDraft(draft, newServer)).toBe("stale");
  });

  it("treats a draft identical to the server version as unchanged", () => {
    const sig = formSignature(base);
    expect(evaluateDraft(buildDraft(base, "whatever"), sig)).toBe("unchanged");
  });

  it("treats legacy drafts (no base signature) as stale and rejects garbage", () => {
    const legacy = JSON.stringify({ name: "Old", description: "", targetMuscleGroups: "", estimatedTime: "", exercises: [] });
    const parsed = parseDraft<Row>(legacy)!;
    expect(parsed.baseSignature).toBe("");
    expect(evaluateDraft(parsed, formSignature(base))).toBe("stale");
    expect(parseDraft<Row>("not json")).toBeNull();
    expect(parseDraft<Row>(null)).toBeNull();
  });
});
