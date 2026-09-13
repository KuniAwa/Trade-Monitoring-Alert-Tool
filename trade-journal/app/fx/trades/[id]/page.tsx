import { MarketTradeDetail } from "@/components/MarketTradeDetail";

export const dynamic = "force-dynamic";

export default function FxTradeDetailPage({ params }: { params: { id: string } }) {
  return <MarketTradeDetail market="fx" id={params.id} />;
}
