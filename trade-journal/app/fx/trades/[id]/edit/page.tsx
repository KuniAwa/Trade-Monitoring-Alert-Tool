import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeForm } from "@/components/TradeForm";
import { parseMarket } from "@/lib/markets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function numToStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

export default async function EditFxTradePage({ params }: { params: { id: string } }) {
  const trade = await prisma.trade.findUnique({ where: { id: params.id } });
  if (!trade || parseMarket(trade.market) !== "fx") notFound();

  return (
    <div className="space-y-3">
      <Link href={`/fx/trades/${trade.id}`} className="text-xs text-brand">
        ← 詳細へ戻る
      </Link>
      <TradeForm
        mode="edit"
        initial={{
          id: trade.id,
          market: "fx",
          symbol: trade.symbol,
          direction: trade.direction === "short" ? "short" : "long",
          entryAtIso: trade.entryAt.toISOString(),
          entryPrice: numToStr(trade.entryPrice),
          quantity: numToStr(trade.quantity),
          stopPrice: numToStr(trade.stopPrice),
          takeProfit: numToStr(trade.takeProfit),
          exitAtIso: trade.exitAt ? trade.exitAt.toISOString() : null,
          exitPrice: numToStr(trade.exitPrice),
          reason: trade.reason ?? "",
          emotion: trade.emotion ?? "",
          note: trade.note ?? "",
          isVirtual: trade.isVirtual
        }}
      />
    </div>
  );
}
