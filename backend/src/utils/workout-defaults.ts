export function highestCompletedWeight(sets: { weight?: number | null; completed?: number }[]): number | null {
  const weights = sets.filter((set) => set.completed !== 0 && set.weight != null).map((set) => set.weight!);
  return weights.length ? Math.max(...weights) : null;
}
