import { describe, expect, it } from "bun:test";
import { computeDropdownPlacement } from "./dropdown-placement";

const base = { desiredMaxHeight: 224, gap: 4, minUsefulHeight: 88 };

describe("dropdown placement", () => {
  it("opens downward at full height when there is plenty of room below", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 100, anchorBottom: 144, viewportTop: 0, viewportHeight: 800 }),
    ).toEqual({ side: "bottom", maxHeight: 224, cramped: false });
  });
  it("keeps opening downward when the full height fits exactly", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 528, anchorBottom: 572, viewportTop: 0, viewportHeight: 800 }),
    ).toEqual({ side: "bottom", maxHeight: 224, cramped: false });
  });
  it("flips upward when a keyboard covers the area below the input", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 340, anchorBottom: 384, viewportTop: 0, viewportHeight: 400 }),
    ).toEqual({ side: "top", maxHeight: 224, cramped: false });
  });
  it("caps the height to the room on the chosen side", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 150, anchorBottom: 194, viewportTop: 0, viewportHeight: 210 }),
    ).toEqual({ side: "top", maxHeight: 146, cramped: false });
  });
  it("picks the larger side when neither fits the full height", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 100, anchorBottom: 144, viewportTop: 0, viewportHeight: 300 }),
    ).toEqual({ side: "bottom", maxHeight: 152, cramped: false });
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 160, anchorBottom: 204, viewportTop: 0, viewportHeight: 300 }),
    ).toEqual({ side: "top", maxHeight: 156, cramped: false });
  });
  it("measures room from the visible viewport when it is offset inside the layout viewport", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 620, anchorBottom: 664, viewportTop: 300, viewportHeight: 380 }),
    ).toEqual({ side: "top", maxHeight: 224, cramped: false });
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 400, anchorBottom: 444, viewportTop: 300, viewportHeight: 380 }),
    ).toEqual({ side: "bottom", maxHeight: 224, cramped: false });
  });
  it("reports cramped when neither side has the minimum useful height", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 60, anchorBottom: 104, viewportTop: 0, viewportHeight: 160 }),
    ).toEqual({ side: "top", maxHeight: 56, cramped: true });
  });
  it("never returns a negative height when the input fills the visible area", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 2, anchorBottom: 46, viewportTop: 0, viewportHeight: 48 }),
    ).toEqual({ side: "bottom", maxHeight: 0, cramped: true });
  });
  it("works with the layout viewport as fallback when no visual viewport exists", () => {
    expect(
      computeDropdownPlacement({ ...base, anchorTop: 700, anchorBottom: 744, viewportTop: 0, viewportHeight: 800 }),
    ).toEqual({ side: "top", maxHeight: 224, cramped: false });
  });
  it("rounds fractional room down to whole pixels", () => {
    expect(
      computeDropdownPlacement({
        ...base,
        anchorTop: 150.5,
        anchorBottom: 194.5,
        viewportTop: 0,
        viewportHeight: 210,
      }),
    ).toEqual({ side: "top", maxHeight: 146, cramped: false });
  });
});
