const MAX_TAIL_BYTES = 512 * 1024;

export async function readLogTail(path: string, lines: number): Promise<string[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) return [];
  const start = Math.max(0, file.size - MAX_TAIL_BYTES);
  const text = await file.slice(start, file.size).text();
  const all = text.split("\n");
  if (start > 0) all.shift();
  return all.filter(Boolean).slice(-Math.max(0, lines));
}
