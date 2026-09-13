import { redirect } from "next/navigation";

export default function LegacyTradeDetailPage({ params }: { params: { id: string } }) {
  redirect(`/nikkei/trades/${params.id}`);
}
