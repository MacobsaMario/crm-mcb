import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { regulatorySnapshots } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  const canReview =
    user.role === "Dirección General" ||
    user.role === "Auditoría y Control" ||
    user.allowedAreas.includes("Regulatorio");
  if (!canReview) return Response.json({ snapshots: [] });

  try {
    const rows = await getDb()
      .select()
      .from(regulatorySnapshots)
      .orderBy(desc(regulatorySnapshots.reportDate), desc(regulatorySnapshots.id))
      .limit(100);
    const snapshots = rows.map(({ warningsJson, source, ...snapshot }) => {
      let warnings: string[] = [];
      try {
        const parsed = JSON.parse(warningsJson);
        if (Array.isArray(parsed)) warnings = parsed.filter((item): item is string => typeof item === "string");
      } catch {
        warnings = ["La advertencia del corte no pudo interpretarse."];
      }
      return { ...snapshot, originalName: source, warnings };
    });
    return Response.json({ snapshots });
  } catch {
    return Response.json({ snapshots: [] });
  }
}
