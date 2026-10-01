import { parseBillingReport } from "./billing-parser";
import { parseCommercialReport } from "./commercial-parser";
import { parseDispatchReport } from "./dispatch-parser";
import { parseFinancialReport } from "./financial-parser";
import { parseInhouseReport } from "./inhouse-parser";
import { parseRegulatoryReport } from "./regulatory-parser";

export const REPORT_PARSER_VERSION = "macobsa-v80-2026-09-25";

export type ProcessingDecision = {
  status: "processed" | "processed_documental" | "partial" | "failed";
  analysis: Record<string, unknown> | null;
  warnings: string[];
  nextAction: string;
};

export function processStoredReport(area: string, source: string): ProcessingDecision {
  const text = source.trim();
  if (!text) return {
    status: "failed",
    analysis: null,
    warnings: ["El informe no contiene texto extraído."],
    nextAction: "Revisar la evidencia original sin repetir la carga.",
  };

  if (area === "Regulatorio") {
    const analysis = parseRegulatoryReport(text);
    return analysis ? {
      status: "processed",
      analysis,
      warnings: analysis.warnings,
      nextAction: analysis.warnings.length
        ? "Revisar las alertas de Regulatorio y conciliar cualquier diferencia con Facturación."
        : "Mantener seguimiento a licencias, facturación y prospectos regulatorios.",
    } : failedStructured(area);
  }
  if (area === "Financiero") {
    const analysis = parseFinancialReport(text);
    return analysis ? {
      status: "processed",
      analysis,
      warnings: analysis.warnings,
      nextAction: analysis.warnings.length
        ? "Revisar las advertencias de cartera antes del siguiente corte."
        : "Mantener conciliados cartera, cobros y valores pendientes de ingresar.",
    } : failedStructured(area);
  }
  if (area === "Comercial") {
    const analysis = parseCommercialReport(text);
    return analysis ? {
      status: "processed",
      analysis,
      warnings: [],
      nextAction: "Conciliar facturación comercial y pedidos con el corte oficial de Facturación."
    } : failedStructured(area);
  }
  if (area === "Facturación") {
    const analysis = parseBillingReport(text);
    return analysis ? {
      status: "processed",
      analysis,
      warnings: [],
      nextAction: "Mantener conciliados DAI, Regulatorio, Extras y trámites por facturar."
    } : failedStructured(area);
  }
  if (area === "Despacho") {
    const analysis = parseDispatchReport(text);
    if (!analysis) return failedStructured(area);
    return {
      status: analysis.completeness === 6 ? "processed" : "partial",
      analysis,
      warnings: analysis.completeness === 6 ? [] : ["El informe no contiene todos los indicadores de cumplimiento y Grupo Wong."],
      nextAction: analysis.nextAction,
    };
  }
  if (area === "Inhouse El Rosado") {
    const analysis = parseInhouseReport(text);
    if (!analysis && /ORDEN\s+RAZON SOCIAL[\s\S]{0,160}ESTADO POR NACIONALIZAR/i.test(text)) return {
      status: "processed_documental",
      analysis: { characters: text.length, format: "control-operativo-tabular" },
      warnings: ["El control legacy se conserva como evidencia documental; no contiene un resumen KPI inequívoco."],
      nextAction: "Revisar las excepciones del control operativo sin repetir la carga.",
    };
    if (!analysis) return failedStructured(area);
    return {
      status: analysis.completeness === 5 ? "processed" : "partial",
      analysis,
      warnings: analysis.completeness === 5 ? [] : [analysis.note],
      nextAction: analysis.nextAction,
    };
  }
  if (area === "Operaciones") return {
    status: "processed_documental",
    analysis: { characters: text.length },
    warnings: [],
    nextAction: "Revisar compromisos, riesgos y próximas acciones del informe de Operaciones.",
  };
  return failedStructured(area);
}

function failedStructured(area: string): ProcessingDecision {
  return {
    status: "failed",
    analysis: null,
    warnings: [`No fue posible identificar los indicadores obligatorios de ${area}.`],
    nextAction: "Revisar el formato original sin repetir ni reemplazar la carga.",
  };
}
