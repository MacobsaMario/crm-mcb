export type FinancialAnalysis = {
  format?: "cash_control";
  accountingPortfolioCents: number;
  effectiveCollectionsCents: number;
  newBillingCents: number;
  confirmedPendingCents: number;
  overduePendingCents: number;
  projectedPortfolioCents: number;
  basePortfolioCents: number | null;
  additionalPotentialCents: number | null;
  reportDateLabel: string;
  warnings: string[];
};

function amountAfter(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const matches = [...text.matchAll(new RegExp(`${label}([\\s\\S]{0,90}?)\\(?\\s*\\$\\s*([0-9][0-9.,]*)\\)?`, "gi"))]
      .sort((a, b) => a[1].length - b[1].length);
    const match = matches[0];
    if (!match) continue;
    const raw = match[2];
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    let normalized = raw;
    if (lastComma > -1 && lastDot > -1) {
      const decimal = lastComma > lastDot ? "," : ".";
      const thousands = decimal === "," ? /\./g : /,/g;
      normalized = raw.replace(thousands, "").replace(decimal, ".");
    } else if (lastComma > -1) {
      const fraction = raw.length - lastComma - 1;
      normalized = fraction === 2 ? raw.replace(",", ".") : raw.replace(/,/g, "");
    } else if (lastDot > -1) {
      const fraction = raw.length - lastDot - 1;
      normalized = fraction === 2 ? raw : raw.replace(/\./g, "");
    }
    const value = Number(normalized);
    if (Number.isFinite(value)) return Math.round(value * 100);
  }
  return null;
}

export function parseFinancialReport(source: string): FinancialAnalysis | null {
  const text = source.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
  if (!/INFORME GERENCIAL DE CARTERA|Reporte ejecutivo de cuentas por cobrar|REPORTE DIARIO[\s\S]{0,80}Cuentas por cobrar|CONTROL DIARIO GERENCIAL/i.test(text)) return null;

  if (/CONTROL DIARIO GERENCIAL/i.test(text)) {
    const registeredIncome = amountAfter(text, ["Ingresos registrados(?:\\s*[0-9/]+)?"]);
    const bankAvailability = amountAfter(text, ["Disponibilidad bancaria total"]);
    const confirmedPending = amountAfter(text, ["Cobros confirmados pendientes de ingresar"]);
    const identifiedTotal = amountAfter(text, ["Ingresos registrados \\+ cobros confirmados"]);
    if (registeredIncome !== null && bankAvailability !== null && confirmedPending !== null && identifiedTotal !== null) {
      const warnings: string[] = [];
      if (Math.abs(registeredIncome + confirmedPending - identifiedTotal) > 2) {
        warnings.push("Los ingresos registrados y los cobros confirmados no concilian con el total identificado.");
      }
      return {
        format: "cash_control",
        accountingPortfolioCents: bankAvailability,
        effectiveCollectionsCents: registeredIncome,
        newBillingCents: 0,
        confirmedPendingCents: confirmedPending,
        overduePendingCents: 0,
        projectedPortfolioCents: identifiedTotal,
        basePortfolioCents: null,
        additionalPotentialCents: null,
        reportDateLabel: text.match(/CONTROL DIARIO GERENCIAL\s*-\s*([^\n\r]+)/i)?.[1]?.trim() ?? "",
        warnings,
      };
    }
  }

  const dailyPortfolio = amountAfter(text, ["CARTERA TOTAL AL CORTE", "Cartera total informada"]);
  const weeklyCollections = amountAfter(text, ["INGRESOS DE LA SEMANA", "TOTAL SEMANAL"]);
  const pendingToPost = amountAfter(text, ["PENDIENTE DE INGRESAR"]);
  if (/REPORTE DIARIO[\s\S]{0,80}Cuentas por cobrar/i.test(text) && dailyPortfolio !== null && weeklyCollections !== null && pendingToPost !== null) {
    const dateMatch = text.match(/Corte al ([0-9]{1,2}\s+de\s+[a-záéíóú]+\s+de\s+[0-9]{4})/i);
    return {
      accountingPortfolioCents: dailyPortfolio,
      effectiveCollectionsCents: weeklyCollections,
      newBillingCents: 0,
      confirmedPendingCents: pendingToPost,
      overduePendingCents: 0,
      projectedPortfolioCents: Math.max(0, dailyPortfolio - pendingToPost),
      basePortfolioCents: dailyPortfolio,
      additionalPotentialCents: null,
      reportDateLabel: dateMatch?.[1] ?? "",
      warnings: [
        "El formato diario no separa nueva facturación; se conserva como no informada (USD 0).",
        "La cartera proyectada se deriva de cartera total menos valores pendientes de ingresar.",
      ],
    };
  }

  if (/Cartera contable actualizada/i.test(text)) {
    const accounting = amountAfter(text, ["Cartera contable actualizada"]);
    const collections = amountAfter(text, ["Ingresos efectivos\\s*[0-9/–-]+"]);
    const billing = amountAfter(text, ["Nueva facturaci[oó]n incorporada\\s*[0-9/–-]+", "se incorpora nueva facturaci[oó]n por"]);
    const pending = amountAfter(text, ["Cobros confirmados pendientes\\s*[0-9/–-]+", "cobros confirmados pendientes de ingresar"]);
    const projected = amountAfter(text, ["Cartera proyectada posterior"]);
    if (accounting !== null && collections !== null && billing !== null && pending !== null && projected !== null) {
      const overdue = accounting - pending - projected;
      if (overdue >= 0 && overdue <= 2) return {
        accountingPortfolioCents: accounting,
        effectiveCollectionsCents: collections,
        newBillingCents: billing,
        confirmedPendingCents: pending,
        overduePendingCents: 0,
        projectedPortfolioCents: projected,
        basePortfolioCents: amountAfter(text, ["Cartera estimada al [^$\\n]+"]),
        additionalPotentialCents: amountAfter(text, ["Recuperaci[oó]n adicional potencial"]),
        reportDateLabel: text.match(/(?:Actualizaci[oó]n|Corte) (?:al )?([0-9]{1,2}(?:\s+de\s+[a-záéíóú]+\s+de\s+[0-9]{4}|\/[0-9]{2}\/2026))/i)?.[1] ?? "",
        warnings: [],
      };
    }
  }

  const accountingPortfolioCents = amountAfter(text, ["Saldo contable(?: al [^$\n]+)?", "Cartera contable actualizada", "Cartera contable (?:estimada |actualizada )?(?:al corte )?(?:asciende a|actualizada)?"]);
  const effectiveCollectionsCents = amountAfter(text, ["Menos:\\s*ingresos(?: del [^$\\n]+)?", "Ingresos efectivos(?: [0-9/–-]+)?", "recuperaci[oó]n efectiva"]);
  const newBillingCents = amountAfter(text, ["M[aá]s:\\s*facturaci[oó]n(?: del [^$\\n]+)?", "Nueva facturaci[oó]n(?: [0-9/–-]+)?", "se gener[oó] nueva facturaci[oó]n por"]);
  const confirmedPendingCents = amountAfter(text, ["Menos:\\s*cobros confirmados pendientes", "Cobros confirmados pendientes", "confirmados pendientes de (?:ingresar|acreditar)"]);
  const explicitOverduePendingCents = amountAfter(text, ["Vencidos por confirmar(?: [0-9/–-]+)?", "cartera vencida pendiente de confirmar(?: e ingresar)?"]);
  const projectedPortfolioCents = amountAfter(text, ["Cartera neta proyectada", "Cartera proyectada posterior", "cartera global te[oó]rica se reducir[ií]a a"]);
  const basePortfolioCents = amountAfter(text, ["Cuentas por cobrar al [^$\n]+", "Cartera al [0-9/]+", "cartera total de"]);
  const additionalPotentialCents = amountAfter(text, ["Recuperaci[oó]n adicional potencial"]);
  const dateMatch = text.match(/(?:Actualizaci[oó]n|Corte) (?:al )?([0-9]{1,2}(?:\s+de\s+[a-záéíóú]+\s+de\s+[0-9]{4}|\/[0-9]{2}\/[0-9]{4}))/i);

  const derivedOverdue = accountingPortfolioCents !== null && confirmedPendingCents !== null && projectedPortfolioCents !== null
    ? accountingPortfolioCents - confirmedPendingCents - projectedPortfolioCents
    : null;
  const overduePendingCents = explicitOverduePendingCents
    ?? (derivedOverdue !== null && derivedOverdue >= 0 && derivedOverdue <= 2 ? 0 : null);

  const core = [accountingPortfolioCents, effectiveCollectionsCents, newBillingCents, confirmedPendingCents, overduePendingCents, projectedPortfolioCents];
  if (core.some((value) => value === null)) return null;

  const warnings: string[] = [];
  const calculated = (accountingPortfolioCents as number) - (confirmedPendingCents as number) - (overduePendingCents as number);
  if (Math.abs(calculated - (projectedPortfolioCents as number)) > 2) {
    warnings.push("La cartera proyectada no concilia con cartera contable menos confirmados y vencidos por confirmar.");
  }
  if (basePortfolioCents === null) warnings.push("El informe no identifica claramente la cartera base.");

  return {
    accountingPortfolioCents: accountingPortfolioCents as number,
    effectiveCollectionsCents: effectiveCollectionsCents as number,
    newBillingCents: newBillingCents as number,
    confirmedPendingCents: confirmedPendingCents as number,
    overduePendingCents: overduePendingCents as number,
    projectedPortfolioCents: projectedPortfolioCents as number,
    basePortfolioCents,
    additionalPotentialCents,
    reportDateLabel: dateMatch?.[1] ?? "",
    warnings,
  };
}
