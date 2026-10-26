export function financeChartScale(values: number[]) {
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const rawStep = Math.max(100, (maximum - minimum) / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = ([10, 5, 2, 1].find((value) => value * magnitude <= rawStep) ?? 1) * magnitude;
  const lower = Math.floor(minimum / step) * step;
  const upper = maximum > 0 ? Math.ceil(maximum / step) * step : minimum < 0 ? 0 : step;
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, index) => lower + index * step).reverse();
  return { lower, upper, ticks };
}
