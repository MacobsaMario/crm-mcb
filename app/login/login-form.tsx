"use client";

import { useState } from "react";

export default function LoginForm({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          returnTo,
        }),
      });
      const result = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) {
        setError(result.error ?? "No fue posible iniciar sesión.");
        return;
      }
      window.location.assign(result.returnTo ?? "/");
    } catch {
      setError("No fue posible conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="password">Contraseña</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}