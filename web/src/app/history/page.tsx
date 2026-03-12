import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HistoryPage() {
  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-4">
      <header className="page-header">
        <div>
          <h1 className="page-title">過去ケース一覧</h1>
          <p className="page-subtitle">
            これまで検討したケースを一覧し、必要に応じて再検討します。
          </p>
        </div>
      </header>

      <section className="card space-y-2">
        <h2 className="section-title">ケース一覧</h2>
        {cases.length === 0 ? (
          <p className="section-help">
            まだケースが登録されていません。ダッシュボードまたは「新規ケース作成」から追加してください。
          </p>
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

