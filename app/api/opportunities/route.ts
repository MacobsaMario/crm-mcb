import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { opportunities } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";
export async function GET() {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user)
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (!isAuthorizedCRMUser(user))
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  try {
    return Response.json({
      opportunities: await getDb()
        .select()
        .from(opportunities)
        .orderBy(desc(opportunities.createdAt))
        .limit(100),
    });
  } catch {
    return Response.json({ opportunities: [] });
  }
}
export async function POST(request: Request) {
  try {
    const authenticated = await getChatGPTUser();
    const user = authenticated ? resolveCRMUser(authenticated) : null;
    if (!user)
      return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
    if (!user.canCreateOpportunities)
      return Response.json(
        { error: `Su rol (${user.role}) no puede crear oportunidades` },
        { status: 403 },
      );
    const p = (await request.json()) as Record<string, unknown>;
    const client = String(p.client ?? "").trim(),
      title = String(p.title ?? "").trim(),
      owner = String(p.owner ?? "").trim(),
      nextAction = String(p.nextAction ?? "").trim(),
      dueDate = String(p.dueDate ?? "").trim(),
      source = String(p.source ?? "").trim();
    if (!client || !title || !owner || !nextAction || !dueDate || !source)
      return Response.json(
        {
          error:
            "Complete cliente, oportunidad, responsable, próxima acción, fecha y fuente",
        },
        { status: 400 },
      );
    const [opportunity] = await getDb()
      .insert(opportunities)
      .values({
        client,
        title,
        owner,
        nextAction,
        dueDate,
        source,
        submittedBy: user.email,
        value: Math.max(0, Number(p.value) || 0),
        stage: String(p.stage ?? "Calificación"),
      })
      .returning();
    return Response.json({ opportunity }, { status: 201 });
  } catch {
    return Response.json(
      { error: "No fue posible guardar la oportunidad" },
      { status: 500 },
    );
  }
}
