export function isSavingsTransfer(description: string, amountCents: number) {
  const match = /^(naar|van|to|from)\s+(?:(?:oranje|orange)\s+)?(?:spaarrekening|savings account)\s+[A-Z]\d{3}[- ]?\d{5}\b/i.exec(description.trim());
  if (!match) return false;
  const outgoing = /^(naar|to)$/i.test(match[1]);
  return outgoing ? amountCents < 0 : amountCents > 0;
}
