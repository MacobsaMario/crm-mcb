const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const AUTH_SESSION_COOKIE = "macobsa_session";
export const AUTH_SESSION_SECONDS = 8 * 60 * 60;

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function createAuthSessionToken(
  email: string,
  secret: string,
  expiresAt: number,
) {
  const payload = encodeBase64Url(
    encoder.encode(JSON.stringify({ email, expiresAt })),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret, ["sign"]),
    encoder.encode(payload),
  );
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthSessionToken(token: string, secret: string) {
  if (token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  try {
    const verified = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret, ["verify"]),
      decodeBase64Url(signature),
      encoder.encode(payload),
    );
    if (!verified) return null;

    const value = JSON.parse(decoder.decode(decodeBase64Url(payload))) as {
      email?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof value.email !== "string" ||
      typeof value.expiresAt !== "number" ||
      value.expiresAt <= Date.now()
    ) return null;

    return { email: value.email.toLowerCase(), expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}