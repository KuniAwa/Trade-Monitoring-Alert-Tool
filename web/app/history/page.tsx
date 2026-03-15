import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function deleteCaseFromHistory(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) {
    throw new Error("ケースIDがありません。");
  }

  await prisma.case.delete({
    where: { id: caseId }
  });

  revalidatePath("/");
  revalidatePath("/history");
}

export default async function HistoryPage() {
  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { feedbacks: true } } }
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
                    <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200 bg-slate-100 text-slate-600">
                      {c._count.feedbacks > 0 ? "回答済" : "検討中"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{c.createdAt.toLocaleString("ja-JP")}</span>
                  <form action={deleteCaseFromHistory}>
                    <input type="hidden" name="caseId" value={c.id} />
                    <button
                      type="submit"
                      className="secondary-button border-red-300 text-red-700 hover:bg-red-50"
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

