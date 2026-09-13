import { MarketHistory } from "@/components/MarketHistory";

export const dynamic = "force-dynamic";

export default function NikkeiHistoryPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <MarketHistory market="nikkei" searchParams={searchParams} />;
}
