"use client";

import { usePathname } from "next/navigation";
import { marketBasePath } from "@/lib/markets";

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  if (pathname === "/") return null;

  const market = pathname.startsWith("/fx") ? "fx" : "nikkei";
  const base = marketBasePath(market);
  const items = [
    { href: base, label: "ホーム", icon: "🏠" },
    { href: `${base}/history`, label: "履歴", icon: "🗂" },
    { href: `${base}/trades/new`, label: "記録", icon: "➕" },
    { href: `${base}/analysis`, label: "分析", icon: "📈" }
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-2xl items-stretch border-t bg-white/95 backdrop-blur">
      {items.map((item) => {
        const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? "font-semibold text-brand" : "text-slate-500"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
