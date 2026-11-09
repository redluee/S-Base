export function isCurrentlyFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as unknown as {
    fullscreenElement?: Element;
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
  };
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export async function requestFullscreenAcrossBrowsers(targetElement?: HTMLElement | null): Promise<void> {
  if (typeof document === "undefined") return;

  const candidates = [
    targetElement,
    document.documentElement,
    document.body,
  ].filter(Boolean) as Array<{
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  }>;

  for (const el of candidates) {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return;
      }
      if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
        return;
      }
      if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
        return;
      }
    } catch {
      // Continue to next candidate
    }
  }
}

export async function exitFullscreenAcrossBrowsers(): Promise<void> {
  if (typeof document === "undefined") return;
  const doc = document as unknown as {
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };

  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return;
    }
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return;
    }
    if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return;
    }
    if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return;
    }
  } catch (err) {
    console.error("Exit fullscreen error:", err);
  }
}
