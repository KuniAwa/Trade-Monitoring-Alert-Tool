import { MarketHome } from "@/components/MarketHome";

export const dynamic = "force-dynamic";

export default function NikkeiHomePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <MarketHome market="nikkei" searchParams={searchParams} />;
}
