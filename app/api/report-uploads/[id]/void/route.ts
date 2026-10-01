import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb, runBatch } from "@macobsa-db";
import { billingSnapshots, dailyReportUploads, departmentUpdates, reportCorrectionHistory } from "@macobsa-schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { resolveCRMUser } from "../../../../access-control";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Informe no válido" }, { status: 400 });
  const reason = String((await request.json().catch(() => ({})) as { reason?: string }).reason ?? "").trim();
  if (reason.length < 10 || reason.length > 500) return Response.json({ error: "Explique el motivo en 10 a 500 caracteres." }, { status: 400 });
  try {
    const db = getDb();
    const [report] = await db.select().from(dailyReportUploads).where(eq(dailyReportUploads.id, id)).limit(1);
    if (!report) return Response.json({ error: "Informe no encontrado" }, { status: 404 });
    if (report.area !== "Facturación") return Response.json({ error: "Esta corrección está disponible para informes de Facturación." }, { status: 400 });
    if (user.role !== "Dirección General" && (user.email.toLowerCase() !== report.submittedBy.toLowerCase() || !user.allowedAreas.includes(report.area))) {
      return Response.json({ error: "Solo la persona que lo cargó o Dirección General puede anular el informe." }, { status: 403 });
    }
    if (report.processingStatus === "voided") return Response.json({ error: "El informe ya está anulado" }, { status: 409 });
    const bucket = (env as unknown as { BUCKET: R2Bucket }).BUCKET;
    if (!await bucket.head(report.objectKey)) return Response.json({ error: "No se encuentra el original; la anulación requiere revisión." }, { status: 409 });
    const snapshots = await db.select().from(billingSnapshots).where(eq(billingSnapshots.sourceReportId, report.id));
    const updates = await db.select().from(departmentUpdates).where(and(
      eq(departmentUpdates.area, report.area), eq(departmentUpdates.reportDate, report.reportDate),
      eq(departmentUpdates.responsible, report.responsible), eq(departmentUpdates.title, `Informe diario cargado · ${report.originalName}`),
    ));
    const now = new Date().toISOString();
    const result = await runBatch((transaction) => [
      transaction.insert(reportCorrectionHistory).values({ reportId: report.id, area: report.area, reportDate: report.reportDate, responsible: report.responsible, originalName: report.originalName, objectKey: report.objectKey, mimeType: report.mimeType, sizeBytes: report.sizeBytes, extractedText: report.extractedText, submittedBy: report.submittedBy, createdAt: report.createdAt, voidedAt: now, voidedBy: user.email, reason, metricsJson: JSON.stringify({ billingSnapshots: snapshots, departmentUpdates: updates }) }),
      transaction.update(dailyReportUploads).set({ processingStatus: "voided", processedAt: now, processingError: reason }).where(and(eq(dailyReportUploads.id, id), eq(dailyReportUploads.processingStatus, report.processingStatus))).returning({ id: dailyReportUploads.id }),
      transaction.delete(billingSnapshots).where(eq(billingSnapshots.sourceReportId, report.id)),
      transaction.delete(departmentUpdates).where(and(eq(departmentUpdates.area, report.area), eq(departmentUpdates.reportDate, report.reportDate), eq(departmentUpdates.responsible, report.responsible), eq(departmentUpdates.title, `Informe diario cargado · ${report.originalName}`))),
    ]);
    if (!result[1].length) return Response.json({ error: "El informe cambió en otra sesión; actualice la pantalla." }, { status: 409 });
    return Response.json({ reportId: id, reportDate: report.reportDate, message: "Informe anulado y retirado de los tableros. El archivo original permanece en el historial de correcciones." });
  } catch {
    return Response.json({ error: "No se pudo completar la anulación; verifique el estado antes de cargar otro informe." }, { status: 500 });
  }
}
