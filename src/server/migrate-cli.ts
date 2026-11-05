// Applies migrations to DATABASE_URL. Run before deploying: npm run db:migrate
// Uses Node's built-in TypeScript support, hence the .ts import extension.
import pg from "pg";

import { applyMigrations } from "./migrations.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  const applied = await applyMigrations({
    query: (sql, params) => client.query(sql, params as unknown[]),
    exec: (sql) => client.query(sql),
  });
  console.log(
    applied.length ? `Applied: ${applied.join(", ")}` : "Already up to date.",
  );
} finally {
  await client.end();
}
