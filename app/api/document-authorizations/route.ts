import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { documentAuthorizations } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { resolveCRMUser } from "../../access-control";

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user || user.role !== "Dirección General") return Response.json({ error: "Autorización exclusiva del CEO" }, { status: 403 });
  const authorizations = await getDb().select().from(documentAuthorizations).orderBy(desc(documentAuthorizations.id)).limit(100);
  return Response.json({ authorizations });
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user || user.role !== "Dirección General") return Response.json({ error: "Solo Mario Coka puede autorizar documentos" }, { status: 403 });
  try {
    const input = await request.json() as Record<string, unknown>;
    const documentType = String(input.documentType ?? "").trim();
    const area = String(input.area ?? "").trim();
    const responsible = String(input.responsible ?? "").trim();
    const reportDate = String(input.reportDate ?? "").trim();
    if (!documentType || !area || !responsible) return Response.json({ error: "Faltan datos del documento" }, { status: 400 });
    const [authorization] = await getDb().insert(documentAuthorizations).values({
      documentType,
      area,
      responsible,
      reportDate,
      authorizedBy: user.email,
    }).returning();
    return Response.json({
      authorization,
      authorizationCode: `MACOBSA-AUT-${String(authorization.id).padStart(6, "0")}`,
    }, { status: 201 });
  } catch {
    return Response.json({ error: "No fue posible registrar la autorización" }, { status: 500 });
  }
}
