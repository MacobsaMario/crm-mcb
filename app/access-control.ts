import type { ChatGPTUser } from "./chatgpt-auth";

export type CRMRole =
  | "Dirección General"
  | "Auditoría y Control"
  | "Financiero"
  | "Operaciones"
  | "Despacho"
  | "Facturación"
  | "Regulatorio"
  | "Comercial"
  | "Inhouse El Rosado"
  | "Soporte IT"
  | "Sin rol";

export type CRMUser = ChatGPTUser & {
  role: CRMRole;
  allowedAreas: string[];
  canCreateOpportunities: boolean;
  canManageReceivables: boolean;
  canManageClientControls: boolean;
  canManageInhouse: boolean;
  canManagePayroll: boolean;
  canManageBilling: boolean;
  canManageDispatch: boolean;
  canWrite: boolean;
};

// Los correos del Comité se agregan únicamente cuando el CEO los confirma.
// El control principal siempre se hace por el correo autenticado que entrega
// ChatGPT Sites. Se normaliza su presentación porque algunos visores móviles
// agregan espacios, comillas o codificación porcentual al encabezado.
const rolesByEmail: Record<string, CRMRole> = {
  "k2v5nc8k7s@privaterelay.appleid.com": "Dirección General",
  "mario@mariocoka.com": "Dirección General",
  "bquinde@mariocoka.com": "Financiero",
  "fjaramillo@mariocoka.com": "Auditoría y Control",
  "vanessa@mariocoka.com": "Operaciones",
  "manrique@mariocoka.com": "Despacho",
  "lilibeth@mariocoka.com": "Regulatorio",
  "rebeca@mariocoka.com": "Facturación",
  "carolina@mariocoka.com": "Comercial",
  "oliver@mariocoka.com": "Inhouse El Rosado",
  "soporte@mariocoka.com": "Soporte IT",
};

function normalizeAuthenticatedEmail(value: string) {
  let normalized = value.trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Si el proveedor entrega texto sin codificar, se conserva tal como llegó.
  }
  return normalized
    .replace(/^mailto:/i, "")
    .replace(/^[<'\"]+|[>'\"]+$/g, "")
    .trim()
    .toLowerCase();
}

function trustedOwnerFallback(user: ChatGPTUser): CRMRole | null {
  // La plataforma Sites ya exige pertenecer a la lista privada antes de llegar
  // aquí. Este respaldo se limita al propietario conocido y al nombre completo
  // firmado por ChatGPT, para evitar que el visor iPhone lo deje fuera cuando
  // oculta o transforma su correo de Apple.
  const trustedName = (user.fullName || "").trim().toLocaleLowerCase("es");
  return trustedName === "mario coka" || trustedName === "mario gino coka borja"
    ? "Dirección General"
    : null;
}

const areasByRole: Record<CRMRole, string[]> = {
  "Dirección General": [
    "Comercial",
    "Operaciones",
    "Despacho",
    "Regulatorio",
    "Facturación",
    "Financiero",
    "Inhouse El Rosado",
  ],
  "Auditoría y Control": ["Auditoría y Control"],
  Financiero: ["Financiero"],
  Operaciones: ["Operaciones"],
  Despacho: ["Despacho"],
  Facturación: ["Facturación"],
  Regulatorio: ["Regulatorio"],
  Comercial: ["Comercial"],
  "Inhouse El Rosado": ["Inhouse El Rosado"],
  "Soporte IT": [],
  "Sin rol": [],
};

export function resolveCRMUser(user: ChatGPTUser): CRMUser {
  const normalizedEmail = normalizeAuthenticatedEmail(user.email);
  const role = rolesByEmail[normalizedEmail] ?? trustedOwnerFallback(user) ?? "Sin rol";
  return {
    ...user,
    email: normalizedEmail,
    role,
    allowedAreas: areasByRole[role],
    canCreateOpportunities:
      role === "Dirección General" || role === "Comercial",
    canManageReceivables:
      role === "Dirección General" || role === "Financiero",
    canManageClientControls:
      role === "Dirección General" || role === "Financiero" || role === "Facturación" || role === "Auditoría y Control",
    canManageInhouse:
      role === "Dirección General" || role === "Operaciones" || role === "Inhouse El Rosado",
    canManagePayroll:
      role === "Dirección General" || role === "Financiero",
    canManageBilling:
      role === "Dirección General" || role === "Facturación",
    canManageDispatch:
      role === "Dirección General" || role === "Despacho",
    canWrite: role !== "Sin rol",
  };
}

export function canWriteArea(user: CRMUser, area: string) {
  return user.allowedAreas.includes(area);
}

export function isAuthorizedCRMUser(user: CRMUser) {
  return user.role !== "Sin rol";
}

export function canAccessLegalModule(user: CRMUser) {
  return ["Dirección General", "Auditoría y Control", "Regulatorio", "Operaciones", "Despacho"].includes(user.role);
}
