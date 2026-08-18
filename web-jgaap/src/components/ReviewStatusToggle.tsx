"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { JGAAP_REVIEW_STATUS_LABELS, type JgaapReviewStatus } from "@/lib/types";

export function ReviewStatusToggle({
  paragraphId,
  initialStatus
}: {
  paragraphId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<JgaapReviewStatus>(
    initialStatus === "HUMAN_REVIEWED" ? "HUMAN_REVIEWED" : "UNREVIEWED"
  );
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next: JgaapReviewStatus = status === "HUMAN_REVIEWED" ? "UNREVIEWED" : "HUMAN_REVIEWED";
    setBusy(true);
    try {
      const res = await fetch(`/api/paragraphs/${paragraphId}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: next })
      });
      const data = (await res.json()) as { error?: string; reviewStatus?: string };
      if (!res.ok) {
        alert(data.error ?? "レビュー状態の更新に失敗しました。");
        setBusy(false);
        return;
      }
      const updated: JgaapReviewStatus =
        data.reviewStatus === "HUMAN_REVIEWED" ? "HUMAN_REVIEWED" : "UNREVIEWED";
      setStatus(updated);
      router.refresh();
    } catch {
      alert("レビュー状態の更新に失敗しました。");
    }
    setBusy(false);
  }

  const reviewed = status === "HUMAN_REVIEWED";

  return (
    <button
      type="button"
      onClick={() => toggle()}
      disabled={busy}
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset transition-colors disabled:opacity-50 ${
        reviewed
          ? "bg-blue-50 text-blue-800 ring-blue-200 hover:bg-blue-100"
          : "bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100"
      }`}
    >
      {JGAAP_REVIEW_STATUS_LABELS[status]}
    </button>
  );
}
