export interface CounterDigit {
  key: number;
  digit: string;
}

export function counterDigits(value: number): CounterDigit[] {
  const text = String(Math.max(0, Math.trunc(value)));
  return Array.from(text, (digit, i) => ({ key: text.length - 1 - i, digit }));
}
