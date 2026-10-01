import {
  auditHeaders,
  getAuditD1,
  getAuditR2,
  requireAuditOwner,
  sha256,
} from "../../_shared";

export const dynamic = "force-dynamic";

type HistoricalReference = {
  id: number;
  object_key: string;
  original_name: string;
  area: string;
  report_date: string;
  responsible: string;
  mime_type: string;
  size_bytes: number;
  submitted_by: string;
  created_at: string;
};

export async function GET() {
  const denied = await requireAuditOwner();
  if (denied) return denied;

  try {
    const database = getAuditD1();
    const bucket = getAuditR2();
    const referencesResult = await database.prepare(`
      SELECT id, object_key, original_name, area, report_date, responsible,
             mime_type, size_bytes, submitted_by, created_at
      FROM daily_report_uploads
      ORDER BY id
    `).all<HistoricalReference>();
    if (!referencesResult.success) throw new Error("D1 reference read failed");

    const references = referencesResult.results ?? [];
    const objects = [];
    for (const reference of references) {
      let metadata: R2Object | null;
      try {
        metadata = await bucket.head(reference.object_key);
      } catch {
        objects.push({ ...reference, exists: null, readable: false, status: "HEAD_ERROR" });
        continue;
      }
      if (!metadata) {
        objects.push({ ...reference, exists: false, readable: false, status: "MISSING" });
        continue;
      }
      try {
        const object = await bucket.get(reference.object_key);
        if (!object) {
          objects.push({
            ...reference,
            exists: true,
            readable: false,
            r2SizeBytes: metadata.size,
            status: "INACCESSIBLE",
          });
          continue;
        }
        const bytes = await object.arrayBuffer();
        const bytesRead = bytes.byteLength;
        const sizeMatches = metadata.size === reference.size_bytes && bytesRead === metadata.size;
        objects.push({
          ...reference,
          exists: true,
          readable: true,
          r2SizeBytes: metadata.size,
          bytesRead,
          etag: metadata.etag,
          uploaded: metadata.uploaded.toISOString(),
          httpMetadata: metadata.httpMetadata,
          customMetadata: metadata.customMetadata,
          sha256: await sha256(bytes),
          sizeMatches,
          status: sizeMatches ? "PASS" : "SIZE_MISMATCH",
        });
      } catch {
        objects.push({
          ...reference,
          exists: true,
          readable: false,
          r2SizeBytes: metadata.size,
          status: "READ_ERROR",
        });
      }
    }

    const expectedReferences = references.length;
    const passed = objects.filter((item) => item.status === "PASS").length;
    return Response.json({
      generatedAt: new Date().toISOString(),
      expectedReferences,
      d1References: references.length,
      passed,
      result: passed === expectedReferences ? `VERIFIED_${passed}_OF_${expectedReferences}` : `NOT_VERIFIED_${passed}_OF_${expectedReferences}`,
      objects,
    }, { headers: auditHeaders() });
  } catch (error) {
    console.error("R2 audit verification failed", error);
    return Response.json({ error: "No fue posible verificar las referencias R2" }, {
      status: 503,
      headers: auditHeaders(),
    });
  }
}
