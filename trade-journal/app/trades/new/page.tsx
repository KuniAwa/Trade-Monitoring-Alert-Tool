import { TradeForm } from "@/components/TradeForm";

export default function NewTradePage() {
  return (
    <TradeForm
      mode="create"
      initial={{
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
