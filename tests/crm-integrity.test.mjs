import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { grupoPicaSummary } from "../app/grupo-pica-data.ts";

const root = process.cwd();
const crmPath = path.join(root, "app", "crm-app.tsx");

test("every visible CRM menu option has a rendered section", async () => {
  const source = await readFile(crmPath, "utf8");
  const navBlock = source.match(/const nav = \[(.*?)\] as const;/s)?.[1] ?? "";
  const labels = [...navBlock.matchAll(/\["([^"]+)",\s*[A-Za-z0-9_]+\]/g)].map((match) => match[1]);
  assert.ok(labels.length >= 19, "the complete CRM menu should be covered");
  for (const label of labels) {
    assert.match(source, new RegExp(`section === ["']${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`), `${label} has no rendered section`);
  }
});

test("every live CRM data request has a server route", async () => {
  const source = await readFile(crmPath, "utf8");
  const apiPaths = [...new Set([...source.matchAll(/fetch\(["'`]\/api\/([a-z-]+)/g)].map((match) => match[1]))];
  assert.ok(apiPaths.length >= 10, "expected the live CRM data routes");
  await Promise.all(apiPaths.map((apiPath) => access(path.join(root, "app", "api", apiPath, "route.ts"))));
});

test("Grupo PICA summaries reconcile their independent control universes", () => {
  for (const [view, summary] of Object.entries(grupoPicaSummary)) {
    assert.equal(summary.finished + summary.active, summary.created, `${view}: created cohort does not reconcile`);
    assert.equal(summary.aforos.automatic + summary.aforos.physical + summary.aforos.documentary + summary.aforos.multiple + summary.aforos.missing, summary.aforos.total, `${view}: aforos do not reconcile`);
    assert.equal(summary.aforos.total, summary.refrendados, `${view}: refrendados do not reconcile`);
    assert.ok(summary.itemRows > summary.created, `${view}: item rows remain distinct from unique procedures`);
  }
});

test("bundled executive source files are present and nonempty", async () => {
  const files = [
    "public/documents/arancel-ecuador-comex-002-2023-reformado-2026-05-26.pdf",
    "public/reports/Dashboard_Grupo_PICA_MACOBSA_2026-09-25_CONFIDENCIAL.pdf",
    "public/reports/Estructura_Cuenta_PYCCA_FOMEX.pptx",
  ];
  for (const file of files) {
    const metadata = await stat(path.join(root, file));
    assert.ok(metadata.size > 5_000, `${file} is empty or incomplete`);
  }
});
