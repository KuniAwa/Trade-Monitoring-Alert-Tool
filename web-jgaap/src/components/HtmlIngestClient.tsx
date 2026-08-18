"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAX_HTML_UPLOAD_BYTES } from "@/lib/types";

export function HtmlIngestClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setWarnings([]);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("ASBJ の HTML ファイルを選択してください。");
      setLoading(false);
      return;
    }
    if (file.size > MAX_HTML_UPLOAD_BYTES) {
      setError("HTML は 4 MB 以下にしてください。");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/standards/upload-html", { method: "POST", body: formData });
      const data = (await res.json()) as {
        error?: string;
        redirectUrl?: string;
        warnings?: string[];
      };

      if (!res.ok) {
        setError(data.error ?? `取込に失敗しました（${res.status}）。`);
        setLoading(false);
        return;
      }

      if (data.warnings?.length) setWarnings(data.warnings);
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        router.refresh();
      }
    } catch {
      setError("取込に失敗しました。再試行してください。");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 card">
      <div>
        <label className="section-title" htmlFor="html-file">
          ASBJ HTML ファイル
        </label>
        <p className="section-help">
          企業会計基準委員会の会計基準検索システムから保存した HTML（会計基準または適用指針）をアップロードします。原本はディスクに保存しません。
        </p>
        <input id="html-file" name="file" type="file" accept=".html,.htm,text/html" className="input" required />
      </div>
      <div>
        <label className="section-title" htmlFor="sourceUrl">
          出典 URL（任意）
        </label>
        <input id="sourceUrl" name="sourceUrl" className="input" placeholder="https://www.asb.or.jp/..." />
      </div>
      <div>
        <label className="section-title" htmlFor="licenseNote">
          利用条件メモ（任意）
        </label>
        <textarea
          id="licenseNote"
          name="licenseNote"
          rows={2}
          className="textarea"
          placeholder="FASF / ASBJ の利用条件に従う、など"
        />
      </div>
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="text-xs text-amber-900 space-y-1">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "取込中…" : "HTML を取り込む"}
        </button>
      </div>
    </form>
  );
}
