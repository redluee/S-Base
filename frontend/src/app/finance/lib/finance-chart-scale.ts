export function financeChartScale(values: number[], includeZero = true) {
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const padding = Math.max(max - min, Math.abs(min) * 0.1, Math.abs(max) * 0.1, 100) * 0.25;
  const minimum = includeZero ? Math.min(0, min) : min >= 0 ? Math.max(0, min - padding) : min - padding;
  const maximum = includeZero ? Math.max(0, max) : max <= 0 ? Math.min(0, max + padding) : max + padding;
  const rawStep = Math.max(100, (maximum - minimum) / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = ([10, 5, 2, 1].find((value) => value * magnitude <= rawStep) ?? 1) * magnitude;
  const lower = Math.floor(minimum / step) * step;
  const upper = Math.max(lower + step, Math.ceil(maximum / step) * step);
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, index) => lower + index * step).reverse();
  return { lower, upper, ticks };
}
