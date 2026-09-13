import { MarketHistory } from "@/components/MarketHistory";

export const dynamic = "force-dynamic";

export default function FxHistoryPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <MarketHistory market="fx" searchParams={searchParams} />;
}
