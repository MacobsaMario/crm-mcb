import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../app/crm-app.tsx", import.meta.url), "utf8");
const control = readFileSync(new URL("../app/el-rosado-control.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/inhouse/control/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../drizzle/0016_el_rosado_operations.sql", import.meta.url), "utf8");

test("replaces the dated El Rosado snapshot with the live operational control", () => {
  assert.match(app, /<ElRosadoControl canManage=\{currentUser\.canManageInhouse\}/);
  assert.doesNotMatch(app, /solo 17 de 72 cumplen/);
  assert.match(control, /Control operativo completo/);
});

test("imports both El Rosado workbook sheets without erasing existing values", () => {
  assert.match(control, /grupo el rosado/);
  assert.match(control, /entrega de cargas/);
  assert.match(control, /Actualizar Excel|parseWorkbook/i);
  assert.match(api, /const keep = \(next: string, current:/);
});

test("persists the full operation timeline with a unique operation key", () => {
  assert.match(migration, /CREATE TABLE `el_rosado_operations`/);
  assert.match(migration, /`received_at` text/);
  assert.match(migration, /`authorized_exit_at` text/);
  assert.match(migration, /CREATE UNIQUE INDEX `uq_el_rosado_operations_key`/);
});
