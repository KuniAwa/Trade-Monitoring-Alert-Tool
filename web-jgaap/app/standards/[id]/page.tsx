import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ParagraphTableClient } from "@/components/ParagraphTableClient";
import { countParagraphObligationIssues } from "@/lib/jgaapCitationValidation";
import { prisma } from "@/lib/prisma";
import { JGAAP_DOCUMENT_KIND_LABELS, type JgaapDocumentKind } from "@/lib/types";

async function deleteStandard(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("基準 ID が必要です。");

  await prisma.jgaapStandard.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/standards");
  redirect("/standards");
}

export default async function StandardDetailPage({ params }: { params: { id: string } }) {
  const standard = await prisma.jgaapStandard.findUnique({
    where: { id: params.id },
    include: { paragraphs: { orderBy: { orderIndex: "asc" } } }
  });

  if (!standard) notFound();

  const obligationIssues = countParagraphObligationIssues(standard.paragraphs);
  const obligationWarningParagraphIds = new Set(obligationIssues.map((issue) => issue.paragraphId));
  const kindLabel =
    JGAAP_DOCUMENT_KIND_LABELS[standard.documentKind as JgaapDocumentKind] ?? standard.documentKind;

  return (
    <div className="space-y-4 max-w-7xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">{standard.standardId}</h1>
          <p className="page-subtitle">
            {standard.documentNumberJa ? `${standard.documentNumberJa} ` : ""}
            {standard.titleJa} · {kindLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/standards/new" className="primary-button">
            再取込 / 追加
          </Link>
          <Link href="/standards" className="secondary-button">
            一覧へ
          </Link>
        </div>
      </header>

      <section className="card space-y-2 text-sm">
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
          <div>項数: {standard.paragraphCount}</div>
          <div>
            最終取込:{" "}
            {standard.lastIngestedAt
              ? standard.lastIngestedAt.toLocaleString("ja-JP")
              : "—"}
          </div>
          {standard.sourceUrl ? (
            <div className="sm:col-span-2">
              出典:{" "}
              <a href={standard.sourceUrl} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                {standard.sourceUrl}
              </a>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">{standard.licenseNote}</p>
        <form action={deleteStandard}>
          <input type="hidden" name="id" value={standard.id} />
          <button type="submit" className="secondary-button text-xs text-red-700">
            この基準を削除
          </button>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">項一覧</h2>
        <ParagraphTableClient
          initialParagraphs={standard.paragraphs.map((p) => ({
            id: p.id,
            paragraphId: p.paragraphId,
            kind: p.kind,
            quoteJa: p.quoteJa,
            sectionPathJa: p.sectionPathJa,
            obligationLevel: p.obligationLevel,
            notesJa: p.notesJa,
            reviewStatus: p.reviewStatus,
            editedManually: p.editedManually,
            orderIndex: p.orderIndex
          }))}
          obligationWarningParagraphIds={obligationWarningParagraphIds}
        />
      </section>
    </div>
  );
}
