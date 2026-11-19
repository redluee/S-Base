function niceStep(rawStep: number) {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  return ([10, 5, 2, 1].find((value) => value * magnitude <= rawStep) ?? 1) * magnitude;
}

export function financeChartScale(values: number[], includeZero = true) {
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const minimum = includeZero ? Math.min(0, min) : min;
  const maximum = includeZero ? Math.max(0, max) : max;
  const span = Math.max(maximum - minimum, includeZero ? 0 : Math.max(Math.abs(min), Math.abs(max)) * 0.05, 100);
  const step = niceStep(Math.max(100, span / 4));
  const above = Math.floor(maximum / step) * step + step;
  const upper = includeZero && maximum <= 0 && minimum < 0 ? 0 : above;
  const below = Math.ceil(minimum / step) * step - step;
  const lower = includeZero && minimum >= 0 ? 0 : min >= 0 ? Math.max(0, below) : below;
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, index) => lower + index * step).reverse();
  return { lower, upper, ticks };
}
