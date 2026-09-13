import { redirect } from "next/navigation";

export default function LegacyNewTradePage() {
  redirect("/nikkei/trades/new");
}
