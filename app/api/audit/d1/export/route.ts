import {
  auditHeaders,
  buildD1AuditSnapshot,
  canonicalJson,
  requireAuditOwner,
} from "../../_shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuditOwner();
  if (denied) return denied;

  try {
    const snapshot = await buildD1AuditSnapshot();
    const generatedAt = new Date().toISOString();
    const body = canonicalJson({ generatedAt, ...snapshot });
    const fileDate = generatedAt.replace(/[:.]/g, "-");
    return new Response(body, {
      headers: auditHeaders({
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="MACOBSA_D1_V49_${fileDate}.json"`,
        "x-macobsa-snapshot-sha256": snapshot.sha256,
      }),
    });
  } catch (error) {
    console.error("D1 audit export failed", error);
    return Response.json({ error: "No fue posible generar la exportación D1" }, {
      status: 503,
      headers: auditHeaders(),
    });
  }
}
