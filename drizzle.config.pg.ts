import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/postgres",
  schema: "./db/schema.pg.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/macobsa",
  },
});