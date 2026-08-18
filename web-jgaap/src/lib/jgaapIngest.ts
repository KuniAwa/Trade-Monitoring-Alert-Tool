import { parseAsbjHtml } from "@/lib/asbjHtmlParse";
import { prisma } from "@/lib/prisma";
import type { JgaapDocumentKind, JgaapObligationLevel, JgaapParagraphKind } from "@/lib/types";

export type IngestHtmlResult = {
  standard: {
    id: string;
    standardId: string;
    titleJa: string;
    documentKind: string;
    paragraphCount: number;
  };
  warnings: string[];
  headingCount: number;
};

export async function ingestAsbjHtml(opts: {
  html: string;
  sourceUrl?: string | null;
  licenseNote?: string | null;
}): Promise<IngestHtmlResult> {
  const parsed = parseAsbjHtml(opts.html);
  if (parsed.paragraphs.length === 0) {
    throw new Error(parsed.warnings.join(" ") || "項を抽出できませんでした。");
  }

  const outlineJson = JSON.stringify(parsed.headings);

  const standard = await prisma.jgaapStandard.upsert({
    where: { standardId: parsed.standardId },
    create: {
      standardId: parsed.standardId,
      titleJa: parsed.titleJa,
      documentKind: parsed.documentKind,
      documentNumberJa: parsed.documentNumberJa,
      sourceUrl: opts.sourceUrl ?? null,
      outlineJson,
      licenseNote: opts.licenseNote || undefined,
      ingestSource: "HTML",
      lastIngestedAt: new Date(),
      paragraphCount: parsed.paragraphs.length
    },
    update: {
      titleJa: parsed.titleJa,
      documentKind: parsed.documentKind,
      documentNumberJa: parsed.documentNumberJa,
      sourceUrl: opts.sourceUrl ?? undefined,
      outlineJson,
      licenseNote: opts.licenseNote || undefined,
      ingestSource: "HTML",
      lastIngestedAt: new Date(),
      paragraphCount: parsed.paragraphs.length
    }
  });

  const existing = await prisma.jgaapParagraph.findMany({
    where: { standardId: standard.id },
    select: { paragraphId: true, editedManually: true }
  });
  const protectedIds = new Set(
    existing.filter((p) => p.editedManually).map((p) => p.paragraphId)
  );

  await prisma.jgaapParagraph.deleteMany({
    where: {
      standardId: standard.id,
      editedManually: false
    }
  });

  const toCreate = parsed.paragraphs.filter((p) => !protectedIds.has(p.paragraphId));
  if (toCreate.length > 0) {
    await prisma.jgaapParagraph.createMany({
      data: toCreate.map((p) => ({
        standardId: standard.id,
        paragraphId: p.paragraphId,
        kind: p.kind,
        quoteJa: p.quoteJa,
        sectionPathJa: p.sectionPathJa,
        obligationLevel: p.obligationLevel,
        orderIndex: p.orderIndex,
        reviewStatus: "UNREVIEWED"
      }))
    });
  }

  const count = await prisma.jgaapParagraph.count({ where: { standardId: standard.id } });
  const updated = await prisma.jgaapStandard.update({
    where: { id: standard.id },
    data: { paragraphCount: count, lastIngestedAt: new Date() }
  });

  return {
    standard: {
      id: updated.id,
      standardId: updated.standardId,
      titleJa: updated.titleJa,
      documentKind: updated.documentKind as JgaapDocumentKind,
      paragraphCount: updated.paragraphCount
    },
    warnings: parsed.warnings,
    headingCount: parsed.headings.length
  };
}

export async function refreshParagraphCount(standardDbId: string): Promise<void> {
  const count = await prisma.jgaapParagraph.count({ where: { standardId: standardDbId } });
  await prisma.jgaapStandard.update({
    where: { id: standardDbId },
    data: { paragraphCount: count }
  });
}

export const PARAGRAPH_KINDS = new Set<string>(["BODY", "GUIDANCE", "BACKGROUND", "EXAMPLE"]);
export const OBLIGATION_LEVELS = new Set<string>(["MUST", "SHOULD", "MAY", "EXPLANATORY"]);

export function isParagraphKind(v: string): v is JgaapParagraphKind {
  return PARAGRAPH_KINDS.has(v);
}

export function isObligationLevel(v: string): v is JgaapObligationLevel {
  return OBLIGATION_LEVELS.has(v);
}
