import { describe, it, expect } from "vitest";
import { parseIp, getClientIp } from "./clientIp";
import type { Request } from "express";

function req(partial: Partial<Request> & { headers?: Record<string, string | string[]> }): Request {
  return {
    headers: {},
    socket: { remoteAddress: "10.0.0.9" },
    ...partial,
  } as Request;
}

describe("parseIp", () => {
  it("accepts dotted IPv4 and strips the mapped prefix", () => {
    expect(parseIp("::ffff:203.0.113.10")).toBe("203.0.113.10");
    expect(parseIp("203.0.113.10:443")).toBe("203.0.113.10");
  });

  it("rejects junk that used to collapse every visitor onto one bucket", () => {
    expect(parseIp("unknown")).toBeNull();
    expect(parseIp("")).toBeNull();
    expect(parseIp("not-an-ip")).toBeNull();
    expect(parseIp("999.1.1.1")).toBeNull();
  });
});

describe("getClientIp", () => {
  it("prefers Cloudflare over a spoofable X-Forwarded-For list", () => {
    const ip = getClientIp(req({
      headers: {
        "cf-connecting-ip": "198.51.100.20",
        "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      },
      ip: "10.0.0.1",
    }));
    expect(ip).toBe("198.51.100.20");
  });

  it("uses the right-most XFF hop when no CDN header is present", () => {
    const ip = getClientIp(req({
      headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.8" },
      ip: undefined,
    }));
    expect(ip).toBe("203.0.113.8");
  });
});
