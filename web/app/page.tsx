import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getRecentCases() {
  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { feedbacks: true } } }
  });
  return cases;
}

export default async function DashboardPage() {
  const cases = await getRecentCases();

  return (
    <div className="space-y-4">
      <header className="page-header">
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">
            最近のケースを確認し、新しい会計論点の検討を開始します。
          </p>
        </div>
        <Link href="/cases/new" className="primary-button">
          新規ケース作成
        </Link>
      </header>

      <section className="card space-y-2">
        <h2 className="section-title">最近のケース</h2>
        {cases.length === 0 ? (
          <>
            <p className="section-help text-xs">
              まだケースが登録されていません。まずは「新規ケース作成」から1件登録してみてください。
            </p>
          </>
        ) : (
          <ul className="divide-y text-sm">
            {cases.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/cases/${c.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {c.title}
                  </Link>
                  <div className="text-[11px] text-slate-500">
                    {c.topicLabel && <span className="mr-2">#{c.topicLabel}</span>}
                    <span>
                      {c.standard === "JGAAP"
                        ? "日本基準"
                        : c.standard === "IFRS"
                        ? "IFRS"
                        : "日本基準 / IFRS"}
                    </span>
                    <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200 bg-slate-100 text-slate-600">
                      {c._count.feedbacks > 0 ? "回答済" : "検討中"}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  {c.createdAt.toLocaleString("ja-JP")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}