import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_SESSION_COOKIE, verifyAuthSessionToken } from "../lib/auth-session";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const isProduction = process.env.NODE_ENV === "production";
  const sessionEmail = await productionSessionEmail(
    requestHeaders.get("cookie"),
  );
  const localDevelopmentEmail =
    process.env.NODE_ENV === "development"
      ? process.env.MACOBSA_LOCAL_DEV_EMAIL ??
        import.meta.env.VITE_MACOBSA_LOCAL_DEV_EMAIL
      : undefined;
  const email = isProduction
    ? sessionEmail
    : requestHeaders.get(USER_EMAIL_HEADER) ?? localDevelopmentEmail ?? sessionEmail;
  if (!email) return null;

  const encodedFullName = isProduction
    ? null
    : requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    !isProduction &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  if (process.env.NODE_ENV === "production") {
    redirect(`/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
  }
  redirect(chatGPTSignInPath(returnTo));
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

async function productionSessionEmail(cookieHeader: string | null) {
  const secret = process.env.MACOBSA_AUTH_SECRET;
  if (process.env.NODE_ENV !== "production" || !secret || !cookieHeader) {
    return null;
  }
  const sessionCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_SESSION_COOKIE}=`));
  if (!sessionCookie) return null;
  const token = sessionCookie.slice(AUTH_SESSION_COOKIE.length + 1);
  return (await verifyAuthSessionToken(token, secret))?.email ?? null;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
