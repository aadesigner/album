import { describe, it, expect } from "vitest";
import { createDynamicLimiter } from "./dynamicRateLimit";
import { clampSecurityNumber, SECURITY_SETTINGS_DEFAULTS } from "./securitySettingsShared";
import type { Request, Response, NextFunction } from "express";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    path: "/api/projects",
    headers: {},
    ip: "203.0.113.10",
    ...overrides,
  } as Request;
}

function mockRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader(k: string, v: string) { headers[k] = v; return res; },
    status(n: number) { res.statusCode = n; return res; },
    json(b: unknown) { res.body = b; return res; },
    headers,
  };
  return res as typeof res & Response;
}

async function run(
  limiter: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request,
) {
  const res = mockRes();
  let nextCalled = false;
  await limiter(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

const settings = {
  ...SECURITY_SETTINGS_DEFAULTS,
  rateLimitGeneralWindowMs: 60_000,
  rateLimitGeneralMax: 3,
};

describe("createDynamicLimiter", () => {
  it("allows traffic under the cap and 429s the next write", async () => {
    const limiter = createDynamicLimiter(
      {
        windowMsKey: "rateLimitGeneralWindowMs",
        maxKey: "rateLimitGeneralMax",
        message: "slow down",
        skipSafeMethods: true,
        keyByUser: true,
      },
      { getSettings: () => settings, clientIp: () => "203.0.113.10", logEvent: () => {} },
    );
    const req = mockReq();
    expect((await run(limiter, req)).nextCalled).toBe(true);
    expect((await run(limiter, req)).nextCalled).toBe(true);
    expect((await run(limiter, req)).nextCalled).toBe(true);
    const blocked = await run(limiter, req);
    expect(blocked.nextCalled).toBe(false);
    expect(blocked.res.statusCode).toBe(429);
    expect(Number(blocked.res.headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("does not count catalog GET/HEAD against the write bucket", async () => {
    const limiter = createDynamicLimiter(
      {
        windowMsKey: "rateLimitGeneralWindowMs",
        maxKey: "rateLimitGeneralMax",
        message: "slow down",
      },
      { getSettings: () => ({ ...settings, rateLimitGeneralMax: 1 }), clientIp: () => "203.0.113.10", logEvent: () => {} },
    );
    for (let i = 0; i < 5; i++) {
      const r = await run(limiter, mockReq({ method: "GET" }));
      expect(r.nextCalled).toBe(true);
    }
    const write = await run(limiter, mockReq({ method: "POST" }));
    expect(write.nextCalled).toBe(true);
  });

  it("fails open when the client IP is missing", async () => {
    const limiter = createDynamicLimiter(
      {
        windowMsKey: "rateLimitGeneralWindowMs",
        maxKey: "rateLimitGeneralMax",
        message: "slow down",
        keyByUser: false,
      },
      { getSettings: () => ({ ...settings, rateLimitGeneralMax: 1 }), clientIp: () => null, logEvent: () => {} },
    );
    for (let i = 0; i < 5; i++) {
      expect((await run(limiter, mockReq())).nextCalled).toBe(true);
    }
  });

  it("fails open when max is 0 so a bad setting cannot lock the shop", async () => {
    const limiter = createDynamicLimiter(
      {
        windowMsKey: "rateLimitGeneralWindowMs",
        maxKey: "rateLimitGeneralMax",
        message: "slow down",
      },
      { getSettings: () => ({ ...settings, rateLimitGeneralMax: 0 }), clientIp: () => "203.0.113.10", logEvent: () => {} },
    );
    expect((await run(limiter, mockReq())).nextCalled).toBe(true);
  });

  it("keeps two logged-in clients on the same IP in separate buckets", async () => {
    let userId = 1;
    const limiter = createDynamicLimiter(
      {
        windowMsKey: "rateLimitGeneralWindowMs",
        maxKey: "rateLimitGeneralMax",
        message: "slow down",
        keyByUser: true,
      },
      {
        getSettings: () => ({ ...settings, rateLimitGeneralMax: 1 }),
        clientIp: () => "203.0.113.10",
        peekUser: () => ({ userId, role: "user" }),
        logEvent: () => {},
      },
    );
    expect((await run(limiter, mockReq())).nextCalled).toBe(true);
    expect((await run(limiter, mockReq())).res.statusCode).toBe(429);
    userId = 2;
    expect((await run(limiter, mockReq())).nextCalled).toBe(true);
  });

  it("never rate-limits admins", async () => {
    const limiter = createDynamicLimiter(
      {
        windowMsKey: "rateLimitGeneralWindowMs",
        maxKey: "rateLimitGeneralMax",
        message: "slow down",
      },
      {
        getSettings: () => ({ ...settings, rateLimitGeneralMax: 1 }),
        peekUser: () => ({ userId: 9, role: "admin" }),
        clientIp: () => "203.0.113.10",
        logEvent: () => {},
      },
    );
    for (let i = 0; i < 5; i++) {
      expect((await run(limiter, mockReq())).nextCalled).toBe(true);
    }
  });
});

describe("clampSecurityNumber", () => {
  it("rejects 0 / tiny rate caps so they cannot 429 everyone", () => {
    expect(clampSecurityNumber("rateLimitGeneralMax", 0)).toBe(SECURITY_SETTINGS_DEFAULTS.rateLimitGeneralMax);
    expect(clampSecurityNumber("rateLimitAuthMax", 2)).toBe(SECURITY_SETTINGS_DEFAULTS.rateLimitAuthMax);
    expect(clampSecurityNumber("rateLimitGeneralMax", 5000)).toBe(5000);
  });
});
