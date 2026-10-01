export type CommercialAnalysis = {
  billedTodayCents: number;
  billedAccumulatedCents: number;
  monthlyGoalCents: number;
  ordersToday: number;
  ordersAccumulated: number;
  ordersGoal: number;
  newClientsToday: number;
  newClientsAccumulated: number;
  activeTenders: number;
  wonTenders: number;
  calculatedProgressBasisPoints: number;
};

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

function metric(text: string, label: RegExp, values: number) {
  const line = text.split(/\r?\n/).find((entry) => label.test(entry));
  if (line) {
    const result = [...line.matchAll(/(?:USD|\$)?\s*[0-9][0-9.,]*/gi)].map((match) => numberValue(match[0]));
    if (result.length >= values) return result.slice(-values);
  }
  const match = text.match(new RegExp(`${label.source}[\\s\\S]{0,120}?((?:USD|\\$)?\\s*[0-9][0-9.,]*)[\\s\\n]+((?:USD|\\$)?\\s*[0-9][0-9.,]*)${values === 3 ? "[\\s\\n]+((?:USD|\\$)?\\s*[0-9][0-9.,]*)" : ""}`, "i"));
  return match ? match.slice(1, values + 1).map(numberValue) : [];
}

export function parseCommercialReport(source: string): CommercialAnalysis | null {
  const text = source.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
  if (!/TABLERO EJECUTIVO[\s\S]{0,120}GERENCIA COMERCIAL/i.test(text)) return null;
  const billing = metric(text, /Facturaci[oó]n Comercial \(USD\)/i, 3);
  const orders = metric(text, /Pedidos\s*\/\s*Despachos \(DAI\)/i, 3);
  const clients = metric(text, /Nuevos Clientes Captados/i, 2);
  const active = metric(text, /Licitaciones Activas/i, 2);
  const won = metric(text, /Licitaciones Ganadas\s*\/\s*Cerradas/i, 2);
  if ([billing, orders, clients, active, won].some((values) => values.length === 0)) return null;
  const result = {
    billedTodayCents: Math.round(billing[0] * 100),
    billedAccumulatedCents: Math.round(billing[1] * 100),
    monthlyGoalCents: Math.round(billing[2] * 100),
    ordersToday: Math.round(orders[0]),
    ordersAccumulated: Math.round(orders[1]),
    ordersGoal: Math.round(orders[2]),
    newClientsToday: Math.round(clients[0]),
    newClientsAccumulated: Math.round(clients[1]),
    activeTenders: Math.round(active[1]),
    wonTenders: Math.round(won[1]),
    calculatedProgressBasisPoints: billing[2] > 0 ? Math.round((billing[1] / billing[2]) * 10000) : 0,
  };
  return Object.values(result).every((value) => Number.isFinite(value) && value >= 0) ? result : null;
}
