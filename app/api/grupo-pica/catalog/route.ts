import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../../access-control";
import catalog from "../../../data/grupo-pica-subpartidas.json";

export const dynamic = "force-dynamic";

type CatalogRow = (typeof catalog.rows)[number];

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const restrictedCount = catalog.rows.filter((row) => Boolean(row.restriction)).length;
const updatedSubheadingCount = catalog.rows.filter((row) => row.currentSubheading !== row.subheading).length;

export async function GET(request: Request) {
  const authenticated = await getChatGPTUser();
  if (!authenticated) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  const user = resolveCRMUser(authenticated);
  if (!isAuthorizedCRMUser(user)) return Response.json({ error: "Acceso no autorizado" }, { status: 403 });

  const url = new URL(request.url);
  const query = normalized(url.searchParams.get("q"));
  const society = String(url.searchParams.get("society") || "").trim();
  const restricted = url.searchParams.get("restricted") === "1";
  const updated = url.searchParams.get("updated") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const pageSize = 50;

  const rows = (catalog.rows as CatalogRow[]).filter((row) => {
    if (society && !row.societies.includes(society)) return false;
    if (restricted && !row.restriction) return false;
    if (updated && row.currentSubheading === row.subheading) return false;
    if (!query) return true;
    return [row.id, row.subheading, row.currentSubheading, row.commercialName, row.restriction, row.observation]
      .some((value) => normalized(value).includes(query));
  });
  const start = (page - 1) * pageSize;

  return Response.json({
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
    summary: {
      products: catalog.metadata.products,
      uniqueSubheadings: catalog.metadata.uniqueSubheadings,
      restricted: restrictedCount,
      updatedSubheadings: updatedSubheadingCount,
      observedItems: Object.values(catalog.metadata.companies).reduce((total, value) => total + value, 0),
      companies: catalog.metadata.companies,
    },
    source: catalog.metadata,
  });
}
