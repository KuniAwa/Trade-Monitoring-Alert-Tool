import Link from "next/link";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

async function deleteCaseFromHistory(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) throw new Error("ケース ID が必要です。");

  await prisma.jgaapCase.delete({ where: { id: caseId } });

  revalidatePath("/");
  revalidatePath("/history");
}

export default async function HistoryPage() {
  const cases = await prisma.jgaapCase.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { feedbacks: true } } }
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">ケース履歴</h1>
          <p className="page-subtitle">過去の日本基準 判断ケース一覧。</p>
        </div>
      </header>

      <section className="card space-y-2">
        <h2 className="section-title">すべてのケース</h2>
        {cases.length === 0 ? (
          <p className="section-help">
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
                <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                  <span>{c.createdAt.toLocaleString("ja-JP")}</span>
                  <form action={deleteCaseFromHistory}>
                    <input type="hidden" name="caseId" value={c.id} />
                    <button
                      type="submit"
                      className="secondary-button border-red-300 text-red-700 hover:bg-red-50 text-xs"
                    >
                      削除
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
