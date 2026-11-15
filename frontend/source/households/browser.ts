export type BrowserKind = "ios" | "brave" | "firefox" | "edge" | "samsung" | "chrome" | "safari" | "other";

export interface BrowserInfo {
  kind: BrowserKind;
  isMobile: boolean;
  isInstalled: boolean;
}

export function detectBrowser(
  userAgent: string,
  options: { hasBrave: boolean; isInstalled: boolean; touchPoints: number },
): BrowserInfo {
  const isIos =
    /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && options.touchPoints > 1);
  const isMobile = isIos || /Android|Mobile/.test(userAgent);
  let kind: BrowserKind = "other";
  if (isIos) {
    kind = "ios";
  } else if (options.hasBrave) {
    kind = "brave";
  } else if (/Firefox\//.test(userAgent)) {
    kind = "firefox";
  } else if (/Edg(A|iOS)?\//.test(userAgent)) {
    kind = "edge";
  } else if (/SamsungBrowser\//.test(userAgent)) {
    kind = "samsung";
  } else if (/Chrome\//.test(userAgent)) {
    kind = "chrome";
  } else if (/Safari\//.test(userAgent)) {
    kind = "safari";
  }
  return { kind, isMobile, isInstalled: options.isInstalled };
}

export function currentBrowser(): BrowserInfo {
  const isInstalled =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return detectBrowser(navigator.userAgent, {
    hasBrave: "brave" in navigator,
    isInstalled,
    touchPoints: navigator.maxTouchPoints ?? 0,
  });
}
