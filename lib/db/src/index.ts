import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Bound the pool so a burst of concurrent requests (e.g. many people
  // registering/uploading at once) can't open unlimited connections and
  // exhaust the database's connection limit.
  max: 20,
  // Recycle idle connections instead of holding them open forever — avoids
  // accumulating stale connections that Postgres or a proxy may silently drop.
  idleTimeoutMillis: 30_000,
  // Fail fast with a clear error instead of hanging indefinitely when the
  // pool is saturated and the database is slow to respond.
  connectionTimeoutMillis: 10_000,
});

// pg's Pool is an EventEmitter. A client can emit a background 'error' event
// (e.g. the database restarts, a network blip drops an idle connection) even
// though no query is in flight. Without a listener here, that 'error' event
// has no handler and crashes the entire Node process — this is the single
// most common cause of an otherwise-healthy Express app going down under
// load or during brief DB hiccups. Log and swallow it instead; the pool
// automatically replaces the broken client on the next checkout.
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[db] Unexpected error on idle client — recovering:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
