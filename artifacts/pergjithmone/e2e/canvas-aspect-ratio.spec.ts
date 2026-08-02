/**
 * E2E: Editor canvas aspect-ratio regression test
 *
 * Opens the editor for a square (21×21 cm) photobook project and asserts that
 * the rendered Konva canvas clientWidth / clientHeight ratio stays within ±2 %
 * of 1:1.  The test also resizes the viewport and re-checks, catching any
 * regression where a fixed-height assumption silently distorts non-3:4 canvases
 * after a window resize.
 *
 * Auth strategy:
 *   Setup is done inside a browser context created from the `browser` fixture
 *   so that `context.request` shares cookies with pages from that context.
 *   After login the refreshToken httpOnly cookie lives in the context.  We
 *   persist the full storage state to a file and tell each test to restore it
 *   via `test.use({ storageState })` so the React app can auto-refresh the
 *   access token via its `/api/auth/refresh` call on every navigation.
 *
 * Prerequisites:
 *   - artifacts/pergjithmone  dev server  →  set PLAYWRIGHT_BASE_URL
 *   - artifacts/api-server    running on the port Vite proxies at /api (8080)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect, type BrowserContext } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname_e2e = path.dirname(__filename);
const AUTH_STATE = path.join(__dirname_e2e, '.auth-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// Shared state populated in beforeAll
// ─────────────────────────────────────────────────────────────────────────────

let projectId = -1;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function ctxPost(
  ctx: BrowserContext,
  path: string,
  body: unknown,
  token?: string,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await ctx.request.post(`/api${path}`, { data: body, headers });
  if (!resp.ok()) {
    const text = await resp.text();
    throw new Error(`POST /api${path} → ${resp.status()}: ${text}`);
  }
  return resp.json();
}

async function ctxGet(ctx: BrowserContext, apiPath: string) {
  const resp = await ctx.request.get(`/api${apiPath}`);
  if (!resp.ok()) {
    const text = await resp.text();
    throw new Error(`GET /api${apiPath} → ${resp.status()}: ${text}`);
  }
  return resp.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }) => {
  // Create a dedicated setup context so that `context.request` shares its
  // cookie jar with any page opened from the same context.  Login calls made
  // through this object therefore propagate the refreshToken cookie into the
  // same origin the page will later navigate to — Playwright's `storageState`
  // then serialises those cookies so they can be restored into every test's
  // fresh browser context.
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;

  const setupCtx = await browser.newContext({ baseURL });

  // ── 1. Register a unique test user ────────────────────────────────────────
  const ts = Date.now().toString().slice(-9); // 9-digit suffix
  const phone = `+355${ts}`;
  const password = 'TestPass123!';

  await ctxPost(setupCtx, '/auth/register', {
    phone,
    password,
    name: 'E2E Canvas Test',
  });

  // Login → sets refreshToken httpOnly cookie in setupCtx's jar +
  //         returns a short-lived accessToken for authenticated API calls.
  const loginData = await ctxPost(setupCtx, '/auth/login', { phone, password });
  const accessToken: string = loginData.accessToken;

  // ── 2. Ensure a square (21×21 cm) book size exists ────────────────────────
  const bookSizes: Array<{ id: number; widthCm: number; heightCm: number }> =
    await ctxGet(setupCtx, '/book-sizes');

  let squareSizeId: number | null = null;
  for (const s of bookSizes) {
    if (Math.abs(Number(s.widthCm) - Number(s.heightCm)) < 0.01) {
      squareSizeId = s.id;
      break;
    }
  }

  if (squareSizeId === null) {
    // No square book size — create one using super-admin credentials.
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error(
        'No square book size found in /api/book-sizes and ' +
        'SUPER_ADMIN_PASSWORD is not set.  Either create a 21×21 cm book ' +
        'size in the admin panel, or set SUPER_ADMIN_PASSWORD.',
      );
    }

    // Admin login — note: setupCtx will now have the admin's refreshToken
    // cookie, but we only need the bearer token for the book-size mutation.
    const adminData = await ctxPost(setupCtx, '/auth/login', {
      email: 'armand9a@gmail.com',
      password: adminPassword,
    });
    const adminToken: string = adminData.accessToken;

    const created = await ctxPost(
      setupCtx,
      '/admin/book-sizes',
      {
        label: 'Square 21×21 cm (e2e)',
        widthCm: 21,
        heightCm: 21,
        isActive: true,
        minPages: 20,
        priceBase: 3100,
        pricePerExtraSpread: 200,
      },
      adminToken,
    );
    squareSizeId = created.id;

    // Re-login as the test user so the final storageState carries the test
    // user's refreshToken cookie (not the admin's).
    const reloginData = await ctxPost(setupCtx, '/auth/login', {
      phone,
      password,
    });
    Object.assign(loginData, reloginData); // refresh accessToken too
  }

  // ── 3. Create a project with the square book size ────────────────────────
  const project = await ctxPost(
    setupCtx,
    '/projects',
    { bookSizeId: squareSizeId, title: 'E2E Square Canvas Test' },
    accessToken,
  );
  projectId = project.id;

  // Persist cookies (including the refreshToken httpOnly cookie) so every
  // test can restore the authenticated browser session.
  await setupCtx.storageState({ path: AUTH_STATE });
  await setupCtx.close();
});

// Restore the saved auth state (refreshToken cookie) before every test so the
// React app can exchange it for a fresh access token on page load.
test.use({ storageState: AUTH_STATE });

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Editor canvas — square book aspect ratio', () => {
  test(
    'canvas clientWidth / clientHeight is within ±2 % of 1:1 on initial load',
    async ({ page }) => {
      await page.goto(`/editor/${projectId}`);

      // Wait for the Konva stage canvas to appear — it only renders once the
      // project data (bookSizeId → widthCm/heightCm) has loaded from the API
      // and the ResizeObserver has measured the container.
      const canvas = page.locator('.konvajs-content canvas').first();
      await canvas.waitFor({ state: 'visible', timeout: 30_000 });

      // One extra frame for the ResizeObserver to settle final dimensions.
      await page.waitForTimeout(300);

      const { w, h } = await page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('.konvajs-content canvas');
        if (!c) throw new Error('canvas element not found');
        return { w: c.clientWidth, h: c.clientHeight };
      });

      expect(w, 'canvas must have a positive width').toBeGreaterThan(0);
      expect(h, 'canvas must have a positive height').toBeGreaterThan(0);

      const ratio = w / h;
      expect(ratio, `expected 1:1 ratio, got ${w}×${h} (ratio ${ratio.toFixed(3)})`).toBeGreaterThan(0.98);
      expect(ratio, `expected 1:1 ratio, got ${w}×${h} (ratio ${ratio.toFixed(3)})`).toBeLessThan(1.02);
    },
  );

  test(
    'canvas keeps 1:1 ratio after browser window resize',
    async ({ page }) => {
      await page.goto(`/editor/${projectId}`);

      const canvas = page.locator('.konvajs-content canvas').first();
      await canvas.waitFor({ state: 'visible', timeout: 30_000 });

      // Trigger the ResizeObserver in Editor.tsx by changing the viewport size.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(300);

      await page.setViewportSize({ width: 900, height: 700 });
      await page.waitForTimeout(300);

      const { w, h } = await page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('.konvajs-content canvas');
        if (!c) throw new Error('canvas element not found');
        return { w: c.clientWidth, h: c.clientHeight };
      });

      expect(w, 'canvas must have a positive width after resize').toBeGreaterThan(0);
      expect(h, 'canvas must have a positive height after resize').toBeGreaterThan(0);

      const ratio = w / h;
      expect(
        ratio,
        `expected 1:1 ratio after resize, got ${w}×${h} (ratio ${ratio.toFixed(3)})`,
      ).toBeGreaterThan(0.98);
      expect(
        ratio,
        `expected 1:1 ratio after resize, got ${w}×${h} (ratio ${ratio.toFixed(3)})`,
      ).toBeLessThan(1.02);
    },
  );
});
