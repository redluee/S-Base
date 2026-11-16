export type DropdownSide = "top" | "bottom";

export type DropdownPlacementInput = {
  anchorTop: number;
  anchorBottom: number;
  viewportTop: number;
  viewportHeight: number;
  desiredMaxHeight: number;
  gap: number;
  minUsefulHeight: number;
};

export type DropdownPlacement = {
  side: DropdownSide;
  maxHeight: number;
  cramped: boolean;
};

export function computeDropdownPlacement({
  anchorTop,
  anchorBottom,
  viewportTop,
  viewportHeight,
  desiredMaxHeight,
  gap,
  minUsefulHeight,
}: DropdownPlacementInput): DropdownPlacement {
  const roomBelow = viewportTop + viewportHeight - anchorBottom - gap;
  const roomAbove = anchorTop - viewportTop - gap;
  const side: DropdownSide = roomBelow >= desiredMaxHeight || roomBelow >= roomAbove ? "bottom" : "top";
  const room = side === "bottom" ? roomBelow : roomAbove;
  const maxHeight = Math.max(0, Math.floor(Math.min(desiredMaxHeight, room)));
  return { side, maxHeight, cramped: maxHeight < minUsefulHeight };
}
