import { env } from "cloudflare:workers";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { strFromU8, unzipSync } from "fflate";
import { extractText as extractPdfText } from "unpdf";
import { getDb } from "@macobsa-db";
import { billingSnapshots, commercialSnapshots, dailyReportUploads, departmentUpdates, dispatchSnapshots, financialSnapshots, inhouseSnapshots, regulatorySnapshots, reportProcessingRuns, opportunities } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canWriteArea, isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";
import { decodeWordDocumentXml, parseRegulatoryReport } from "../../regulatory-parser";
import { parseFinancialReport } from "../../financial-parser";
import { billingReconciliationError, parseBillingReport } from "../../billing-parser";
import { parseCommercialReport } from "../../commercial-parser";
import { parseDispatchReport } from "../../dispatch-parser";
import { parseInhouseReport } from "../../inhouse-parser";
import { processStoredReport, REPORT_PARSER_VERSION } from "../../report-processing";

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedExtensions = new Set(["docx", "pdf"]);
const responsibleByArea: Record<string, string> = {
  Comercial: "Carolina Herrera",
  Operaciones: "Vanessa Naranjo",
  Despacho: "María Fernanda Manrique",
  Regulatorio: "Lilibeth Terranova",
  Facturación: "Rebeca Sánchez",
  Financiero: "Bryan Quinde",
  "Inhouse El Rosado": "Oliver Lay",
};
function templateField(text: string, label: string) {
  const m = text.match(new RegExp(`${label}\\s*:?\\s*([^\\n\\r]+)`, "i"));
  return m?.[1]?.replace(/^\[[^\]]*\]$/, "").trim() ?? "";
}

function getBucket() {
  return (env as unknown as { BUCKET: R2Bucket }).BUCKET;
}

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const db = getDb();
    const pendingInhouse = await db.select().from(dailyReportUploads).where(and(
      eq(dailyReportUploads.area, "Inhouse El Rosado"),
      eq(dailyReportUploads.extractedText, ""),
      ne(dailyReportUploads.processingStatus, "voided"),
    )).limit(5);
    for (const pending of pendingInhouse) {
      try {
        const object = await getBucket().get(pending.objectKey);
        if (!object) continue;
        const bytes = new Uint8Array(await object.arrayBuffer());
        const extension = pending.originalName.split(".").pop()?.toLowerCase();
        let text = "";
        if (extension === "pdf") {
          const pdf = await extractPdfText(bytes, { mergePages: true });
          text = pdf.text.slice(0, 40000);
        } else if (extension === "docx") {
          const files = unzipSync(bytes);
          const documentXml = files["word/document.xml"];
          if (documentXml) text = decodeWordDocumentXml(strFromU8(documentXml)).slice(0, 40000);
        }
        if (!text.trim()) continue;
        await db.update(dailyReportUploads).set({ extractedText: text }).where(eq(dailyReportUploads.id, pending.id));
        const analysis = parseInhouseReport(text);
        const [existingSnapshot] = await db.select({ id: inhouseSnapshots.id }).from(inhouseSnapshots).where(and(
          eq(inhouseSnapshots.reportDate, pending.reportDate),
          eq(inhouseSnapshots.responsible, pending.responsible),
          eq(inhouseSnapshots.source, pending.originalName),
        )).limit(1);
        if (analysis?.completeness === 5 && !existingSnapshot) {
          await db.insert(inhouseSnapshots).values({
            reportDate: pending.reportDate,
            client: "Corporación El Rosado",
            davPending: analysis.davPending,
            urgentDav: analysis.urgentDav,
            readyForPickup: analysis.readyForPickup,
            checklistPending: analysis.checklistPending,
            storageAlerts: analysis.storageAlerts,
            responsible: pending.responsible,
            nextAction: analysis.nextAction,
            source: pending.originalName,
            note: analysis.note,
            submittedBy: pending.submittedBy,
          });
        }
        await db.update(departmentUpdates).set({
          status: analysis?.completeness === 5 ? "Procesado automáticamente" : "Recibido · revisión interna",
        }).where(and(
          eq(departmentUpdates.area, pending.area),
          eq(departmentUpdates.reportDate, pending.reportDate),
          eq(departmentUpdates.responsible, pending.responsible),
        ));
      } catch {
        // El informe permanece disponible como evidencia aunque requiera revisión.
      }
    }
    const canReviewAll = user.role === "Dirección General" || user.role === "Auditoría y Control";
    if (!canReviewAll && user.allowedAreas.length === 0) return Response.json({ reports: [] });
    const base = db.select({
      id: dailyReportUploads.id,
      area: dailyReportUploads.area,
      reportDate: dailyReportUploads.reportDate,
      responsible: dailyReportUploads.responsible,
      originalName: dailyReportUploads.originalName,
      mimeType: dailyReportUploads.mimeType,
      sizeBytes: dailyReportUploads.sizeBytes,
      extractedText: dailyReportUploads.extractedText,
      submittedBy: dailyReportUploads.submittedBy,
      createdAt: dailyReportUploads.createdAt,
      processingStatus: dailyReportUploads.processingStatus,
      processingError: dailyReportUploads.processingError,
      nextAction: dailyReportUploads.nextAction,
    }).from(dailyReportUploads);
    const reports = canReviewAll
      ? await base.where(ne(dailyReportUploads.processingStatus, "voided")).orderBy(desc(dailyReportUploads.reportDate), desc(dailyReportUploads.id)).limit(100)
      : await base.where(and(inArray(dailyReportUploads.area, user.allowedAreas), ne(dailyReportUploads.processingStatus, "voided"))).orderBy(desc(dailyReportUploads.reportDate), desc(dailyReportUploads.id)).limit(100);
    const voidedReports = await db.select({ id: dailyReportUploads.id, area: dailyReportUploads.area, reportDate: dailyReportUploads.reportDate, responsible: dailyReportUploads.responsible, originalName: dailyReportUploads.originalName, submittedBy: dailyReportUploads.submittedBy, reason: dailyReportUploads.processingError }).from(dailyReportUploads).where(canReviewAll ? eq(dailyReportUploads.processingStatus, "voided") : and(inArray(dailyReportUploads.area, user.allowedAreas), eq(dailyReportUploads.submittedBy, user.email), eq(dailyReportUploads.processingStatus, "voided"))).orderBy(desc(dailyReportUploads.reportDate)).limit(30);
    return Response.json({ reports, voidedReports });
  } catch {
    return Response.json({ reports: [], voidedReports: [] });
  }
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    const form = await request.formData();
    const area = String(form.get("area") ?? "").trim();
    const reportDate = String(form.get("reportDate") ?? "").trim();
    const responsible = String(form.get("responsible") ?? "").trim();
    const suppliedText = String(form.get("extractedText") ?? "").trim().slice(0, 40000);
    const file = form.get("file");
    if (!canWriteArea(user, area)) return Response.json({ error: `Su rol (${user.role}) no puede cargar informes de ${area}` }, { status: 403 });
    if (!reportDate || !responsible || !(file instanceof File)) return Response.json({ error: "Complete fecha, responsable y archivo" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return Response.json({ error: "La fecha del informe no es válida" }, { status: 400 });
    const expectedResponsible = responsibleByArea[area];
    if (expectedResponsible && responsible !== expectedResponsible) return Response.json({ error: "El responsable no corresponde al área autenticada" }, { status: 403 });
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension)) return Response.json({ error: "Solo se permiten archivos Word .docx o PDF" }, { status: 400 });
    if (area === "Comercial" && extension !== "docx") return Response.json({ error: "El informe de Comercial debe presentarse por escrito en Word .docx para conservar y validar todo el detalle." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "El archivo debe pesar entre 1 byte y 15 MB" }, { status: 400 });
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    let extractedText = suppliedText;
    if (extension === "docx") {
      try {
        const files = unzipSync(fileBytes);
        const documentXml = files["word/document.xml"];
        if (!documentXml) throw new Error("Documento sin contenido");
        extractedText = decodeWordDocumentXml(strFromU8(documentXml)).slice(0, 40000);
      } catch {
        return Response.json({ error: "El Word no contiene texto legible" }, { status: 400 });
      }
    }
    if (extension === "pdf" && (area === "Financiero" || area === "Facturación" || area === "Inhouse El Rosado")) {
      try {
        const pdf = await extractPdfText(fileBytes, { mergePages: true });
        extractedText = pdf.text.slice(0, 40000);
      } catch {
        const label = area === "Facturación" ? "facturación" : area === "Inhouse El Rosado" ? "Inhouse El Rosado" : "cartera";
        return Response.json({ error: `El PDF de ${label} no contiene texto legible. Genere nuevamente el PDF desde Word o Excel.` }, { status: 400 });
      }
    }
    if (area === "Comercial" && extractedText.replace(/\s+/g, " ").trim().length < 500) {
      return Response.json({ error: "El informe Comercial es demasiado breve. Debe desarrollar clientes, gestiones realizadas, respuestas, riesgos, próximas acciones, fechas y evidencias." }, { status: 400 });
    }
    const regulatoryAnalysis = area === "Regulatorio" ? parseRegulatoryReport(extractedText) : null;
    const financialAnalysis = area === "Financiero" ? parseFinancialReport(extractedText) : null;
    const billingAnalysis = area === "Facturación" ? parseBillingReport(extractedText) : null;
    const commercialAnalysis = area === "Comercial" ? parseCommercialReport(extractedText) : null;
    const dispatchAnalysis = area === "Despacho" ? parseDispatchReport(extractedText) : null;
    const inhouseAnalysis = area === "Inhouse El Rosado" ? parseInhouseReport(extractedText) : null;
    if (area === "Regulatorio" && !regulatoryAnalysis) {
      return Response.json({ error: "El informe no contiene los indicadores obligatorios de Regulatorio. Revise el Word antes de cargarlo." }, { status: 400 });
    }
    if (area === "Facturación" && !billingAnalysis) {
      return Response.json({ error: "El informe no permite identificar DAI, Regulatorio, Extras, facturación del día y número de trámites. Corrija el PDF antes de cargarlo." }, { status: 400 });
    }
    if (area === "Facturación" && billingAnalysis) {
      const discrepancy = billingReconciliationError(extractedText, billingAnalysis);
      if (discrepancy) return Response.json({ error: discrepancy }, { status: 422 });
    }
    const db = getDb();
    const [existing] = await db.select().from(dailyReportUploads).where(and(
      eq(dailyReportUploads.area, area),
      eq(dailyReportUploads.responsible, responsible),
      eq(dailyReportUploads.reportDate, reportDate),
    )).limit(1);
    if (existing && existing.processingStatus !== "voided") return Response.json({ error: "Ya existe un informe para esa fecha. Anúlelo en Informes recibidos antes de cargar la versión corregida." }, { status: 409 });
    if (existing && (existing.area !== "Facturación" || (user.role !== "Dirección General" && existing.submittedBy.toLowerCase() !== user.email.toLowerCase()))) return Response.json({ error: "Solo el autor o Dirección General pueden reemplazar un informe anulado de Facturación." }, { status: 403 });
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
    const objectKey = `daily-reports/${area}/${reportDate}/${crypto.randomUUID()}-${safeName}`;
    await getBucket().put(objectKey, fileBytes, {
      httpMetadata: { contentType: file.type || (extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document") },
      customMetadata: { area, reportDate, responsible, submittedBy: user.email },
    });
    let metadataStored = false;
    let storedReportId: number | null = null;
    try {
      const processingStatus = area === "Inhouse El Rosado"
        ? inhouseAnalysis?.completeness === 5 ? "Procesado automáticamente" : "Procesado parcial · revisión interna"
        : area === "Operaciones"
          ? "Procesado documental"
          : regulatoryAnalysis || financialAnalysis || billingAnalysis || commercialAnalysis || dispatchAnalysis?.completeness === 6
            ? "Procesado automáticamente"
            : "Procesado parcial · revisión interna";
      const reportValues = {
        area,
        reportDate,
        responsible,
        originalName: file.name,
        objectKey,
        mimeType: file.type || extension,
        sizeBytes: file.size,
        extractedText,
        submittedBy: user.email,
        sourceEvidence: file.name,
        processingStatus: "processing",
        parserVersion: REPORT_PARSER_VERSION,
        contentSha256: await digestHex(fileBytes),
        originType: "live",
        submittedName: user.displayName,
      };
      const [report] = existing
        ? await db.update(dailyReportUploads).set({ ...reportValues, createdAt: new Date().toISOString(), processingError: "", processedAt: null, reprocessCount: 0, lastReprocessedAt: null, processingToken: null, processingStartedAt: null }).where(and(eq(dailyReportUploads.id, existing.id), eq(dailyReportUploads.processingStatus, "voided"))).returning()
        : await db.insert(dailyReportUploads).values(reportValues).returning();
      if (!report) throw new Error("El informe se modificó en otra sesión");
      metadataStored = true;
      storedReportId = report.id;
      const [update] = await db.insert(departmentUpdates).values({
        area,
        reportDate,
        responsible,
        title: `Informe diario cargado · ${file.name}`,
        detail: `Metas oficiales septiembre 2026: DAI USD 310.000 · Regulatorio USD 30.000 · Extras USD 20.000 · Total USD 360.000.\n\n${extractedText || `Archivo ${file.name} recibido como evidencia. El documento se conserva íntegro en el CRM.`}`,
        metric: `1 informe · ${(file.size / 1024).toFixed(0)} KB`,
        status: processingStatus,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning();
      const templateType = templateField(extractedText, "Tipo");
      const templateClient = templateField(extractedText, "Cliente o prospecto");
      const templateTitle = templateField(extractedText, "Servicio o negocio");
      const templateOwner = templateField(extractedText, "Responsable de ejecutarlo") || responsible;
      const templateNext = templateField(extractedText, "Próxima acción");
      const templateDue = templateField(extractedText, "Fecha límite");
      if (templateClient && templateTitle && templateNext && templateDue && /lead|visita|oportunidad|seguimiento/i.test(templateType)) {
        await db.insert(opportunities).values({ client: templateClient, title: templateTitle, owner: templateOwner, nextAction: templateNext, dueDate: templateDue, source: file.name, submittedBy: user.email, value: 0, stage: "En gestión" });
      }
      const [billingSnapshot] = billingAnalysis ? await db.insert(billingSnapshots).values({
        reportDate,
        ...billingAnalysis,
        responsible,
        source: file.name,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning() : [null];
      const [inhouseSnapshot] = inhouseAnalysis?.completeness === 5 ? await db.insert(inhouseSnapshots).values({
        reportDate,
        client: "Corporación El Rosado",
        davPending: inhouseAnalysis.davPending,
        urgentDav: inhouseAnalysis.urgentDav,
        readyForPickup: inhouseAnalysis.readyForPickup,
        checklistPending: inhouseAnalysis.checklistPending,
        storageAlerts: inhouseAnalysis.storageAlerts,
        responsible,
        nextAction: inhouseAnalysis.nextAction,
        source: file.name,
        note: inhouseAnalysis.note,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning() : [null];
      const [existingDispatch] = dispatchAnalysis ? await db.select({ id: dispatchSnapshots.id }).from(dispatchSnapshots).where(and(
        eq(dispatchSnapshots.reportDate, reportDate),
        eq(dispatchSnapshots.responsible, responsible),
      )).limit(1) : [null];
      const [dispatchSnapshot] = dispatchAnalysis?.completeness === 6 && !existingDispatch ? await db.insert(dispatchSnapshots).values({
        reportDate,
        referencesLive: dispatchAnalysis.referencesLive,
        highRisk: dispatchAnalysis.highRisk,
        readyToInvoice: dispatchAnalysis.readyToInvoice,
        complianceBasisPoints: dispatchAnalysis.complianceBasisPoints as number,
        groupWongPending: dispatchAnalysis.groupWongPending as number,
        ecuasigadStatus: dispatchAnalysis.ecuasigadStatus,
        responsible,
        nextAction: dispatchAnalysis.nextAction,
        source: file.name,
        note: dispatchAnalysis.note,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning() : [null];
      const [regulatorySnapshot] = regulatoryAnalysis ? await db.insert(regulatorySnapshots).values({
        reportDate,
        billedTodayCents: regulatoryAnalysis.billedTodayCents,
        billedAccumulatedCents: regulatoryAnalysis.billedAccumulatedCents,
        monthlyGoalCents: regulatoryAnalysis.monthlyGoalCents,
        createdUnbilledTodayCents: regulatoryAnalysis.createdUnbilledTodayCents,
        createdUnbilledAccumulatedCents: regulatoryAnalysis.createdUnbilledAccumulatedCents,
        licensesToday: regulatoryAnalysis.licensesToday,
        licensesAccumulated: regulatoryAnalysis.licensesAccumulated,
        calculatedProgressBasisPoints: regulatoryAnalysis.calculatedProgressBasisPoints,
        declaredProgressBasisPoints: regulatoryAnalysis.declaredProgressBasisPoints,
        prospectsDeclared: regulatoryAnalysis.prospectsDeclared,
        warningsJson: JSON.stringify(regulatoryAnalysis.warnings),
        responsible,
        source: file.name,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning() : [null];
      const [financialSnapshot] = financialAnalysis ? await db.insert(financialSnapshots).values({
        reportDate,
        accountingPortfolioCents: financialAnalysis.accountingPortfolioCents,
        effectiveCollectionsCents: financialAnalysis.effectiveCollectionsCents,
        newBillingCents: financialAnalysis.newBillingCents,
        confirmedPendingCents: financialAnalysis.confirmedPendingCents,
        overduePendingCents: financialAnalysis.overduePendingCents,
        projectedPortfolioCents: financialAnalysis.projectedPortfolioCents,
        basePortfolioCents: financialAnalysis.basePortfolioCents,
        additionalPotentialCents: financialAnalysis.additionalPotentialCents,
        reportDateLabel: financialAnalysis.reportDateLabel,
        warningsJson: JSON.stringify(financialAnalysis.warnings),
        responsible,
        source: file.name,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning() : [null];
      const [commercialSnapshot] = commercialAnalysis ? await db.insert(commercialSnapshots).values({
        reportDate,
        ...commercialAnalysis,
        responsible,
        source: file.name,
        submittedBy: user.email,
        sourceReportId: report.id,
      }).returning() : [null];
      const decision = processStoredReport(area, extractedText);
      const processingError = decision.warnings.join(" ");
      const processedAt = new Date().toISOString();
      await db.update(dailyReportUploads).set({
        nextAction: decision.nextAction,
        commitmentDate: reportDate,
        processingStatus: decision.status,
        processedAt,
        processingError,
      }).where(eq(dailyReportUploads.id, report.id));
      await db.insert(reportProcessingRuns).values({
        reportId: report.id,
        parserVersion: REPORT_PARSER_VERSION,
        status: decision.status,
        error: processingError,
        resultJson: JSON.stringify({ decision, r2: { status: "PASS", sizeBytes: file.size } }),
        attemptedBy: user.email,
        isReprocess: false,
      });
      return Response.json({ report: { ...report, processingStatus: decision.status, processedAt, processingError }, update, regulatoryAnalysis, financialAnalysis, billingSnapshot, commercialAnalysis, dispatchSnapshot, inhouseSnapshot, regulatorySnapshot, financialSnapshot, commercialSnapshot, processingStatus }, { status: 201 });
    } catch (error) {
      if (!metadataStored) {
        await getBucket().delete(objectKey);
      } else if (storedReportId !== null) {
        await db.update(dailyReportUploads).set({
          processingStatus: "failed",
          processingError: "El archivo quedó preservado; el procesamiento normalizado requiere reanudación controlada.",
          processedAt: new Date().toISOString(),
        }).where(eq(dailyReportUploads.id, storedReportId));
      }
      throw error;
    }
  } catch {
    return Response.json({ error: "No fue posible guardar el informe diario" }, { status: 500 });
  }
}

async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
