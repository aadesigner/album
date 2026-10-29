/**
 * Production static server for Përgjithmonë.
 * Serves dist/public, answers /api/geo from Cloudflare CF-IPCountry,
 * and proxies other /api/* calls to API_URL.
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist", "public");
const port = Number(process.env.PORT || 8080);

function normalizeApiUrl(raw) {
  const value = String(raw || "").trim().replace(/\/$/, "");
  if (!value) return "";
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.origin + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
  } catch {
    return "";
  }
}

const apiUrl = normalizeApiUrl(process.env.API_URL || process.env.VITE_API_URL);

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
  if (res.headersSent) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
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
  fs.createReadStream(filePath)
    .on("error", (err) => {
      console.error("[static]", filePath, err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Failed to read file" });
      else res.end();
    })
    .pipe(res);
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "upgrade",
  "transfer-encoding",
  "expect",
]);

/**
 * Stream /api to api-server. Photo uploads are multipart; buffering them in
 * fetch() and dropping Content-Length corrupted the file bytes so sharp
 * rejected every image from the editor, studio, and category forms.
 */
function proxyApi(req, res, pathname, search) {
  if (!apiUrl) {
    sendJson(res, 503, {
      error: "API_URL is not set on the frontend service. Point it at api-server.",
    });
    return;
  }

  let target;
  try {
    target = new URL(`${apiUrl}${pathname}${search}`);
  } catch {
    sendJson(res, 502, { error: "API_URL is invalid", apiUrl });
    return;
  }

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "host") continue;
    headers[key] = Array.isArray(value) ? value.join(",") : value;
  }
  headers.host = target.host;

  const lib = target.protocol === "https:" ? https : http;
  const method = req.method || "GET";
  const upstream = lib.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method,
      headers,
      timeout: 120_000,
    },
    (upRes) => {
      const outHeaders = { ...upRes.headers };
      delete outHeaders.connection;
      delete outHeaders["keep-alive"];
      res.writeHead(upRes.statusCode || 502, outHeaders);
      upRes.pipe(res);
    },
  );

  upstream.on("timeout", () => {
    upstream.destroy();
    if (!res.headersSent) sendJson(res, 504, { error: "API timeout while uploading or loading." });
  });
  upstream.on("error", (err) => {
    console.error("[proxy]", method, pathname, err?.message || err);
    if (!res.headersSent) {
      sendJson(res, 502, {
        error: "Bad gateway — could not reach API_URL",
        detail: String(err?.message || err),
        apiUrl,
      });
    } else {
      res.end();
    }
  });

  req.on("error", (err) => {
    console.error("[proxy:req]", method, pathname, err?.message || err);
    upstream.destroy();
  });
  req.pipe(upstream);
}

function resolveStatic(pathname) {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const safe = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.resolve(distDir, "." + (safe.startsWith("/") ? safe : `/${safe}`));
  if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) return null;
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  } catch {
    return null;
  }
  return null;
}

const indexHtml = path.join(distDir, "index.html");
if (!fs.existsSync(indexHtml)) {
  console.error(`[pergjithmone] Missing ${indexHtml} — run build first`);
  process.exit(1);
}

console.log(`[pergjithmone] dist=${distDir}`);
console.log(`[pergjithmone] API_URL=${apiUrl || "(unset — /api will 503)"}`);

const server = http.createServer((req, res) => {
  void (async () => {
    try {
      const host = req.headers.host || "localhost";
      const url = new URL(req.url || "/", `http://${host}`);

      if (url.pathname === "/api/geo" || url.pathname === "/api/geo/") {
        const raw = String(req.headers["cf-ipcountry"] ?? "XX").trim().toUpperCase();
        const country = /^[A-Z]{2}$/.test(raw) ? raw : "XX";
        sendJson(res, 200, { country });
        return;
      }

      if (url.pathname.startsWith("/api/") || url.pathname === "/api") {
        proxyApi(req, res, url.pathname, url.search);
        return;
      }

      // Health for Railway
      if (url.pathname === "/healthz") {
        sendJson(res, 200, { ok: true });
        return;
      }

      const exact = resolveStatic(url.pathname === "/" ? "/index.html" : url.pathname);
      if (exact) {
        sendFile(res, exact);
        return;
      }

      // SPA fallback for client routes like /krijo, /hyr
      if (!path.extname(url.pathname)) {
        sendFile(res, indexHtml);
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error("[server]", err);
      sendJson(res, 500, { error: "Internal server error" });
    }
  })();
});

server.requestTimeout = 0;
server.headersTimeout = 120_000;
server.timeout = 0;
server.listen(port, "0.0.0.0", () => {
  console.log(`[pergjithmone] listening on 0.0.0.0:${port}`);
});
