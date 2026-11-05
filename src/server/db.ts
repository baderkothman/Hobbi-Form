// One small SQL seam with two drivers that speak the same dialect:
//  - DATABASE_URL set: a Postgres connection pool (Neon, RDS, self-hosted).
//  - Otherwise: embedded Postgres (PGlite) on disk, so the app runs with no
//    infrastructure in development or on a single long-lived server.
// Production without either setting is refused rather than saving to a
// throwaway filesystem and losing responses.
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { applyMigrations, type SqlRunner } from "./migrations";

export class DatabaseNotConfiguredError extends Error {}

const DEFAULT_EMBEDDED_PATH = ".data/pglite";

async function connectPostgres(connectionString: string): Promise<SqlRunner> {
  const { default: pg } = await import("pg");
  // A small pool: serverless platforms run many instances with one request each.
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 5_000,
    query_timeout: 8_000,
  });
  // Without a listener, an idle-client error would crash the process.
  pool.on("error", (error) => {
    console.error(JSON.stringify({ event: "db.pool_error", code: error.name }));
  });
  return {
    query: (sql, params) => pool.query(sql, params as unknown[]),
    exec: (sql) => pool.query(sql),
  };
}

/** Pass no path for an in-memory database, as the tests do. */
export async function createEmbeddedDb(path?: string): Promise<SqlRunner> {
  const { PGlite } = await import("@electric-sql/pglite");
  // PGlite doesn't create parent directories, and a fresh checkout has no .data/.
  if (path) mkdirSync(resolve(path), { recursive: true });
  const db = await PGlite.create(path);
  const runner: SqlRunner = {
    query: async (sql, params) => {
      const result = await db.query(sql, params as unknown[]);
      return { rows: result.rows, rowCount: result.affectedRows };
    },
    exec: (sql) => db.exec(sql),
    close: () => db.close(),
  };
  await applyMigrations(runner);
  return runner;
}

let connection: Promise<SqlRunner> | undefined;

export function getDb(): Promise<SqlRunner> {
  connection ??= connect().catch((error) => {
    // Let the next request try again instead of caching a failure forever.
    connection = undefined;
    throw error;
  });
  return connection;
}

function connect(): Promise<SqlRunner> {
  const { DATABASE_URL, HOBBI_EMBEDDED_DB_PATH, NODE_ENV } = process.env;
  if (DATABASE_URL) return connectPostgres(DATABASE_URL);
  if (HOBBI_EMBEDDED_DB_PATH) return createEmbeddedDb(HOBBI_EMBEDDED_DB_PATH);
  if (NODE_ENV !== "production") return createEmbeddedDb(DEFAULT_EMBEDDED_PATH);
  return Promise.reject(
    new DatabaseNotConfiguredError(
      "Set DATABASE_URL or HOBBI_EMBEDDED_DB_PATH in production.",
    ),
  );
}
