import { redirect } from "next/navigation";

export default function LegacyEditTradePage({ params }: { params: { id: string } }) {
  redirect(`/nikkei/trades/${params.id}/edit`);
}
