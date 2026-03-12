import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "会計判断支援ツール",
  description:
    "日本基準・IFRSに関する会計論点の検討を支援する個人用Webアプリ"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="w-56 border-r bg-white/80 backdrop-blur">
            <div className="px-4 py-5 border-b">
              <div className="text-sm font-semibold text-brand">
                会計判断支援ツール
              </div>
              <div className="mt-1 text-xs text-slate-500">
                個人用・MVPバージョン
              </div>
            </div>
            <nav className="px-3 py-4 space-y-1 text-sm">
              <a href="/" className="block rounded px-3 py-2 hover:bg-slate-100">
                ダッシュボード
              </a>
              <a
                href="/cases/new"
                className="block rounded px-3 py-2 hover:bg-slate-100"
              >
                新規ケース作成
              </a>
              <a
                href="/history"
                className="block rounded px-3 py-2 hover:bg-slate-100"
              >
                過去ケース一覧
              </a>
              <a
                href="/settings"
                className="block rounded px-3 py-2 hover:bg-slate-100"
              >
                利用方法・注意事項
              </a>
            </nav>
          </aside>
          <main className="flex-1 flex flex-col">
            <div className="flex-1 p-6">{children}</div>
            <footer className="border-t bg-white/80 px-6 py-3 text-[11px] text-slate-500">
              <p>
                「本アプリは会計判断の検討支援を目的とする個人用ツールであり、最終判断は利用者自身が行う」
              </p>
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}

