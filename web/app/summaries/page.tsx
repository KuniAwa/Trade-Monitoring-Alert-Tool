import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
