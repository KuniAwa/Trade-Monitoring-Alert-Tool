import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "JGAAP Support Tool",
  description: "ASBJ HTML を正本とする日本基準の会計判断支援（個人利用）"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="w-56 border-r bg-white/80 backdrop-blur shrink-0">
            <div className="px-4 py-5 border-b">
              <div className="text-sm font-semibold text-brand">JGAAP Support Tool</div>
              <div className="mt-1 text-xs text-slate-500">日本基準 · ASBJ HTML</div>
            </div>
            <nav className="px-3 py-4 space-y-1 text-sm">
              <a href="/" className="block rounded px-3 py-2 hover:bg-slate-100">
                ダッシュボード
              </a>
              <a href="/cases/new" className="block rounded px-3 py-2 hover:bg-slate-100">
                新規判断ケース
              </a>
              <a href="/history" className="block rounded px-3 py-2 hover:bg-slate-100">
                ケース履歴
              </a>
              <a href="/standards" className="block rounded px-3 py-2 hover:bg-slate-100">
                日本基準
              </a>
              <a href="/settings" className="block rounded px-3 py-2 hover:bg-slate-100">
                設定
              </a>
            </nav>
          </aside>
          <main className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-6">{children}</div>
            <footer className="border-t bg-white/80 px-6 py-3 text-[11px] text-slate-500 shrink-0">
              <p>
                本ツールは個人の日本基準検討を支援します。最終判断はユーザーが行ってください。条文は
                FASF / ASBJ の基準に基づきます。
              </p>
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
