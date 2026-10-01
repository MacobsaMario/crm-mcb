import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const AUDIT_OWNER_EMAIL = "k2v5nc8k7s@privaterelay.appleid.com";

type SchemaObject = {
  type: string;
  name: string;
  tableName: string;
  definition: string | null;
};

type ColumnDefinition = {
  position: number;
  name: string;
  dataType: string;
  required: number;
  defaultValue: unknown;
  primaryKeyPosition: number;
};

type ForeignKeyDefinition = {
  id: number;
  sequence: number;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string | null;
  onUpdate: string;
  onDelete: string;
  match: string;
};

export type AuditTable = {
  name: string;
  columns: ColumnDefinition[];
  foreignKeys: ForeignKeyDefinition[];
  rowCount: number;
  rows: Record<string, unknown>[];
  sha256: string;
};

export type D1AuditSnapshot = {
  format: "macobsa-d1-logical-snapshot-v1";
  binding: "DB";
  schemaObjects: SchemaObject[];
  sequences: Array<{ tableName: string; nextBase: number }>;
  tables: AuditTable[];
  totalRows: number;
  sha256: string;
};

export async function requireAuditOwner(): Promise<Response | null> {
  if (process.env.DYNO) {
    return Response.json({ error: "Recurso no disponible" }, {
      status: 404,
      headers: auditHeaders(),
    });
  }
  const user = await getChatGPTUser();
  if (!user || user.email.trim().toLowerCase() !== AUDIT_OWNER_EMAIL) {
    return Response.json({ error: "Recurso no disponible" }, {
      status: 404,
      headers: auditHeaders(),
    });
  }
  return null;
}

export function auditHeaders(extra: Record<string, string> = {}) {
  return {
    "cache-control": "private, no-store, max-age=0",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

export function getAuditD1(): D1Database {
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("D1 binding DB unavailable");
  return database;
}

export function getAuditR2(): R2Bucket {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!bucket) throw new Error("R2 binding BUCKET unavailable");
  return bucket;
}

export async function buildD1AuditSnapshot(): Promise<D1AuditSnapshot> {
  const database = getAuditD1();
  const schemaResult = await database.prepare(`
    SELECT type, name, tbl_name AS table_name, sql AS definition
    FROM sqlite_schema
    WHERE (name NOT LIKE 'sqlite_%' AND substr(name, 1, 4) <> '_cf_')
       OR name = 'sqlite_sequence'
    ORDER BY type, name
  `).all<Record<string, unknown>>();
  assertQuerySuccess(schemaResult, "schema");
  const schemaObjects: SchemaObject[] = (schemaResult.results ?? []).map((row) => ({
    type: String(row.type ?? ""),
    name: String(row.name ?? ""),
    tableName: String(row.table_name ?? ""),
    definition: row.definition === null || row.definition === undefined
      ? null
      : String(row.definition),
  }));
  let sequences: Array<{ tableName: string; nextBase: number }> = [];
  if (schemaObjects.some((item) => item.name === "sqlite_sequence")) {
    const sequenceResult = await database.prepare(`
      SELECT name AS table_name, seq AS next_base
      FROM sqlite_sequence
      ORDER BY name
    `).all<Record<string, unknown>>();
    assertQuerySuccess(sequenceResult, "sequences");
    sequences = (sequenceResult.results ?? []).map((row) => ({
      tableName: String(row.table_name ?? ""),
      nextBase: Number(row.next_base),
    }));
  }
  const tableNames = schemaObjects
    .filter((item) => item.type === "table" && item.name !== "sqlite_sequence")
    .map((item) => item.name)
    .filter(isSafeIdentifier);

  if (tableNames.length !== schemaObjects.filter((item) => item.type === "table" && item.name !== "sqlite_sequence").length) {
    throw new Error("Unsafe table identifier returned by D1");
  }

  const statements: D1PreparedStatement[] = [];
  for (const tableName of tableNames) {
    statements.push(database.prepare(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY rowid`));
    statements.push(database.prepare(`
      SELECT cid AS position, name, type AS data_type, "notnull" AS required,
             dflt_value AS default_value, pk AS primary_key_position
      FROM pragma_table_info(?)
      ORDER BY cid
    `).bind(tableName));
    statements.push(database.prepare(`
      SELECT id, seq AS sequence, "table" AS target_table, "from" AS source_column,
             "to" AS target_column, on_update, on_delete, match
      FROM pragma_foreign_key_list(?)
      ORDER BY id, seq
    `).bind(tableName));
  }

  const results = statements.length ? await database.batch<Record<string, unknown>>(statements) : [];
  const tables: AuditTable[] = [];
  for (let index = 0; index < tableNames.length; index += 1) {
    const rowsResult = results[index * 3];
    const columnsResult = results[index * 3 + 1];
    const foreignKeysResult = results[index * 3 + 2];
    assertQuerySuccess(rowsResult, `${tableNames[index]} rows`);
    assertQuerySuccess(columnsResult, `${tableNames[index]} columns`);
    assertQuerySuccess(foreignKeysResult, `${tableNames[index]} foreign keys`);
    const rows = (rowsResult.results ?? []) as Record<string, unknown>[];
    const columns: ColumnDefinition[] = (columnsResult.results ?? []).map((row) => ({
      position: Number(row.position),
      name: String(row.name ?? ""),
      dataType: String(row.data_type ?? ""),
      required: Number(row.required),
      defaultValue: row.default_value ?? null,
      primaryKeyPosition: Number(row.primary_key_position),
    }));
    const foreignKeys: ForeignKeyDefinition[] = (foreignKeysResult.results ?? []).map((row) => ({
      id: Number(row.id),
      sequence: Number(row.sequence),
      targetTable: String(row.target_table ?? ""),
      sourceColumn: String(row.source_column ?? ""),
      targetColumn: row.target_column === null || row.target_column === undefined
        ? null
        : String(row.target_column),
      onUpdate: String(row.on_update ?? ""),
      onDelete: String(row.on_delete ?? ""),
      match: String(row.match ?? ""),
    }));
    tables.push({
      name: tableNames[index],
      columns,
      foreignKeys,
      rowCount: rows.length,
      rows,
      sha256: await sha256(canonicalJson({ columns, foreignKeys, rows })),
    });
  }

  const core = {
    format: "macobsa-d1-logical-snapshot-v1" as const,
    binding: "DB" as const,
    schemaObjects,
    sequences,
    tables,
    totalRows: tables.reduce((sum, table) => sum + table.rowCount, 0),
  };
  return { ...core, sha256: await sha256(canonicalJson(core)) };
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertQuerySuccess(result: D1Result<unknown> | undefined, label: string) {
  if (!result?.success) throw new Error(`D1 read failed: ${label}`);
}

function isSafeIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value instanceof ArrayBuffer) return { bytesHex: toHex(new Uint8Array(value)) };
  if (ArrayBuffer.isView(value)) {
    return { bytesHex: toHex(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
