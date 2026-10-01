import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "app", "tariff-classification.tsx");
const menuPath = path.join(root, "app", "crm-app.tsx");
const pdfPath = path.join(root, "public", "documents", "arancel-ecuador-comex-002-2023-reformado-2026-05-26.pdf");

test("the tariff source is bundled and exposed as a searchable documentary library", async () => {
  const [component, menu, pdf, pdfBytes] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(menuPath, "utf8"),
    stat(pdfPath),
    readFile(pdfPath),
  ]);

  assert.ok(pdf.size > 500_000, "the complete source PDF should be present");
  assert.match(component, /Biblioteca arancelaria/);
  assert.match(component, /21 secciones · 98 capítulos/);
  assert.equal(createHash("sha256").update(pdfBytes).digest("hex"), "b3a931f584163c3f0cb1b46d3dce00c2c1620ee149a924cdfae271814d281b49");
  assert.match(component, /Última reforma declarada: 26-may-2026/);
  assert.match(component, /Archivo original íntegro · 143 páginas/);
  assert.match(component, /estado declarado en el documento/);
  assert.match(component, /Control de vigencia normativa/);
  assert.match(component, /ninguna subpartida, tributo, restricción o permiso queda aprobado/i);
  assert.match(component, /download/);
  assert.match(menu, /\["Arancel y clasificación", BrainCircuit\]/);
  assert.match(menu, /section === "Arancel y clasificación"/);
});
