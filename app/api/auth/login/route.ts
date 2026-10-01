import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { crmUsers } from "@macobsa-schema";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../../access-control";
import { AUTH_SESSION_COOKIE, AUTH_SESSION_SECONDS, createAuthSessionToken } from "../../../../lib/auth-session";
import { safeRelativeReturnPath } from "../../../chatgpt-auth";

const scryptAsync = promisify(scrypt);
const dummySalt = randomBytes(16).toString("hex");
const dummyHash = `scrypt$${dummySalt}$${scryptSync("not-a-user-password", dummySalt, 64).toString("hex")}`;

async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[a-f0-9]{128}$/i.test(hash)) {
    await verifyPassword(password, dummyHash);
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

function responseHeaders(extra: Record<string, string> = {}) {
  return {
    "cache-control": "private, no-store, max-age=0",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return Response.json({ error: "No disponible" }, { status: 404 });
  }

  const secret = process.env.MACOBSA_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: "Autenticación no configurada" }, { status: 503 });
  }

  try {
    const input = await request.json() as { email?: unknown; password?: unknown; returnTo?: unknown };
    const email = String(input.email ?? "").trim().toLowerCase().slice(0, 254);
    const password = String(input.password ?? "").slice(0, 256);
    const returnTo = safeRelativeReturnPath(String(input.returnTo ?? "/"));
    const identity = resolveCRMUser({ email, displayName: email, fullName: null });
    const authorized = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && isAuthorizedCRMUser(identity);
    const [account] = authorized
      ? await getDb().select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1)
      : [];

    if (account?.lockedUntil && Date.parse(account.lockedUntil) > Date.now()) {
      await verifyPassword(password, account.passwordHash);
      return Response.json({ error: "Correo o contraseña incorrectos" }, { status: 401, headers: responseHeaders() });
    }

    const validPassword = await verifyPassword(password, account?.passwordHash ?? dummyHash);
    if (!account || !account.active || !validPassword) {
      if (account?.active) {
        const failedLoginAttempts = account.failedLoginAttempts + 1;
        await getDb().update(crmUsers).set({
          failedLoginAttempts,
          lockedUntil: failedLoginAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null,
        }).where(and(eq(crmUsers.email, email), eq(crmUsers.active, true)));
      }
      return Response.json({ error: "Correo o contraseña incorrectos" }, { status: 401, headers: responseHeaders() });
    }

    await getDb().update(crmUsers).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString(),
    }).where(eq(crmUsers.email, email));

    const token = await createAuthSessionToken(email, secret, Date.now() + AUTH_SESSION_SECONDS * 1000);
    const cookie = `${AUTH_SESSION_COOKIE}=${token}; Path=/; Max-Age=${AUTH_SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
    return Response.json({ returnTo }, { headers: responseHeaders({ "set-cookie": cookie }) });
  } catch {
    return Response.json({ error: "No fue posible iniciar sesión" }, { status: 503, headers: responseHeaders() });
  }
}