export type MarketKind = "nikkei" | "fx";

export const NIKKEI_YAHOO_DEFAULT = "NIY=F";

export const FX_PAIRS = [
  { id: "USDJPY", label: "USD/JPY", yahoo: "JPY=X", alert: "USD/JPY" },
  { id: "EURJPY", label: "EUR/JPY", yahoo: "EURJPY=X", alert: "EUR/JPY" },
  { id: "AUDJPY", label: "AUD/JPY", yahoo: "AUDJPY=X", alert: "AUD/JPY" }
] as const;

export type FxPairId = (typeof FX_PAIRS)[number]["id"];

export function parseMarket(value: unknown): MarketKind {
  return value === "fx" ? "fx" : "nikkei";
}

export function marketBasePath(market: MarketKind): string {
  return market === "fx" ? "/fx" : "/nikkei";
}

export function marketLabel(market: MarketKind): string {
  return market === "fx" ? "FX" : "日経225";
}

export function defaultSymbol(market: MarketKind): string {
  return market === "fx" ? FX_PAIRS[0].yahoo : NIKKEI_YAHOO_DEFAULT;
}

export function priceDecimals(market: MarketKind): number {
  return market === "fx" ? 3 : 1;
}

export function fxPairByYahoo(symbol: string) {
  return FX_PAIRS.find((p) => p.yahoo === symbol) ?? null;
}

export function fxPairById(id: string) {
  return FX_PAIRS.find((p) => p.id === id) ?? null;
}

export function displaySymbol(market: MarketKind, symbol: string): string {
  if (market === "fx") return fxPairByYahoo(symbol)?.label ?? symbol;
  return symbol === "^N225" ? "日経225" : "日経225先物";
}

export function isFxYahooSymbol(symbol: string): boolean {
  return FX_PAIRS.some((p) => p.yahoo === symbol);
}
