export type InhouseReportAnalysis = {
  davPending: number;
  urgentDav: number;
  readyForPickup: number;
  checklistPending: number;
  storageAlerts: number;
  nextAction: string;
  note: string;
  completeness: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ");
}

function countAfter(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\d]{0,45}(\\d{1,5})`, "i");
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function textAfter(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\n:]*[:\\-]?\\s*([^\\n]{8,240})`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function countBefore(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`(\\d{1,5})\\s+(?:tramites?|referencias?)[^\\n]{0,120}${label}`, "i");
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function complianceOutsideTarget(text: string, label: string) {
  const match = text.match(new RegExp(`${label}[\\s\\S]{0,120}?(\\d{1,5})\\s+cumple\\s+(\\d{1,5})\\s+fuera de meta`, "i"));
  return match ? Number(match[2]) : null;
}

export function parseInhouseReport(rawText: string): InhouseReportAnalysis | null {
  const text = normalize(rawText);
  if (text.trim().length < 80) return null;

  const controlDashboard = /Control Grupo El Rosado[\s\S]{0,120}Nacionalizacion/i.test(text);
  if (controlDashboard) {
    const davPending = complianceOutsideTarget(text, "Envio DAV");
    const checklistPending = complianceOutsideTarget(text, "Checklist");
    const readyForPickup = countBefore(text, ["tienen salida autorizada[^\\n]{0,80}siguen sin retirarse"]);
    const urgentDav = countBefore(text, ["arribaron[^\\n]{0,80}sin salida autorizada"]);
    const explicitStorageAlerts = countBefore(text, ["(?:alertas?|riesgos?)[^\\n]{0,30}(?:bodegaje|almacenaje|sobreestadia)"]);
    const storageAlerts = explicitStorageAlerts ?? 0;
    const values = { davPending, urgentDav, readyForPickup, checklistPending, storageAlerts };
    const found = Object.values(values).filter((value) => value !== null).length;
    return {
      davPending: davPending ?? 0,
      urgentDav: urgentDav ?? 0,
      readyForPickup: readyForPickup ?? 0,
      checklistPending: checklistPending ?? 0,
      storageAlerts: storageAlerts ?? 0,
      nextAction: "Priorizar trámites fuera de meta, salidas autorizadas sin retiro y alertas de almacenaje.",
      note: found === 5
        ? `Procesado automáticamente desde el panel de control de Corporación El Rosado.${explicitStorageAlerts === null ? " El documento no declara alertas de almacenaje; se registra 0 con trazabilidad de la fuente." : ""}`
        : `Procesamiento automático parcial. ${5 - found} indicador(es) no fueron identificados en el informe.`,
      completeness: found,
    };
  }

  const values = {
    davPending: countAfter(text, ["DAV pendientes?", "pendientes? de DAV", "DAV por aprobar"]),
    urgentDav: countAfter(text, ["DAV urgentes?", "urgentes? de DAV", "DAV criticos?"]),
    readyForPickup: countAfter(text, ["listos? para retiro", "retiros? pendientes?", "salidas? autorizadas?.{0,20}sin retirar"]),
    checklistPending: countAfter(text, ["checklist pendientes?", "pendientes? de checklist", "checklist sin completar"]),
    storageAlerts: countAfter(text, ["alertas? de deposito", "alertas? de bodegaje", "riesgo de sobreestadia", "sobreestadia"]),
  };
  const found = Object.values(values).filter((value) => value !== null).length;
  if (found === 0) return null;

  const nextAction = textAfter(text, ["proxima accion", "acciones? inmediatas?", "pendientes? / proximas? 24h"])
    || "Dar seguimiento a las alertas identificadas en el informe.";
  const missing = Object.entries(values).filter(([, value]) => value === null).map(([key]) => key);
  return {
    davPending: values.davPending ?? 0,
    urgentDav: values.urgentDav ?? 0,
    readyForPickup: values.readyForPickup ?? 0,
    checklistPending: values.checklistPending ?? 0,
    storageAlerts: values.storageAlerts ?? 0,
    nextAction,
    note: missing.length ? `Procesamiento automático parcial. Campos no identificados: ${missing.join(", ")}.` : "Procesado automáticamente desde el informe cargado.",
    completeness: found,
  };
}
