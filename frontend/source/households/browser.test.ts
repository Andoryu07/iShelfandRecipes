import { describe, expect, it } from "vitest";
import { detectBrowser } from "./browser";

const options = { hasBrave: false, isInstalled: false, touchPoints: 0 };

describe("browser detection", () => {
  it("recognizes the browsers we give hints for", () => {
    const android = "Mozilla/5.0 (Linux; Android 14; SM-G950F) AppleWebKit/537.36 (KHTML, like Gecko)";
    expect(detectBrowser(`${android} Chrome/131.0 Mobile Safari/537.36`, options)).toEqual({
      kind: "chrome",
      isMobile: true,
      isInstalled: false,
    });
    expect(
      detectBrowser(`${android} SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36`, options).kind,
    ).toBe("samsung");
    expect(detectBrowser(`${android} Chrome/131.0 Mobile Safari/537.36 EdgA/131.0`, options).kind).toBe(
      "edge",
    );
    expect(
      detectBrowser("Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0", options).kind,
    ).toBe("firefox");
    expect(
      detectBrowser(`${android} Chrome/131.0 Mobile Safari/537.36`, { ...options, hasBrave: true }).kind,
    ).toBe("brave");
    expect(
      detectBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1",
        options,
      ),
    ).toEqual({ kind: "ios", isMobile: true, isInstalled: false });
    expect(
      detectBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.1 Safari/605.1.15",
        {
          ...options,
          touchPoints: 5,
        },
      ).kind,
    ).toBe("ios");
    expect(
      detectBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.1 Safari/605.1.15",
        options,
      ),
    ).toEqual({ kind: "safari", isMobile: false, isInstalled: false });
  });
});
