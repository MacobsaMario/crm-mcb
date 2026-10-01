"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <button className="icon-btn" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={signOut}>
      <LogOut size={18} />
    </button>
  );
}