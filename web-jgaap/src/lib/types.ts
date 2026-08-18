export const MAX_HTML_UPLOAD_BYTES = 4 * 1024 * 1024;

export type JgaapDocumentKind = "STANDARD" | "GUIDANCE";

export type JgaapParagraphKind = "BODY" | "GUIDANCE" | "BACKGROUND" | "EXAMPLE";

export const ALL_PARAGRAPH_KINDS: JgaapParagraphKind[] = [
  "BODY",
  "GUIDANCE",
  "BACKGROUND",
  "EXAMPLE"
];

export type JgaapObligationLevel = "MUST" | "SHOULD" | "MAY" | "EXPLANATORY";

export type JgaapReviewStatus = "UNREVIEWED" | "HUMAN_REVIEWED";

export const JGAAP_REVIEW_STATUS_LABELS: Record<JgaapReviewStatus, string> = {
  UNREVIEWED: "未レビュー",
  HUMAN_REVIEWED: "人手レビュー済"
};

export const JGAAP_DOCUMENT_KIND_LABELS: Record<JgaapDocumentKind, string> = {
  STANDARD: "会計基準",
  GUIDANCE: "適用指針"
};

export const JGAAP_PARAGRAPH_KIND_LABELS: Record<JgaapParagraphKind, string> = {
  BODY: "本文",
  GUIDANCE: "適用指針",
  BACKGROUND: "結論の背景",
  EXAMPLE: "設例"
};

export const JGAAP_OBLIGATION_LEVEL_LABELS: Record<JgaapObligationLevel, string> = {
  MUST: "必須",
  SHOULD: "推奨",
  MAY: "任意",
  EXPLANATORY: "説明"
};

export type JgaapFeedbackRating = "ADEQUATE" | "INSUFFICIENT" | "INCORRECT" | "RECONSIDER";

export const JGAAP_FEEDBACK_RATING_LABELS: Record<JgaapFeedbackRating, string> = {
  ADEQUATE: "妥当",
  INSUFFICIENT: "不十分",
  INCORRECT: "誤り",
  RECONSIDER: "再検討"
};

export const NON_NORMATIVE_PARAGRAPH_KINDS: JgaapParagraphKind[] = ["BACKGROUND", "EXAMPLE"];

export type SegmentedJgaapParagraph = {
  paragraphId: string;
  kind: JgaapParagraphKind;
  quoteJa: string;
  sectionPathJa: string;
  obligationLevel: JgaapObligationLevel;
  orderIndex: number;
};

export type JgaapOutlineHeading = {
  id: string;
  titleJa: string;
  level: number;
  parentId: string | null;
};

export interface JgaapCitation {
  standardId: string;
  paragraphId: string;
  kind: JgaapParagraphKind;
  quoteJa: string;
}

export interface JgaapDraftAnswerStructured {
  issueJa: string;
  judgmentCriteriaJa: string[];
  confirmedFactsJa: string[];
  options: {
    id: string;
    titleJa: string;
    descriptionJa?: string;
    conditionsJa: string[];
    advantagesJa: string[];
    disadvantagesJa: string[];
  }[];
  recommendation: {
    optionId?: string;
    titleJa?: string;
    rationaleJa: string;
    assumptionsJa: string[];
    reasoningSteps: {
      stepJa: string;
      explanationJa: string;
      citations: JgaapCitation[];
    }[];
  };
  journalEntries: {
    descriptionJa: string;
    debitJa: string;
    creditJa: string;
    amountExampleJa?: string;
  }[];
  references: string[];
  uncertaintiesJa: string[];
}
