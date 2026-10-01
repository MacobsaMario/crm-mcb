import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { dailyReportUploads, reportCorrectionHistory } from "@macobsa-schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { resolveCRMUser } from "../../../../access-control";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Informe no válido" }, { status: 400 });
  const db = getDb();
  const [report] = await db.select().from(dailyReportUploads).where(eq(dailyReportUploads.id, id)).limit(1);
  if (!report) return Response.json({ error: "Informe no encontrado" }, { status: 404 });
  if (user.role !== "Dirección General" && user.role !== "Auditoría y Control" && (user.email.toLowerCase() !== report.submittedBy.toLowerCase() || !user.allowedAreas.includes(report.area))) return Response.json({ error: "Sin acceso al historial" }, { status: 403 });
  const versions = await db.select({ id: reportCorrectionHistory.id, originalName: reportCorrectionHistory.originalName, createdAt: reportCorrectionHistory.createdAt, voidedAt: reportCorrectionHistory.voidedAt, voidedBy: reportCorrectionHistory.voidedBy, reason: reportCorrectionHistory.reason }).from(reportCorrectionHistory).where(and(eq(reportCorrectionHistory.reportId, id), eq(reportCorrectionHistory.area, report.area))).orderBy(desc(reportCorrectionHistory.id));
  return Response.json({ versions });
}
