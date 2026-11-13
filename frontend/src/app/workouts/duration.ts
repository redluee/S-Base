const pad = (value: number) => String(value).padStart(2, "0");

export function formatClock(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(seconds);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  return hours > 0 ? `${sign}${hours}:${pad(minutes)}:${pad(abs % 60)}` : `${sign}${minutes}:${pad(abs % 60)}`;
}

export function formatClockInput(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

export function parseClock(value: string): number | null {
  if (!value?.trim()) return null;
  if (value.includes(":")) {
    const [min, sec] = value.split(":");
    return (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatMinutesSeconds(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}
