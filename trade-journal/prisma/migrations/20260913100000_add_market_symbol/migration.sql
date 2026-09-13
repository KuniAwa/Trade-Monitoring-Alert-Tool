-- AlterTable
ALTER TABLE "Signal" ADD COLUMN "market" TEXT NOT NULL DEFAULT 'nikkei';
ALTER TABLE "Signal" ADD COLUMN "symbol" TEXT NOT NULL DEFAULT 'NIY=F';

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "market" TEXT NOT NULL DEFAULT 'nikkei';
ALTER TABLE "Trade" ADD COLUMN "symbol" TEXT NOT NULL DEFAULT 'NIY=F';

-- CreateIndex
CREATE INDEX "Signal_market_barTime_idx" ON "Signal"("market", "barTime");
CREATE INDEX "Signal_market_symbol_barTime_idx" ON "Signal"("market", "symbol", "barTime");
CREATE INDEX "Trade_market_entryAt_idx" ON "Trade"("market", "entryAt");
