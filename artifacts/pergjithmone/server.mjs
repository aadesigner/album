/**
 * Production static server for Përgjithmonë.
 * Serves dist/public, answers /api/geo from Cloudflare CF-IPCountry,
 * and proxies other /api/* calls to API_URL.
 */
import http from "node:http";
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function proxyApi(req, res, pathname, search) {
  if (!apiUrl) {
    sendJson(res, 503, {
      error: "API_URL is not set on the frontend service. Point it at api-server.",
    });
    return;
  }

  const target = `${apiUrl}${pathname}${search}`;
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "content-length" ||
      lower === "transfer-encoding" ||
      lower === "keep-alive"
    ) {
      continue;
    }
    headers[key] = Array.isArray(value) ? value.join(",") : value;
  }
  headers.host = new URL(apiUrl).host;

  const method = req.method || "GET";
  const body =
    method === "GET" || method === "HEAD" ? undefined : await readBody(req);

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "transfer-encoding" || lower === "connection") return;
      outHeaders[key] = value;
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    outHeaders["content-length"] = String(buf.byteLength);
    res.writeHead(upstream.status, outHeaders);
    res.end(buf);
  } catch (err) {
    console.error("[proxy]", method, pathname, err?.message || err);
    sendJson(res, 502, {
      error: "Bad gateway — could not reach API_URL",
      detail: String(err?.message || err),
      apiUrl,
    });
  }
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
        await proxyApi(req, res, url.pathname, url.search);
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

server.listen(port, "0.0.0.0", () => {
  console.log(`[pergjithmone] listening on 0.0.0.0:${port}`);
});
