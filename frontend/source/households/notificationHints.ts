import { texts } from "../translations/cs";
import type { BrowserInfo } from "./browser";

const hints = texts.notifications.hints;

export function unsupportedHint(browser: BrowserInfo): string {
  if (browser.kind === "ios" && !browser.isInstalled) {
    return hints.iosInstall;
  }
  if (browser.kind === "ios") {
    return hints.iosTooOld;
  }
  return texts.notifications.unsupported;
}

export function deniedHint(browser: BrowserInfo): string {
  if (browser.kind === "ios") {
    return hints.deniedIos;
  }
  if (browser.isInstalled && browser.isMobile) {
    return hints.deniedInstalledAndroid;
  }
  if (browser.kind === "firefox") {
    return hints.deniedFirefox;
  }
  if (browser.kind === "safari") {
    return hints.deniedSafari;
  }
  return browser.isMobile ? hints.deniedMobile : hints.deniedDesktop;
}

export function subscribeFailedHint(browser: BrowserInfo): string {
  if (browser.kind === "brave") {
    return hints.brave;
  }
  return texts.notifications.subscribeFailed;
}
