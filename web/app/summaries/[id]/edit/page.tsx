import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function updateSummary(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const topicLabel = String(formData.get("topicLabel") ?? "").trim() || null;
  const framework = String(formData.get("framework") ?? "JGAAP");
  const content = String(formData.get("content") ?? "");
  const sourceLinks = String(formData.get("sourceLinks") ?? "");

  if (!id || !title || !content) {
    throw new Error("ID・タイトル・内容は必須です。");
  }

  const existing = await prisma.summaryLibrary.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("要約が見つかりませんでした。");
  }

  await prisma.summaryLibrary.update({
    where: { id },
    data: {
      title,
      topicLabel,
      framework: framework === "IFRS" ? "IFRS" : framework === "BOTH" ? "BOTH" : "JGAAP",
      content,
      sourceLinks
    }
  });

  revalidatePath("/summaries");
  redirect("/summaries");
}

export default async function EditSummaryPage({
  params
}: {
  params: { id: string };
}) {
  const row = await prisma.summaryLibrary.findUnique({
    where: { id: params.id }
  });

  if (!row) notFound();

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">要約を編集</h1>
          <p className="page-subtitle">
            ライブラリの要約を編集します。既存ケースのCaseSummaryは変更されません。
          </p>
        </div>
        <Link href="/summaries" className="secondary-button">
          一覧に戻る
        </Link>
      </header>

      <form action={updateSummary} className="space-y-4 card">
        <input type="hidden" name="id" value={row.id} />
        <div>
          <label className="section-title">title</label>
          <input
            name="title"
            className="input"
            defaultValue={row.title}
            required
          />
        </div>
        <div>
          <label className="section-title">topicLabel</label>
          <input
            name="topicLabel"
            className="input"
            defaultValue={row.topicLabel ?? ""}
          />
        </div>
        <div>
          <label className="section-title">framework</label>
          <select name="framework" className="input" defaultValue={row.framework}>
            <option value="JGAAP">JGAAP</option>
            <option value="IFRS">IFRS</option>
            <option value="BOTH">BOTH</option>
          </select>
        </div>
        <div>
          <label className="section-title">content</label>
          <textarea
            name="content"
            className="textarea"
            rows={12}
            defaultValue={row.content}
            required
          />
        </div>
        <div>
          <label className="section-title">sourceLinks</label>
          <textarea
            name="sourceLinks"
            className="textarea"
            rows={4}
            defaultValue={row.sourceLinks}
            placeholder="1行に1つずつURL"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="primary-button">
            保存
          </button>
          <Link href="/summaries" className="secondary-button">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
