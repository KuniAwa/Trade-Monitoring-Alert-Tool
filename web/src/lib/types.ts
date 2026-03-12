export type AccountingStandard = "JGAAP" | "IFRS" | "BOTH";

export type FeedbackRating = "ADEQUATE" | "INSUFFICIENT" | "INCORRECT" | "RECONSIDER";

export interface DraftAnswerStructured {
  issue: string;
  additionalFacts: string[];
  options: {
    id: "A" | "B" | "C" | string;
    title: string;
    description?: string;
    conditions: string[];
    advantages: string[];
    disadvantages: string[];
  }[];
  recommendation: {
    optionId: string;
    rationale: string;
    assumptions: string[];
  };
  journalEntries: {
    description: string;
    debit: string;
    credit: string;
    amountExample?: string;
  }[];
  references: string[];
  uncertainties: string[];
}

