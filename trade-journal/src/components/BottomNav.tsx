"use client";

import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/history", label: "履歴", icon: "🗂" },
  { href: "/trades/new", label: "記録", icon: "➕" },
  { href: "/analysis", label: "分析", icon: "📈" }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-2xl items-stretch border-t bg-white/95 backdrop-blur">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
