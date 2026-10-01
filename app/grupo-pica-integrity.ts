import { grupoPicaOperations, grupoPicaSummary, type GrupoPicaView, type PicaOperation } from "./grupo-pica-data.ts";

export const GRUPO_PICA_CUTOFF_ISO = "2026-09-25";

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function rowsFor(view: GrupoPicaView, operations: PicaOperation[]) {
  return view === "Consolidado" ? operations : operations.filter((row) => row.society === view);
}

export type PicaIntegrityResult = { ok: boolean; checkedRows: number; checksPassed: number; issues: string[]; warnings: string[] };

export function validateGrupoPicaData(
  operations = grupoPicaOperations,
  summaries = grupoPicaSummary,
  cutoff = GRUPO_PICA_CUTOFF_ISO,
): PicaIntegrityResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let checksPassed = 0;
  const check = (condition: boolean, message: string) => {
    if (condition) checksPassed += 1;
    else issues.push(message);
  };

  const ids = operations.map((row) => `${row.society}:${row.tramite}`);
  check(new Set(ids).size === ids.length, "Existen trámites duplicados dentro de una misma sociedad.");

  for (const view of ["Consolidado", "PICA Plásticos", "PYCCA"] as GrupoPicaView[]) {
    const rows = rowsFor(view, operations);
    const summary = summaries[view];
    const finalized = rows.filter((row) => row.generalState.toLocaleLowerCase("es").includes("finalizado")).length;
    const active = rows.length - finalized;
    const aforoTotal = summary.aforos.automatic + summary.aforos.physical + summary.aforos.documentary + summary.aforos.multiple + summary.aforos.missing;
    check(rows.length === summary.created, `${view}: el universo creado no coincide con las filas operativas.`);
    check(finalized === summary.finished, `${view}: los finalizados no coinciden con el resumen.`);
    check(active === summary.active, `${view}: los activos no coinciden con el resumen.`);
    check(summary.finished + summary.active === summary.created, `${view}: finalizados + activos no reconcilia con creados.`);
    check(rows.reduce((total, row) => total + row.itemCount, 0) === summary.itemRows, `${view}: los renglones de ítems no reconcilian.`);
    check(aforoTotal === summary.aforos.total, `${view}: los canales de aforo no reconcilian.`);
  }

  check(summaries["PICA Plásticos"].created + summaries.PYCCA.created === summaries.Consolidado.created, "PICA + PYCCA no reconcilia con el consolidado creado.");
  check(summaries["PICA Plásticos"].finished + summaries.PYCCA.finished === summaries.Consolidado.finished, "PICA + PYCCA no reconcilia con el consolidado finalizado.");
  check(summaries["PICA Plásticos"].active + summaries.PYCCA.active === summaries.Consolidado.active, "PICA + PYCCA no reconcilia con el consolidado activo.");

  for (const row of operations) {
    for (const [field, value] of Object.entries({ creación: row.creationDate, llegada: row.arrivalDate, refrendo: row.refrendoDate, finalización: row.finishedDate, salida: row.exitDate })) {
      if (value && !isCalendarDate(value)) issues.push(`${row.tramite}: fecha de ${field} inválida (${value}).`);
    }
    for (const [field, value] of Object.entries({ creación: row.creationDate, refrendo: row.refrendoDate, finalización: row.finishedDate, salida: row.exitDate })) {
      if (value && value > cutoff) issues.push(`${row.tramite}: ${field} posterior al corte oficial.`);
    }
    if (row.refrendoDate && row.finishedDate && row.finishedDate < row.refrendoDate) issues.push(`${row.tramite}: la finalización antecede al refrendo.`);
  }

  const dateWarnings = operations.filter((row) => row.dateConflicts.length).map((row) => `${row.tramite}: campos repetidos en conflicto (${row.dateConflicts.join(", ")}).`);
  warnings.push(...dateWarnings);
  return { ok: issues.length === 0, checkedRows: operations.length, checksPassed, issues, warnings };
}
