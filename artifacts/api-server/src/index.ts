import { ensureSchema } from "./lib/ensureSchema";
import { logger } from "./lib/logger";

// ── Catch unhandled promise rejections so the process doesn't silently crash
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  ensureSchema();
} catch (err) {
  logger.error({ err }, "Schema push failed — refusing to start with empty/broken DB");
  process.exit(1);
}

// Import app AFTER schema push so the first requests never hit missing tables.
const { default: app } = await import("./app");
const { seedSuperAdmin } = await import("./lib/seedSuperAdmin");
const { seedCatalog } = await import("./lib/seedCatalog");

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  Promise.all([seedCatalog(), seedSuperAdmin()]).catch((seedErr) => {
    logger.error({ err: seedErr }, "Failed during startup seed");
  });
});
