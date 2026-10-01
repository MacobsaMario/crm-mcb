import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app/crm-app.tsx", import.meta.url), "utf8");
const inhouse = await readFile(new URL("../app/el-rosado-control.tsx", import.meta.url), "utf8");
const uploadRoute = await readFile(new URL("../app/api/report-uploads/route.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");

test("refreshes every report-backed menu screen from live APIs", () => {
  for (const endpoint of [
    "/api/updates",
    "/api/report-uploads",
    "/api/opportunities",
    "/api/billing",
    "/api/regulatory",
    "/api/dispatch",
    "/api/financial",
    "/api/inhouse",
    "/api/receivables",
    "/api/client-controls",
    "/api/payroll",
  ]) assert.match(app, new RegExp(endpoint.replaceAll("/", "\\/")));
  assert.match(app, /setInterval\(refreshLiveRecords, 10000\)/);
});

test("keeps El Rosado on the same ten-second live refresh contract", () => {
  assert.match(inhouse, /setInterval\(refresh, 10000\)/);
  assert.match(inhouse, /visibilitychange/);
  assert.match(app, /false && <div className="updates-layout inhouse-entry">/);
});

test("links every new update to its source report", () => {
  assert.match(schema, /sourceReportId: integer\("source_report_id"\)/);
  assert.match(uploadRoute, /sourceReportId: report\.id/);
});
