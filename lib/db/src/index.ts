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
  // Small pool: photobook traffic is bursty but low concurrency. Each idle
  // PG connection holds memory on BOTH the API and Postgres (Railway bills
  // that). Also keeps outbound traffic quiet so Railway Serverless can sleep.
  max: Number(process.env.DB_POOL_MAX || 5),
  // Drop idle clients quickly — Railway Serverless needs ~10min with no
  // outbound packets; sticky pool sockets prevent sleep.
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 10_000),
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
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
