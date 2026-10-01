import {
  auditHeaders,
  buildD1AuditSnapshot,
  requireAuditOwner,
} from "../../_shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuditOwner();
  if (denied) return denied;

  try {
    const snapshot = await buildD1AuditSnapshot();
    return Response.json({
      generatedAt: new Date().toISOString(),
      binding: snapshot.binding,
      tableCount: snapshot.tables.length,
      totalRows: snapshot.totalRows,
      schemaObjectCount: snapshot.schemaObjects.length,
      sequenceCount: snapshot.sequences.length,
      sha256: snapshot.sha256,
      tables: snapshot.tables.map(({ name, columns, foreignKeys, rowCount, sha256 }) => ({
        name,
        columns,
        foreignKeys,
        rowCount,
        sha256,
      })),
    }, { headers: auditHeaders() });
  } catch (error) {
    console.error("D1 audit manifest failed", error);
    return Response.json({ error: "No fue posible generar el manifiesto D1" }, {
      status: 503,
      headers: auditHeaders(),
    });
  }
}
