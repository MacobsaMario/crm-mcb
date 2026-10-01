import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { resolveCRMUser } from "../../access-control";

const COOKIE_NAME = "macobsa_ceo_access";
const MAX_AGE_SECONDS = 30 * 60;

function secrets() {
  const values = env as unknown as { CEO_PRESENTATION_PIN?: string; CEO_PRESENTATION_SIGNING_SECRET?: string };
  if (!values.CEO_PRESENTATION_PIN || !values.CEO_PRESENTATION_SIGNING_SECRET) throw new Error("Protección CEO no configurada");
  return { pin: values.CEO_PRESENTATION_PIN, signingSecret: values.CEO_PRESENTATION_SIGNING_SECRET };
}

function canUnlock(role: string) {
  return role === "Dirección General" || role === "Auditoría y Control";
}

function safeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function headers(extra: Record<string, string> = {}) {
  return { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff", ...extra };
}

export async function POST(request: Request) {
  const authenticated = await getChatGPTUser();
  const user = authenticated ? resolveCRMUser(authenticated) : null;
  if (!user) return Response.json({ error: "Debe iniciar sesión" }, { status: 401, headers: headers() });
  if (!canUnlock(user.role)) return Response.json({ error: "Acceso reservado para Dirección General" }, { status: 403, headers: headers() });
  try {
    const { pin, signingSecret } = secrets();
    const body = await request.json() as { pin?: unknown };
    if (!safeEqual(String(body.pin || ""), pin)) return Response.json({ error: "Clave incorrecta" }, { status: 401, headers: headers() });
    const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
    const payload = `${user.email}|${expiresAt}`;
    const signature = await sign(payload, signingSecret);
    const cookie = `${COOKIE_NAME}=${encodeURIComponent(payload)}.${signature}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
    return Response.json({ unlocked: true, expiresIn: MAX_AGE_SECONDS }, { headers: headers({ "set-cookie": cookie }) });
  } catch {
    return Response.json({ error: "La protección CEO todavía no está configurada" }, { status: 503, headers: headers() });
  }
}

export async function DELETE() {
  const authenticated = await getChatGPTUser();
  if (!authenticated) return Response.json({ error: "Debe iniciar sesión" }, { status: 401, headers: headers() });
  const cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
  return Response.json({ unlocked: false }, { headers: headers({ "set-cookie": cookie }) });
}
