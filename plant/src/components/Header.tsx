"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  if (path === "/login") {
    return (
      <header className="mb-6 border-b border-forest-800/10 pb-4">
        <h1 className="text-xl font-semibold text-forest-800">山野草 識別</h1>
        <p className="text-sm text-forest-800/60">家族用</p>
      </header>
    );
  }

  async function onLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="mb-6 border-b border-forest-800/10 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-forest-800">
            <Link href="/">山野草 識別</Link>
          </h1>
          <p className="text-sm text-forest-800/60">Pl@ntNet + LLM</p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <Link
            href="/identify"
            className="rounded-lg bg-forest-800 px-3 py-2 text-sm font-medium text-white active:opacity-90"
          >
            新規
          </Link>
          <Link
            href="/records"
            className="rounded-lg border border-forest-800/20 px-3 py-2 text-sm text-forest-800"
          >
            履歴
          </Link>
          <button
            type="button"
            onClick={onLogout}
            disabled={busy}
            className="text-sm text-forest-800/50 underline disabled:opacity-50"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
