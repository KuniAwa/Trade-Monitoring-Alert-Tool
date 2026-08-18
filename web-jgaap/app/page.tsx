import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getRecentCases() {
  return prisma.jgaapCase.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { feedbacks: true } } }
  });
}

async function getRecentStandards() {
  return prisma.jgaapStandard.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { _count: { select: { paragraphs: true } } }
  });
}

export default async function DashboardPage() {
  const [cases, standards, unreviewedCount] = await Promise.all([
    getRecentCases(),
    getRecentStandards(),
    prisma.jgaapParagraph.count({ where: { reviewStatus: "UNREVIEWED" } })
  ]);

  return (
    <div className="space-y-4 max-w-4xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">ASBJ の HTML を正本とする判断ケースと基準の管理。</p>
        </div>
        <div className="flex gap-2">
          <Link href="/cases/new" className="primary-button">
            新規判断ケース
          </Link>
          <Link href="/standards/new" className="secondary-button">
            HTML を取込
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div className="card py-3">
          <div className="text-xs text-slate-500">未レビュー項</div>
          <div className="text-2xl font-semibold text-amber-800">{unreviewedCount}</div>
          <Link href="/standards" className="text-xs text-brand hover:underline">
            基準でレビュー →
          </Link>
        </div>
      </div>

      <section className="card space-y-2">
        <h2 className="section-title">最近のケース</h2>
        {cases.length === 0 ? (
          <p className="section-help text-xs">
            ケースがありません。
            <Link href="/cases/new" className="text-brand hover:underline">
              新規判断ケース
            </Link>
            から作成してください。
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {cases.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <Link href={`/cases/${c.id}`} className="font-medium text-slate-900 hover:underline">
                    {c.title}
                  </Link>
                  <div className="text-[11px] text-slate-500">
                    {c.topicLabel && <span className="mr-2">#{c.topicLabel}</span>}
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200 bg-slate-100 text-slate-600">
                      {c._count.feedbacks > 0 ? "フィードバックあり" : "進行中"}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">{c.createdAt.toLocaleString("ja-JP")}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">最近取り込んだ基準</h2>
        {standards.length === 0 ? (
          <p className="section-help text-xs">
            基準がありません。
            <Link href="/standards/new" className="text-brand hover:underline">
              ASBJ HTML を取込
            </Link>
            してください。
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {standards.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <Link href={`/standards/${s.id}`} className="font-medium text-slate-900 hover:underline">
                    {s.standardId}
                  </Link>
                  <div className="text-xs text-slate-500">{s.titleJa}</div>
                </div>
                <div className="text-[11px] text-slate-400 text-right shrink-0">
                  <div>{s._count.paragraphs} 項</div>
                  <div>{s.updatedAt.toLocaleString("ja-JP")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
