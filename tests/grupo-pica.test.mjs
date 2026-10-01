import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { grupoPicaOperations, grupoPicaSummary } from "../app/grupo-pica-data.ts";

const appSource = await readFile(new URL("../app/crm-app.tsx", import.meta.url), "utf8");
const dashboardSource = await readFile(new URL("../app/grupo-pica-dashboard.tsx", import.meta.url), "utf8");
const catalogSource = await readFile(new URL("../app/grupo-pica-catalog.tsx", import.meta.url), "utf8");
const catalogApiSource = await readFile(new URL("../app/api/grupo-pica/catalog/route.ts", import.meta.url), "utf8");
const catalogData = JSON.parse(await readFile(new URL("../app/data/grupo-pica-subpartidas.json", import.meta.url), "utf8"));
const dataSource = await readFile(new URL("../app/grupo-pica-data.ts", import.meta.url), "utf8");
const reportSource = await readFile(new URL("../app/grupo-pica-report.ts", import.meta.url), "utf8");
const pdfPath = new URL("../public/reports/Dashboard_Grupo_PICA_MACOBSA_2026-09-25_CONFIDENCIAL.pdf", import.meta.url);

test("adds Grupo PICA to the existing CRM navigation and section", () => {
  assert.match(appSource, /\["GRUPO PICA", Building2\]/);
  assert.match(appSource, /section === "GRUPO PICA"/);
  assert.match(appSource, /<GrupoPicaDashboard onOpenLegal=/);
  assert.match(appSource, /LEGAL \/ NORMATIVO IA/);
});

test("adds the PICA/PYCCA tariff catalog and future Data Entry preparation", () => {
  assert.match(dashboardSource, /Subpartidas \/ Data Entry/);
  assert.match(catalogSource, /Preparación Data Entry/);
  assert.match(catalogSource, /DESCARGAR FUENTE/);
  assert.match(catalogApiSource, /isAuthorizedCRMUser/);
  assert.equal(catalogData.metadata.products, 5275);
  assert.equal(catalogData.metadata.uniqueSubheadings, 293);
  assert.equal(catalogData.metadata.duplicateAliasesConsolidated, 50);
  assert.equal(catalogData.rows.reduce((total, row) => total + row.observedItems, 0), 10858);
  assert.ok(catalogData.rows.every((row) => /^\d{10}$/.test(row.subheading)));
  assert.ok(catalogData.rows.every((row) => /^\d{10}$/.test(row.currentSubheading)));
});

test("uses a clear user-facing name for the PYCCA assigned team", () => {
  assert.match(dashboardSource, /Equipo asignado PYCCA/);
  assert.match(dashboardSource, /EQUIPO ASIGNADO · GRUPO PICA/);
  assert.doesNotMatch(dashboardSource, /> Estructura FOMEX/);
  assert.doesNotMatch(dashboardSource, /MODELO OPERATIVO FOMEX/);
});

test("publishes the validated 2026 Grupo PICA control totals", () => {
  assert.match(dataSource, /"Consolidado":\{"created":460,"refrendados":460,"finished":378,"active":82,"closureRate":82\.2/);
  assert.match(dataSource, /"PICA Plásticos":\{"created":312,"refrendados":312,"finished":231,"active":81/);
  assert.match(dataSource, /"PYCCA":\{"created":148,"refrendados":148,"finished":147,"active":1/);
  assert.match(dataSource, /"itemRows":10858/);
  assert.match(dataSource, /"aforos":\{"automatic":435,"physical":14,"documentary":11,"multiple":0,"missing":0,"total":460\}/);
});

test("reconciles the created-operation cohort and rejects impossible dates", () => {
  for (const view of ["PICA Plásticos", "PYCCA"]) {
    const operations = grupoPicaOperations.filter((operation) => operation.society === view);
    const summary = grupoPicaSummary[view];
    assert.equal(operations.length, summary.created);
    assert.equal(operations.filter((operation) => operation.generalState === "Trámite finalizado").length, summary.finished);
    assert.equal(operations.filter((operation) => operation.generalState === "Trámite activo").length, summary.active);
    assert.equal(summary.finished + summary.active, summary.created);
  }

  const parseDate = (value) => value ? new Date(`${value}T00:00:00Z`) : null;
  for (const operation of grupoPicaOperations) {
    for (const field of ["creationDate", "arrivalDate", "refrendoDate", "finishedDate", "exitDate"]) {
      if (operation[field]) assert.match(operation[field], /^202[56]-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/);
    }
    const created = parseDate(operation.creationDate);
    const arrived = parseDate(operation.arrivalDate);
    const refrendado = parseDate(operation.refrendoDate);
    const finished = parseDate(operation.finishedDate);
    if (created && refrendado) assert.ok(refrendado >= created, `${operation.tramite}: refrendo anterior a creación`);
    if (refrendado && finished) assert.ok(finished >= refrendado, `${operation.tramite}: finalización anterior a refrendo`);
    if (arrived && finished) assert.ok(finished >= arrived, `${operation.tramite}: llegada posterior a finalización`);
  }
});

test("provides download and native share actions for the confidential PDF", async () => {
  assert.match(dashboardSource, /DESCARGAR PDF/);
  assert.match(dashboardSource, /COMPARTIR INFORME/);
  assert.match(dashboardSource, /navigator\.share/);
  assert.match(dashboardSource, /signature !== "%PDF-"/);
  assert.doesNotMatch(dashboardSource, /anchor\.download = REPORT_NAME/);
  const embedded = reportSource.match(/PICA_REPORT_BASE64 = "([A-Za-z0-9+/=]+)"/)?.[1];
  assert.ok(embedded, "the report must be embedded for authenticated iPhone delivery");
  const embeddedPdf = Buffer.from(embedded, "base64");
  assert.equal(embeddedPdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(embeddedPdf.byteLength > 1500, "the embedded PDF should not be empty");
  const packagedPdf = await readFile(pdfPath);
  assert.deepEqual(embeddedPdf, packagedPdf, "the iPhone delivery copy must match the packaged PDF");
  const pdf = await stat(pdfPath);
  assert.ok(pdf.size > 1500, "the packaged PDF should not be empty");
});
