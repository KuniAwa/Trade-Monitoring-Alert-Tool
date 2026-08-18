import type { JgaapObligationLevel } from "@/lib/types";

const MUST_PATTERN = /しなければならない|するものとする/;
const SHOULD_PATTERN = /すべきである|することが適当である|望ましい/;
const MAY_PATTERN = /してもよい|することができる|することが可能/;

export function inferObligationFromQuote(quoteJa: string): JgaapObligationLevel | null {
  const text = quoteJa.trim();
  if (!text) return null;
  if (MUST_PATTERN.test(text)) return "MUST";
  if (SHOULD_PATTERN.test(text)) return "SHOULD";
  if (MAY_PATTERN.test(text)) return "MAY";
  return "EXPLANATORY";
}

export type ObligationCheckResult = {
  consistent: boolean;
  level: "WARN" | "INFO";
  messageJa: string;
  inferred: JgaapObligationLevel | null;
  stored: JgaapObligationLevel;
};

export function checkObligationConsistency(
  quoteJa: string,
  obligationLevel: JgaapObligationLevel
): ObligationCheckResult {
  const inferred = inferObligationFromQuote(quoteJa);
  if (!inferred) {
    return {
      consistent: true,
      level: "INFO",
      messageJa: "本文から義務レベルを判定できませんでした。",
      inferred: null,
      stored: obligationLevel
    };
  }
  if (inferred === obligationLevel) {
    return {
      consistent: true,
      level: "INFO",
      messageJa: `義務レベル（${obligationLevel}）と本文の表現は一致しています。`,
      inferred,
      stored: obligationLevel
    };
  }
  return {
    consistent: false,
    level: "WARN",
    messageJa: `本文は ${inferred} 相当ですが、段落は ${obligationLevel} として登録されています。`,
    inferred,
    stored: obligationLevel
  };
}
