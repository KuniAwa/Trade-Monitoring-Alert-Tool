import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JGAAP_DOCUMENT_KIND_LABELS, type JgaapDocumentKind } from "@/lib/types";

export default async function StandardsListPage() {
  const standards = await prisma.jgaapStandard.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { paragraphs: true } } }
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">日本基準</h1>
          <p className="page-subtitle">ASBJ HTML から取り込んだ会計基準・適用指針を項単位で管理します。</p>
        </div>
        <Link href="/standards/new" className="primary-button">
          HTML を取込
        </Link>
      </header>

      {standards.length === 0 ? (
        <div className="card text-sm text-slate-600">
          基準がありません。
          <Link href="/standards/new" className="text-brand hover:underline">
            最初の HTML を取込
          </Link>
          してください。
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">基準 ID</th>
                <th className="px-4 py-2 font-medium">タイトル</th>
                <th className="px-4 py-2 font-medium w-24">種別</th>
                <th className="px-4 py-2 font-medium w-20">項数</th>
                <th className="px-4 py-2 font-medium w-40">更新</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {standards.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2">
                    <Link href={`/standards/${s.id}`} className="font-medium text-brand hover:underline">
                      {s.standardId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-800">{s.titleJa}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {JGAAP_DOCUMENT_KIND_LABELS[s.documentKind as JgaapDocumentKind] ?? s.documentKind}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{s._count.paragraphs}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {s.updatedAt.toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
