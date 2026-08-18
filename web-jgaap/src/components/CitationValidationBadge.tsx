import type { CitationValidationResult } from "@/lib/jgaapCitationValidation";

const STATUS_CONFIG: Record<
  CitationValidationResult["status"],
  { label: string; className: string }
> = {
  verified: {
    label: "一致",
    className: "bg-blue-50 text-blue-800 ring-blue-200"
  },
  verified_subclause: {
    label: "項内一致",
    className: "bg-blue-50 text-blue-800 ring-blue-200"
  },
  mismatch: {
    label: "不一致",
    className: "bg-red-50 text-red-800 ring-red-200"
  },
  not_found: {
    label: "未登録",
    className: "bg-red-50 text-red-900 ring-red-300"
  },
  non_normative: {
    label: "非規範",
    className: "bg-red-50 text-red-900 ring-red-300"
  },
  kind_mismatch: {
    label: "区分不一致",
    className: "bg-amber-50 text-amber-900 ring-amber-200"
  }
};

export function CitationValidationBadge({
  result,
  anchorId
}: {
  result?: CitationValidationResult;
  anchorId: string;
}) {
  if (!result) return null;

  const cfg = STATUS_CONFIG[result.status];
  return (
    <span
      id={anchorId}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cfg.className}`}
      title={result.messageJa}
    >
      {cfg.label}
    </span>
  );
}
