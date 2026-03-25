import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function deleteSummary(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const row = await prisma.summaryLibrary.findUnique({ where: { id } });
  if (!row) return;
  await prisma.summaryLibrary.delete({ where: { id } });
  revalidatePath("/summaries");
}

async function duplicateSummary(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const source = await prisma.summaryLibrary.findUnique({ where: { id } });
  if (!source) return;
  await prisma.summaryLibrary.create({
    data: {
      title: `${source.title} (コピー)`,
      topicLabel: source.topicLabel,
      framework: source.framework,
      content: source.content,
      sourceLinks: source.sourceLinks
    }
  });
  revalidatePath("/summaries");
}

export default async function SummariesPage() {
  const items = await prisma.summaryLibrary.findMany({
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="space-y-4">
      <header className="page-header">
        <div>
          <h1 className="page-title">要約ライブラリ</h1>
          <p className="page-subtitle">
            保存したNotebookLM要約の一覧です。新規ケース作成時に選択して再利用できます。
          </p>
        </div>
        <Link href="/cases/new" className="secondary-button">
          新規ケース作成
        </Link>
      </header>

      <section className="card space-y-2">
        <h2 className="section-title">保存済み要約（更新日降順）</h2>
        {items.length === 0 ? (
          <p className="section-help">
            まだ要約が保存されていません。新規ケース作成画面でNotebookLM要約を入力し、「この要約をライブラリに保存」から保存してください。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-2 font-semibold">title</th>
                  <th className="p-2 font-semibold">topicLabel</th>
                  <th className="p-2 font-semibold">framework</th>
                  <th className="p-2 font-semibold">updatedAt</th>
                  <th className="p-2 font-semibold w-40">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{row.title}</td>
                    <td className="p-2 text-slate-600">{row.topicLabel ?? "—"}</td>
                    <td className="p-2 text-slate-600">{row.framework}</td>
                    <td className="p-2 text-slate-500">
                      {row.updatedAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          href={`/summaries/${row.id}/edit`}
                          className="secondary-button text-xs py-1 px-2"
                        >
                          Edit
                        </Link>
                        <form action={duplicateSummary} className="inline">
                          <input type="hidden" name="id" value={row.id} />
                          <button type="submit" className="secondary-button text-xs py-1 px-2">
                            Duplicate
                          </button>
                        </form>
                        <form action={deleteSummary} className="inline">
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            className="secondary-button text-xs py-1 px-2 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
