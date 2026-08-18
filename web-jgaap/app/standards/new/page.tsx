import Link from "next/link";

import { HtmlIngestClient } from "@/components/HtmlIngestClient";

export default function NewStandardPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">ASBJ HTML を取込</h1>
          <p className="page-subtitle">
            会計基準と適用指針は別ファイルです。それぞれアップロードすると項番号・見出しが自動抽出されます。
          </p>
        </div>
        <Link href="/standards" className="secondary-button">
          一覧へ
        </Link>
      </header>

      <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        FASF / ASBJ の基準を利用します。個人利用・引用は公表元の利用条件に従ってください。HTML
        原本はサーバーのディスクには保存しません。
      </div>

      <HtmlIngestClient />
    </div>
  );
}
