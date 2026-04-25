"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode })
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setError(d.error || "ログインに失敗しました。");
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="p" className="mb-1 block text-sm font-medium text-forest-800">
          合言葉
        </label>
        <input
          id="p"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-forest-800/20 bg-white px-3 py-3 text-base"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-forest-800 py-3 text-base font-medium text-white active:opacity-90 disabled:opacity-50"
      >
        {busy ? "確認中…" : "入る"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-forest-800/60">読み込み…</p>}>
      <LoginForm />
    </Suspense>
  );
}
