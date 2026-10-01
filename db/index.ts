import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function runBatch(buildStatements: (database: any) => any[]) {
  const database = getDb();
  const statements = buildStatements(database);
  if (!statements.length) return [];
  return database.batch(statements as [typeof statements[number], ...typeof statements]);
}
