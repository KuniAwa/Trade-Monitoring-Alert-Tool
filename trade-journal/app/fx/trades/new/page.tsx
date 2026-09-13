import { TradeForm } from "@/components/TradeForm";
import { FX_PAIRS } from "@/lib/markets";

export default function NewFxTradePage() {
  return (
    <TradeForm
      mode="create"
      initial={{
        market: "fx",
        symbol: FX_PAIRS[0].yahoo,
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
