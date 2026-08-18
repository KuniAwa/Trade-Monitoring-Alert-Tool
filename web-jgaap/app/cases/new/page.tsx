import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { StandardSelectorClient } from "@/components/StandardSelectorClient";
import { prisma } from "@/lib/prisma";

async function createCase(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const topicLabel = String(formData.get("topicLabel") ?? "").trim() || null;
  const transactionSummaryJa = String(formData.get("transactionSummaryJa") ?? "").trim();
  const initialQuestionJa = String(formData.get("initialQuestionJa") ?? "").trim();
  const notesJa = String(formData.get("notesJa") ?? "").trim();
  const standardLinksRaw = String(formData.get("standardLinks") ?? "");
  const selectedStandardIdsRaw = String(formData.get("selectedStandardIds") ?? "").trim();
  const selectedStandardIds = selectedStandardIdsRaw
    ? selectedStandardIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  if (!title || !transactionSummaryJa || !initialQuestionJa) {
    throw new Error("タイトル、取引概要、初期質問は必須です。");
  }

  const links = standardLinksRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const created = await prisma.jgaapCase.create({
    data: {
      kind: "JUDGMENT",
      title,
      topicLabel,
      transactionSummaryJa,
      initialQuestionJa,
      notesJa,
      standardLinks: {
        create: links.map((url) => ({ url }))
      },
      standards:
        selectedStandardIds.length > 0
          ? {
              create: selectedStandardIds.map((standardId) => ({
                standard: { connect: { id: standardId } }
              }))
            }
          : undefined
    }
  });

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/cases/${created.id}`);
}

export default async function NewCasePage() {
  const standardItems = await prisma.jgaapStandard.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { paragraphs: true } } }
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">新規 日本基準 判断ケース</h1>
          <p className="page-subtitle">取引と論点を日本語で登録し、取込済みの会計基準・適用指針をリンクします。</p>
        </div>
      </header>

      <form action={createCase} className="space-y-4 card">
        <div>
          <label className="section-title">タイトル</label>
          <input name="title" className="input" required placeholder="例: 複合契約の収益認識" />
        </div>
        <div>
          <label className="section-title">トピック（任意）</label>
          <input name="topicLabel" className="input" placeholder="収益、リース 等" />
        </div>
        <div>
          <label className="section-title">取引概要</label>
          <textarea
            name="transactionSummaryJa"
            rows={4}
            className="textarea"
            placeholder="取引の背景、構造、金額など"
            required
          />
        </div>
        <div>
          <label className="section-title">初期質問</label>
          <textarea
            name="initialQuestionJa"
            rows={3}
            className="textarea"
            placeholder="最初に検討したい日本基準上の論点"
            required
          />
        </div>
        <div>
          <label className="section-title">参考リンク（任意、1 行 1 URL）</label>
          <textarea name="standardLinks" rows={3} className="textarea" placeholder="https://www.asb.or.jp/..." />
        </div>
        <div>
          <label className="section-title">リンクする基準（推奨）</label>
          <StandardSelectorClient
            items={standardItems.map((s) => ({
              id: s.id,
              standardId: s.standardId,
              titleJa: s.titleJa,
              documentKind: s.documentKind,
              paragraphCount: s._count.paragraphs
            }))}
          />
        </div>
        <div>
          <label className="section-title">個人メモ（AI 非送信）</label>
          <textarea name="notesJa" rows={2} className="textarea" placeholder="メモ（任意）" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="submit" className="primary-button">
            ケースを作成
          </button>
        </div>
      </form>
    </div>
  );
}
