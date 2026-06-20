-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "barTime" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'scan',
    "alertDir" TEXT,
    "close" DOUBLE PRECISION NOT NULL,
    "prevHigh" DOUBLE PRECISION,
    "prevLow" DOUBLE PRECISION,
    "ma20" DOUBLE PRECISION,
    "atr15" DOUBLE PRECISION,
    "longThreshold" DOUBLE PRECISION,
    "shortThreshold" DOUBLE PRECISION,
    "close1h" DOUBLE PRECISION,
    "ema20_1h" DOUBLE PRECISION,
    "ema50_1h" DOUBLE PRECISION,
    "trendUp" BOOLEAN NOT NULL DEFAULT false,
    "trendDown" BOOLEAN NOT NULL DEFAULT false,
    "oshiritsuLong" DOUBLE PRECISION,
    "oshiritsuShort" DOUBLE PRECISION,
    "volumeRatio" DOUBLE PRECISION,
    "featuresJson" JSONB,
    "ohlc15Json" JSONB,
    "outcomeJson" JSONB,
    "pruned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL,
    "exitAt" TIMESTAMP(3),
    "direction" TEXT NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "stopPrice" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION,
    "rMultiple" DOUBLE PRECISION,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "emotion" TEXT,
    "note" TEXT,
    "signalId" TEXT,
    "aiReviewJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_barTime_idx" ON "Signal"("barTime");

-- CreateIndex
CREATE INDEX "Signal_source_idx" ON "Signal"("source");

-- CreateIndex
CREATE INDEX "Signal_alertDir_idx" ON "Signal"("alertDir");

-- CreateIndex
CREATE INDEX "Trade_entryAt_idx" ON "Trade"("entryAt");

-- CreateIndex
CREATE INDEX "Trade_isVirtual_idx" ON "Trade"("isVirtual");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
