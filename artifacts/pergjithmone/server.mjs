/**
 * Production static server for Përgjithmonë.
 * Serves dist/public, answers /api/geo from Cloudflare CF-IPCountry,
 * and proxies other /api/* calls to API_URL.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist", "public");
const port = Number(process.env.PORT || 8080);
const apiUrl = (process.env.API_URL || process.env.VITE_API_URL || "").replace(/\/$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, max-age=0",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
}

async function proxyApi(req, res, url) {
  if (!apiUrl) {
    sendJson(res, 503, {
      error: "API_URL is not set on the frontend service. Point it at api-server.",
    });
    return;
  }

  const target = `${apiUrl}${url.pathname}${url.search}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") continue;
    if (Array.isArray(value)) headers.set(key, value.join(","));
    else headers.set(key, value);
  }
  headers.set("host", new URL(apiUrl).host);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    });

    res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    if (!upstream.body) {
      res.end();
      return;
    }
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error("[proxy]", req.method, url.pathname, err);
    sendJson(res, 502, { error: "Bad gateway — could not reach API_URL" });
  }
}

function resolveStatic(pathname) {
  const safe = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safe);
  if (!filePath.startsWith(distDir)) return null;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  return null;
}

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error(`[pergjithmone] Missing ${path.join(distDir, "index.html")} — run build first`);
  process.exit(1);
}

if (!apiUrl) {
  console.warn(
    "[pergjithmone] API_URL is not set. /api requests (except /api/geo) will return 503.",
  );
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/geo" || url.pathname === "/api/geo/") {
      const raw = String(req.headers["cf-ipcountry"] ?? "XX").trim().toUpperCase();
      const country = /^[A-Z]{2}$/.test(raw) ? raw : "XX";
      sendJson(res, 200, { country });
      return;
    }

    if (url.pathname.startsWith("/api/") || url.pathname === "/api") {
      await proxyApi(req, res, url);
      return;
    }

    const exact = resolveStatic(url.pathname === "/" ? "/index.html" : url.pathname);
    if (exact) {
      sendFile(res, exact);
      return;
    }

    // SPA fallback for client routes like /krijo, /hyr (no file extension).
    if (!path.extname(url.pathname)) {
      const index = resolveStatic("/index.html");
      if (index) {
        sendFile(res, index);
        return;
      }
    }

    sendJson(res, 404, { error: "Not found" });

  } catch (err) {
    console.error("[server]", err);
    if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
    else res.end();
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[pergjithmone] listening on 0.0.0.0:${port}`);
  console.log(`[pergjithmone] API_URL=${apiUrl || "(unset)"}`);
});
