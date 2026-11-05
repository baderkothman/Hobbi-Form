// Forward-only schema migrations, applied in order by applyMigrations.
export const migrations: readonly { id: string; sql: string }[] = [
  {
    id: "0001_init",
    sql: `
      CREATE TABLE responses (
        submission_id   uuid PRIMARY KEY,
        audience        text NOT NULL CHECK (audience IN ('explorer', 'club')),
        locale          text NOT NULL CHECK (locale IN ('en', 'ar')),
        survey_version  text NOT NULL,
        answers         jsonb NOT NULL,
        contact         text,
        contact_consent boolean NOT NULL DEFAULT false,
        created_at      timestamptz NOT NULL DEFAULT now(),
        -- The database itself refuses contact details without consent.
        CONSTRAINT contact_requires_consent CHECK (contact IS NULL OR contact_consent)
      );
      CREATE INDEX responses_audience_created_at ON responses (audience, created_at);

      -- Short-lived counters keyed by a keyed hash of the IP and the hour, and
      -- never linked to a response.
      CREATE TABLE rate_limits (
        key        text PRIMARY KEY,
        count      integer NOT NULL,
        expires_at timestamptz NOT NULL
      );
      CREATE INDEX rate_limits_expires_at ON rate_limits (expires_at);
    `,
  },
];

export type SqlRunner = {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: unknown[]; rowCount?: number | null }>;
  exec(sql: string): Promise<unknown>;
  close?(): Promise<void>;
};

export async function applyMigrations(db: SqlRunner): Promise<string[]> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const { rows } = await db.query("SELECT id FROM schema_migrations");
  const applied = new Set((rows as { id: string }[]).map((row) => row.id));
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    await db.exec(
      `BEGIN;
       ${migration.sql}
       INSERT INTO schema_migrations (id) VALUES ('${migration.id}');
       COMMIT;`,
    );
    newlyApplied.push(migration.id);
  }
  return newlyApplied;
}
