import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { extractText as extractPdfText } from "unpdf";
import { getDb } from "@macobsa-db";
import { dailyReportUploads, departmentUpdates } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";
import { parseFinancialReport } from "../../financial-parser";

function getBucket() {
  return (env as unknown as { BUCKET: R2Bucket }).BUCKET;
}

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  if (!["Dirección General", "Auditoría y Control", "Financiero"].includes(user.role)) return Response.json({ snapshots: [] });

  try {
    const db = getDb();
    const reports = await db.select().from(dailyReportUploads)
      .where(eq(dailyReportUploads.area, "Financiero"))
      .orderBy(desc(dailyReportUploads.reportDate), desc(dailyReportUploads.id)).limit(20);
    const snapshots = [];
    for (const report of reports) {
      let text = report.extractedText;
      if (!text && report.mimeType.includes("pdf")) {
        const object = await getBucket().get(report.objectKey);
        if (object) {
          try {
            const pdf = await extractPdfText(new Uint8Array(await object.arrayBuffer()), { mergePages: true });
            text = pdf.text.slice(0, 40000);
            await db.update(dailyReportUploads).set({ extractedText: text }).where(eq(dailyReportUploads.id, report.id));
            await db.update(departmentUpdates).set({
              detail: `Metas oficiales septiembre 2026: DAI USD 310.000 · Regulatorio USD 30.000 · Extras USD 20.000 · Total USD 360.000.\n\n${text}`,
              status: "Procesado",
            }).where(and(
              eq(departmentUpdates.area, "Financiero"),
              eq(departmentUpdates.responsible, report.responsible),
              eq(departmentUpdates.reportDate, report.reportDate),
            ));
          } catch {
            text = "";
          }
        }
      }
      const analysis = parseFinancialReport(text);
      if (analysis) snapshots.push({
        ...analysis,
        id: report.id,
        reportDate: report.reportDate,
        responsible: report.responsible,
        originalName: report.originalName,
        submittedBy: report.submittedBy,
        createdAt: report.createdAt,
      });
    }
    return Response.json({ snapshots });
  } catch {
    return Response.json({ snapshots: [] });
  }
}
