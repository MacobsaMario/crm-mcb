export type RegulatoryAnalysis = {
  billedTodayCents: number;
  billedAccumulatedCents: number;
  monthlyGoalCents: number;
  createdUnbilledTodayCents: number;
  createdUnbilledAccumulatedCents: number;
  licensesToday: number;
  licensesAccumulated: number;
  calculatedProgressBasisPoints: number;
  declaredProgressBasisPoints: number | null;
  prospectsDeclared: boolean;
  warnings: string[];
};

export function decodeWordDocumentXml(xml: string) {
  return xml
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .trim();
}

function compact(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function numberValue(raw: string) {
  const value = raw.replace(/[^0-9.,-]/g, "");
  if (!value) return Number.NaN;
  if (value.includes(",") && value.includes(".")) {
    const decimal = value.lastIndexOf(",") > value.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    return Number(value.replace(thousands, "").replace(decimal, "."));
  }
  const separator = value.includes(",") ? "," : value.includes(".") ? "." : "";
  if (!separator) return Number(value);
  const [whole, fraction = ""] = value.split(separator);
  return fraction.length === 3 ? Number(`${whole}${fraction}`) : Number(`${whole}.${fraction}`);
}

function moneyCents(raw: string) {
  return Math.round(numberValue(raw) * 100);
}

function percentBasisPoints(raw: string) {
  return Math.round(numberValue(raw) * 100);
}

function hasProspectRows(text: string) {
  const marker = text.search(/Nuevos clientes y prospectos regulatorios/i);
  if (marker < 0) return false;
  const remainder = text
    .slice(marker)
    .replace(/Nuevos clientes y prospectos regulatorios(?:\s*\(sin cambio\))?/gi, "")
    .replace(/Cliente\s*\/\s*Prospecto|Servicio|Potencial USD|Estado|Pr[oó]ximo paso/gi, "")
    .replace(/Fin del informe[^\n]*/gi, "")
    .replace(/P[aá]gina\s+\d+\s+de\s+\d+/gi, "")
    .replace(/[_—\-|\d\s.,:/]+/g, "")
    .trim();
  return remainder.length >= 3;
}

export function parseRegulatoryReport(input: string): RegulatoryAnalysis | null {
  const text = compact(input);
  const billed = text.match(
    /USD tr[aá]mites facturados[^\d]*([\d.,]+)\s+([\d.,]+)\s+USD\s*([\d.,]+)(?:\s+([\d.,]+)\s*%)?/i,
  );
  const unbilled = text.match(
    /USD tr[aá]mites creados sin facturar[^\d]*([\d.,]+)\s+([\d.,]+)\s+USD\s*([\d.,]+)/i,
  );
  const licenses = text.match(
    /Licencias\s*\/\s*tr[aá]mites gestionados[^\d]*([\d.,]+)\s+([\d.,]+)/i,
  );
  if (!billed || !unbilled || !licenses) return null;

  const billedTodayCents = moneyCents(billed[1]);
  const billedAccumulatedCents = moneyCents(billed[2]);
  const monthlyGoalCents = moneyCents(billed[3]);
  const createdUnbilledTodayCents = moneyCents(unbilled[1]);
  const createdUnbilledAccumulatedCents = moneyCents(unbilled[2]);
  const licensesToday = Math.round(numberValue(licenses[1]));
  const licensesAccumulated = Math.round(numberValue(licenses[2]));
  const declaredProgressBasisPoints = billed[4] ? percentBasisPoints(billed[4]) : null;
  const calculatedProgressBasisPoints = monthlyGoalCents > 0
    ? Math.round((billedAccumulatedCents / monthlyGoalCents) * 10000)
    : 0;
  const prospectsDeclared = hasProspectRows(text);
  const warnings: string[] = [];
  if (monthlyGoalCents !== 3_000_000) warnings.push("La meta Regulatorio debe ser USD 30.000.");
  if (
    declaredProgressBasisPoints !== null &&
    Math.abs(declaredProgressBasisPoints - calculatedProgressBasisPoints) > 1
  ) warnings.push("El avance declarado no coincide con acumulado dividido para la meta.");
  if (!prospectsDeclared) warnings.push("No se detallaron prospectos regulatorios ni su próxima acción.");

  const values = [
    billedTodayCents,
    billedAccumulatedCents,
    monthlyGoalCents,
    createdUnbilledTodayCents,
    createdUnbilledAccumulatedCents,
    licensesToday,
    licensesAccumulated,
  ];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  return {
    billedTodayCents,
    billedAccumulatedCents,
    monthlyGoalCents,
    createdUnbilledTodayCents,
    createdUnbilledAccumulatedCents,
    licensesToday,
    licensesAccumulated,
    calculatedProgressBasisPoints,
    declaredProgressBasisPoints,
    prospectsDeclared,
    warnings,
  };
}
