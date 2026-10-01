import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { safeRelativeReturnPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  if (process.env.NODE_ENV !== "production") redirect("/");
  const params = await searchParams;

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">M</div>
        <p className="login-eyebrow">MACOBSA · CENTRO DE CONTROL</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <LoginForm returnTo={safeRelativeReturnPath(params.returnTo ?? "/")} />
      </section>
    </main>
  );
}