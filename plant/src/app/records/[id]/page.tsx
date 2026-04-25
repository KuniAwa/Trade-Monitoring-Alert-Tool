import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecordDetailClient } from "@/components/RecordDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: { id: string } };

function fmtDate(d: Date) {
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function RecordDetailPage({ params }: Props) {
  const rec = await prisma.identification.findUnique({
    where: { id: params.id },
    include: { candidates: { orderBy: { rank: "asc" } } }
  });
  if (!rec) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/records" className="text-sm text-forest-800/50 underline">
          ← 履歴へ
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-forest-800">識別結果</h2>
        <p className="text-xs text-forest-800/50">{fmtDate(rec.createdAt)}</p>
        <div className="mt-2 space-y-0.5 text-sm text-forest-800/70">
          {rec.capturedMonth != null && <p>撮影月: {rec.capturedMonth} 月</p>}
          {rec.location && <p>場所: {rec.location}</p>}
          {rec.habitat && <p>環境: {rec.habitat}</p>}
          {rec.userNote && <p>メモ: {rec.userNote}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {rec.candidates.map((c, i) => (
          <article
            key={c.id}
            className="rounded-xl border border-forest-800/10 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-forest-800/50">候補 {i + 1}</p>
            {c.commonNameJa && <h3 className="text-lg font-semibold text-forest-800">{c.commonNameJa}</h3>}
            <p className="font-mono text-sm text-forest-800/80">{c.scientificName}</p>
            {c.family && <p className="text-sm text-forest-800/60">科: {c.family}</p>}
            <p className="mt-1 text-xs text-forest-800/50">
              Pl@ntNet: {c.plantNetScore.toFixed(3)}
              {c.rerankScore != null && (
                <>
                  {" "}
                  / 再ランク: {c.rerankScore.toFixed(3)}
                </>
              )}
            </p>
            {c.rerankReason && (
              <p className="mt-1 text-sm text-forest-800/70">補根拠: {c.rerankReason}</p>
            )}
            {c.description && <p className="mt-2 text-sm leading-relaxed text-forest-800/90">{c.description}</p>}
          </article>
        ))}
      </div>

      <RecordDetailClient
        identificationId={rec.id}
        initialSelectedId={rec.selectedCandidateId}
        initialFinalNote={rec.finalNote}
        candidates={rec.candidates.map((c) => ({
          id: c.id,
          scientificName: c.scientificName,
          family: c.family,
          commonNameJa: c.commonNameJa,
          description: c.description,
          plantNetScore: c.plantNetScore,
          rerankScore: c.rerankScore,
          rerankReason: c.rerankReason,
          rank: c.rank
        }))}
      />
    </div>
  );
}
