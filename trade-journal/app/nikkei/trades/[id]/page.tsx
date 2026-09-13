import { MarketTradeDetail } from "@/components/MarketTradeDetail";

export const dynamic = "force-dynamic";

export default function NikkeiTradeDetailPage({ params }: { params: { id: string } }) {
  return <MarketTradeDetail market="nikkei" id={params.id} />;
}
