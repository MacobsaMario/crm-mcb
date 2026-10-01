export type DispatchAnalysis = {
  referencesLive: number;
  highRisk: number;
  readyToInvoice: number;
  completedPending: number;
  complianceBasisPoints: number | null;
  groupWongPending: number | null;
  ecuasigadStatus: string;
  nextAction: string;
  note: string;
  completeness: number;
};

function currentValue(text: string, label: RegExp) {
  const match = text.match(new RegExp(`${label.source}[^\\d]{0,80}(\\d{1,5})`, "i"));
  return match ? Number(match[1]) : null;
}

export function parseDispatchReport(source: string): DispatchAnalysis | null {
  const text = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u00a0/g, " ");
  if (!/REPORTE DIARIO\s*-\s*DESPACHO Y AGENCIA DE ADUANA/i.test(text)) return null;
  const referencesLive = currentValue(text, /Referencias vivas \(inventario activo\)/i);
  const highRisk = currentValue(text, /Refs sin ETA ni refrendo \(riesgo alto\)/i);
  const readyToInvoice = currentValue(text, /Tramites listos ECUASIGAD\s*-\s*facturar HOY/i);
  const completedPending = currentValue(text, /Tramites culminados por remitir/i);
  if ([referencesLive, highRisk, readyToInvoice, completedPending].some((value) => value === null)) return null;
  const compliance = text.match(/(?:cumplimiento|indicador general)[^\d%]{0,100}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i);
  const wong = text.match(/Grupo Wong[^\n]{0,100}?(?:pendientes?|sin facturar)[^\d\n]{0,30}(\d{1,5})/i)
    ?? text.match(/(\d{1,5})[^\n]{0,30}(?:pendientes?|sin facturar)[^\n]{0,60}Grupo Wong/i);
  const actionSection = text.match(/(?:PROXIMAS ACCIONES|PENDIENTES\s*\/\s*PROXIMAS 24H)([\s\S]{0,1200})/i)?.[1]?.trim();
  const ecuasigadStatus = /acceso (?:fue )?restablecido/i.test(text)
    ? "Acceso restablecido"
    : /sin respuesta[^\n]{0,40}ECUASIGAD|ECUASIGAD[^\n]{0,40}sin respuesta/i.test(text)
      ? "Sin respuesta de ECUASIGAD"
      : "Sin novedad crítica reportada";
  const completeness = 4 + (compliance ? 1 : 0) + (wong ? 1 : 0);
  return {
    referencesLive: referencesLive as number,
    highRisk: highRisk as number,
    readyToInvoice: readyToInvoice as number,
    completedPending: completedPending as number,
    complianceBasisPoints: compliance ? Math.round(Number(compliance[1].replace(",", ".")) * 100) : null,
    groupWongPending: wong ? Number(wong[1]) : null,
    ecuasigadStatus,
    nextAction: actionSection?.slice(0, 1200) || "Dar seguimiento a riesgos, trámites por facturar y observaciones aduaneras del corte.",
    note: `Procesado automáticamente. ${completedPending} trámites culminados pendientes de remitir.`,
    completeness,
  };
}
