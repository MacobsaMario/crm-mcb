import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.pg";

let pool: Pool | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the Heroku PostgreSQL runtime.");
  }

  pool ??= new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
  });

  return drizzle(pool, { schema });
}

export async function runBatch(buildStatements: (database: any) => any[]) {
  const database = getDb();
  return database.transaction(async (transaction) =>
    Promise.all(buildStatements(transaction)),
  );
}