import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("backfills the verified 23 September billing and regulatory cuts", async () => {
  const sql = await readFile(new URL("../drizzle/0014_dashboard_cut_23sep.sql", import.meta.url), "utf8");
  assert.match(sql, /'2026-09-23', 24745444, 2189000, 932254, 730434, 30/);
  assert.match(sql, /'2026-09-23', 8000, 2189000, 3000000, 100000, 532000, 10, 183/);
  assert.match(sql, /WHERE NOT EXISTS/);
});

test("serves normalized regulatory snapshots and identifies the validated Control CEO cut", async () => {
  const route = await readFile(new URL("../app/api/regulatory/route.ts", import.meta.url), "utf8");
  const ui = await readFile(new URL("../app/crm-app.tsx", import.meta.url), "utf8");
  assert.match(route, /from\(regulatorySnapshots\)/);
  assert.match(route, /orderBy\(desc\(regulatorySnapshots\.reportDate\)/);
  assert.match(ui, /dashboardCutIsConsistent/);
  assert.match(ui, /Control CEO validado/);
  assert.match(ui, /latestValidBillingCut/);
  assert.match(ui, /totalProgress\.toFixed\(2\)/);
});

test("selects the latest valid billing cut without waiting for another area", async () => {
  const { latestValidBillingCut } = await import(new URL("../app/dashboard-cut.ts", import.meta.url));
  const cut = latestValidBillingCut([
    { reportDate: "2026-09-24", daiAccumulatedCents: 25540744, regulatoryAccumulatedCents: 2209000, extrasAccumulatedCents: 937254 },
    { reportDate: "2026-09-25", daiAccumulatedCents: 26147684, regulatoryAccumulatedCents: 2255000, extrasAccumulatedCents: 992454 },
    { reportDate: "invalid", daiAccumulatedCents: 99999999, regulatoryAccumulatedCents: 0, extrasAccumulatedCents: 0 },
  ], "2026-09-28");
  assert.equal(cut?.reportDate, "2026-09-25");
  assert.equal(cut?.daiAccumulatedCents + cut?.regulatoryAccumulatedCents + cut?.extrasAccumulatedCents, 29395138);
});

test("rejects future, impossible and non-integer billing cuts", async () => {
  const { latestValidBillingCut } = await import(new URL("../app/dashboard-cut.ts", import.meta.url));
  const cut = latestValidBillingCut([
    { reportDate: "2026-09-29", daiAccumulatedCents: 1, regulatoryAccumulatedCents: 1, extrasAccumulatedCents: 1 },
    { reportDate: "2026-99-99", daiAccumulatedCents: 9, regulatoryAccumulatedCents: 9, extrasAccumulatedCents: 9 },
    { reportDate: "2026-09-28", daiAccumulatedCents: 1.5, regulatoryAccumulatedCents: 1, extrasAccumulatedCents: 1 },
    { reportDate: "2026-09-27", daiAccumulatedCents: 10, regulatoryAccumulatedCents: 20, extrasAccumulatedCents: 30 },
  ], "2026-09-28");
  assert.equal(cut?.reportDate, "2026-09-27");
});

test("seeds the validated 25 September Control CEO values", async () => {
  const sql = await readFile(new URL("../drizzle/0018_official_cut_25sep.sql", import.meta.url), "utf8");
  assert.match(sql, /26147684/);
  assert.match(sql, /2255000/);
  assert.match(sql, /992454/);
  assert.match(sql, /Total combinado USD 293\.951,38; avance 81,65%; pendiente para la meta USD 66\.048,62/);
});
