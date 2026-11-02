import { describe, it, expect } from "vitest";
import {
  sanitizeClarityProjectId,
  normalizeClarityWrite,
  readClaritySettings,
} from "./claritySettings";

describe("sanitizeClarityProjectId", () => {
  it("keeps a bare project id", () => {
    expect(sanitizeClarityProjectId("abc12xyz")).toBe("abc12xyz");
  });

  it("extracts an id from the official embed snippet", () => {
    const snippet = `(function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/k9x2m1ab";
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "k9x2m1ab");`;
    expect(sanitizeClarityProjectId(snippet)).toBe("k9x2m1ab");
  });

  it("returns empty for blank input", () => {
    expect(sanitizeClarityProjectId("")).toBe("");
    expect(sanitizeClarityProjectId("   ")).toBe("");
  });
});

describe("normalizeClarityWrite", () => {
  it("normalizes the enable flag", () => {
    expect(normalizeClarityWrite("clarityEnabled", true)).toBe("true");
    expect(normalizeClarityWrite("clarityEnabled", "false")).toBe("false");
  });

  it("normalizes project id input", () => {
    expect(normalizeClarityWrite("clarityProjectId", "abc12xyz")).toBe("abc12xyz");
  });

  it("ignores unrelated keys", () => {
    expect(normalizeClarityWrite("offerBarEnabled", true)).toBeNull();
  });
});

describe("readClaritySettings", () => {
  it("stays off by default", () => {
    expect(readClaritySettings({})).toEqual({
      clarityEnabled: false,
      clarityProjectId: "",
    });
  });

  it("returns the raw toggle and sanitized project id", () => {
    expect(readClaritySettings({ clarity_enabled: "true" })).toEqual({
      clarityEnabled: true,
      clarityProjectId: "",
    });
    expect(
      readClaritySettings({ clarity_enabled: "true", clarity_project_id: "abc12xyz" }),
    ).toEqual({ clarityEnabled: true, clarityProjectId: "abc12xyz" });
  });
});
