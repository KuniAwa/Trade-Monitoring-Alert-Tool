import "@/styles/globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "トレード日誌",
  description:
    "日経225とFXの取引実績を記録し、Yahooの同一データからAIが改善点と売買条件を分析する個人用ツール",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "トレード日誌"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1d4ed8"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">
          <AppHeader />
          <main className="flex-1 px-4 py-4 pb-24">{children}</main>
          <BottomNav />
          <footer className="safe-bottom border-t bg-white/80 px-4 py-3 text-[11px] text-slate-500">
            本ツールは取引の振り返り支援を目的とした個人用です。投資助言ではなく、最終判断は利用者自身が行います。
          </footer>
        </div>
      </body>
    </html>
  );
}
