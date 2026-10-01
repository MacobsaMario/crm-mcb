export type BillingAnalysis = {
  daiAccumulatedCents: number;
  regulatoryAccumulatedCents: number;
  extrasAccumulatedCents: number;
  invoicedTodayCents: number;
  invoicesToday: number;
  readyToInvoice: number | null;
  completedPending: number | null;
  blocked: number | null;
  note: string;
};

function moneyToCents(value: string) {
  const cleaned = value.replace(/USD|\$|\s/gi, "").replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && /,/.test(cleaned)) normalized = cleaned.replace(/,/g, "");
  else if (/^\d{1,3}(?:\.\d{3})+\.\d{2}$/.test(cleaned)) normalized = cleaned.replace(/\.(?=.*\.)/g, "");
  else if (lastDot > -1 && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function lineAfter(text: string, label: RegExp) {
  return text.split(/\r?\n/).find((line) => label.test(line)) ?? "";
}

function monetaryValues(line: string) {
  return [...line.matchAll(/(?:USD|\$)?\s*\d[\d.,]*/gi)]
    .map((match) => moneyToCents(match[0]))
    .filter((value): value is number => value !== null);
}

function accumulated(text: string, label: RegExp) {
  const values = monetaryValues(lineAfter(text, label));
  return values.length ? values[values.length - 1] : null;
}

function countAfter(text: string, label: RegExp) {
  const line = lineAfter(text, label);
  const labelMatch = line.match(label);
  const afterLabel = labelMatch?.index === undefined
    ? ""
    : line.slice(labelMatch.index + labelMatch[0].length);
  const firstValue = afterLabel.match(/^\s*(\d+)\b/);
  return firstValue ? Number(firstValue[1]) : null;
}

export function parseBillingReport(text: string): BillingAnalysis | null {
  const normalized = text.replace(/\u00a0/g, " ");
  const dai = accumulated(normalized, /Clientes normales\s*\/\s*DAI|DAI acumulado/i);
  const regulatory = accumulated(normalized, /Servicios especiales\s*\/\s*Regulatorio|Regulatorio acumulado/i);
  const extras = accumulated(normalized, /Servicios adicionales|Extras acumulado/i);
  const todayLine = lineAfter(normalized, /USD facturado hoy|Facturaci[oó]n del d[ií]a/i);
  const todayLabel = todayLine.match(/USD facturado hoy|Facturaci[oó]n del d[ií]a/i);
  const todayToken = todayLabel ? todayLine.slice((todayLabel.index ?? 0) + todayLabel[0].length).match(/^\s*(?:USD|\$)?\s*\d[\d.,]*/i)?.[0] : null;
  const today = todayToken ? moneyToCents(todayToken) : null;
  const invoices = countAfter(normalized, /Tr[aá]mites facturados hoy/i);
  if (dai === null || regulatory === null || extras === null || today === null || invoices === null) return null;
  return {
    daiAccumulatedCents: dai,
    regulatoryAccumulatedCents: regulatory,
    extrasAccumulatedCents: extras,
    invoicedTodayCents: today,
    invoicesToday: invoices,
    readyToInvoice: countAfter(normalized, /Tr[aá]mites listos ECUASIGAD/i),
    completedPending: countAfter(normalized, /Tr[aá]mites culminados por remitir/i),
    blocked: countAfter(normalized, /Tr[aá]mites bloqueados \(sin poder facturar\)/i),
    note: "Cifras extraídas automáticamente del informe diario de Facturación.",
  };
}

export function billingReconciliationError(text: string, analysis: BillingAnalysis): string | null {
  const normalized = text.replace(/\u00a0/g, " ");
  const combined = monetaryValues(lineAfter(normalized, /TOTAL COMBINADO/i));
  const declaredTotal = combined.length ? combined[combined.length - 1] : null;
  const calculatedTotal = analysis.daiAccumulatedCents + analysis.regulatoryAccumulatedCents + analysis.extrasAccumulatedCents;
  if (declaredTotal !== null && Math.abs(declaredTotal - calculatedTotal) > 1) {
    return "El total combinado no coincide con la suma de DAI, Regulatorio y Servicios adicionales. Corrija el PDF antes de cargarlo.";
  }
  const accumulatedLine = lineAfter(normalized, /USD facturado acumulado mes/i);
  const accumulatedLabel = accumulatedLine.match(/USD facturado acumulado mes/i);
  const values = accumulatedLabel ? monetaryValues(accumulatedLine.slice((accumulatedLabel.index ?? 0) + accumulatedLabel[0].length)) : [];
  if (values.length >= 2 && Math.abs(values[0] - values[1] - analysis.invoicedTodayCents) > 1) {
    const difference = (values[0] - values[1] - analysis.invoicedTodayCents) / 100;
    return `El acumulado de hoy menos el de ayer no coincide con lo facturado hoy; diferencia USD ${difference.toFixed(2)}. Corrija o concilie las cifras en el PDF.`;
  }
  return null;
}
