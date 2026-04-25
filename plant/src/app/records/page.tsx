import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(d: Date) {
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function RecordsPage() {
  const rows = await prisma.identification.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      candidates: {
        orderBy: { rank: "asc" },
        take: 1
      }
    }
  });

  if (rows.length === 0) {
    return (
      <div className="space-y-4 text-center text-forest-800/70">
        <p>まだ識別履歴がありません。</p>
        <Link href="/identify" className="text-forest-800 underline">
          識別に進む
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-forest-800">履歴</h2>
      <ul className="divide-y divide-forest-800/10 rounded-xl border border-forest-800/10 bg-white">
        {rows.map((r) => {
          const top = r.candidates[0];
          const title = top?.commonNameJa || top?.scientificName || "（候補なし）";
          return (
            <li key={r.id}>
              <Link
                href={`/records/${r.id}`}
                className="flex flex-col gap-0.5 px-4 py-3 text-left active:bg-forest-50"
              >
                <span className="font-medium text-forest-800">{title}</span>
                {top && <span className="text-xs text-forest-800/50">{top.scientificName}</span>}
                <span className="text-xs text-forest-800/40">{fmtDate(r.createdAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
