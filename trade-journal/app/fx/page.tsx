import { MarketHome } from "@/components/MarketHome";

export const dynamic = "force-dynamic";

export default function FxHomePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <MarketHome market="fx" searchParams={searchParams} />;
}
