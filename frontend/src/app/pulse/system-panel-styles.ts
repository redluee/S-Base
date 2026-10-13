export type Notify = (text: string, type?: "success" | "error") => void;

export const BTN = "h-11 px-4 text-sm font-medium rounded-lg";
export const BTN_OUTLINE = `${BTN} border-border bg-transparent text-foreground hover:bg-white/5`;
export const BTN_DESTRUCTIVE = `${BTN} border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10`;
export const FOCUS = "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
