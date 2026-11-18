"use client";

let iosSwitch: HTMLLabelElement | null = null;

function iosHapticSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (iosSwitch?.isConnected) return iosSwitch;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitch = label;
  return label;
}

export type HapticKind = "tick" | "threshold" | "pop";

const VIBRATION_MS: Record<HapticKind, number | number[]> = { tick: 5, threshold: 10, pop: [12, 30, 8] };

export function haptic(kind: HapticKind = "tick"): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(VIBRATION_MS[kind]);
    return;
  }
  iosHapticSwitch()?.click();
}
