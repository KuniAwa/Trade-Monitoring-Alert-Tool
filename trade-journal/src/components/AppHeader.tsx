"use client";

import { usePathname } from "next/navigation";
import { marketBasePath, marketLabel, parseMarket } from "@/lib/markets";

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const onEntry = pathname === "/";
  const market = pathname.startsWith("/fx") ? "fx" : pathname.startsWith("/nikkei") ? "nikkei" : null;
  const title = onEntry ? "トレード日誌" : market ? `${marketLabel(market)} トレード日誌` : "トレード日誌";
  const homeHref = market ? marketBasePath(parseMarket(market)) : "/";
  const newHref = market ? `${marketBasePath(parseMarket(market))}/trades/new` : null;

  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <a href={homeHref} className="text-base font-semibold text-brand">
          {title}
        </a>
        <div className="flex items-center gap-2">
          {!onEntry && (
            <a href="/" className="text-[11px] font-semibold text-slate-500">
              市場選択
            </a>
          )}
          {newHref && (
            <a
              href={newHref}
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm active:scale-95"
            >
              ＋ 取引を記録
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
