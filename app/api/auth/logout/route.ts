import { AUTH_SESSION_COOKIE } from "../../../../lib/auth-session";

export async function POST() {
  const cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
  return Response.json({ signedOut: true }, {
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "set-cookie": cookie,
    },
  });
}