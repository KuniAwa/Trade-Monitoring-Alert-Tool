"use client";

import { useMemo, useState } from "react";

export type StandardSelectorItem = {
  id: string;
  standardId: string;
  titleJa: string;
  documentKind: string;
  paragraphCount: number;
};

export function StandardSelectorClient({
  items,
  initialSelectedIds
}: {
  items: StandardSelectorItem[];
  initialSelectedIds?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((initialSelectedIds ?? []).filter(Boolean))
  );

  const value = useMemo(() => [...selected].join(","), [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        取込済みの基準がありません。先に{" "}
        <a href="/standards/new" className="text-brand hover:underline">
          HTML を取り込む
        </a>
        してください。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="selectedStandardIds" value={value} readOnly />
      <ul className="space-y-2 max-h-64 overflow-y-auto rounded border border-slate-200 bg-white p-3">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              id={`std-${it.id}`}
              checked={selected.has(it.id)}
              onChange={() => toggle(it.id)}
              className="mt-1"
            />
            <label htmlFor={`std-${it.id}`} className="cursor-pointer">
              <span className="font-medium text-slate-900">{it.standardId}</span>
              <span className="text-slate-600"> — {it.titleJa}</span>
              <span className="text-slate-400">
                {" "}
                ({it.documentKind === "GUIDANCE" ? "適用指針" : "会計基準"} · {it.paragraphCount} 項)
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
