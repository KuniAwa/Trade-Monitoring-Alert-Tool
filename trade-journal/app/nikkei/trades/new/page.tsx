import { TradeForm } from "@/components/TradeForm";

export default function NewNikkeiTradePage() {
  return (
    <TradeForm
      mode="create"
      initial={{
        market: "nikkei",
        symbol: "NIY=F",
        direction: "long",
        entryPrice: "",
        quantity: "1",
        stopPrice: "",
        takeProfit: "",
        exitPrice: "",
        reason: "",
        emotion: "",
        note: "",
        isVirtual: false
      }}
    />
  );
}
