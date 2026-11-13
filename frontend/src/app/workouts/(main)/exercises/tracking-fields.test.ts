import { describe, expect, it } from "bun:test";
import { toggleTrackingField, type TrackingFields } from "./tracking-fields";

const none: TrackingFields = { reps: false, time: false, weight: false, distance: false };

describe("toggleTrackingField", () => {
  it("combines time with distance and weight", () => {
    let fields = toggleTrackingField(none, "time");
    fields = toggleTrackingField(fields, "distance");
    fields = toggleTrackingField(fields, "weight");
    expect(fields).toEqual({ reps: false, time: true, weight: true, distance: true });
  });

  it("combines reps with distance", () => {
    const fields = toggleTrackingField(toggleTrackingField(none, "reps"), "distance");
    expect(fields).toEqual({ reps: true, time: false, weight: false, distance: true });
  });

  it("selecting one metric does not deselect an unrelated one", () => {
    const start: TrackingFields = { reps: false, time: true, weight: false, distance: true };
    const next = toggleTrackingField(start, "weight");
    expect(next).toEqual({ reps: false, time: true, weight: true, distance: true });
  });

  it("keeps reps and time mutually exclusive", () => {
    const withReps = toggleTrackingField(none, "reps");
    expect(toggleTrackingField(withReps, "time")).toEqual({ reps: false, time: true, weight: false, distance: false });
  });

  it("can turn a metric off again", () => {
    const start: TrackingFields = { reps: false, time: true, weight: false, distance: true };
    expect(toggleTrackingField(start, "distance")).toEqual({ reps: false, time: true, weight: false, distance: false });
  });
});
