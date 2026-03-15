-- CreateTable
CREATE TABLE "SummaryLibrary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "topicLabel" TEXT,
    "framework" TEXT NOT NULL DEFAULT 'JGAAP',
    "content" TEXT NOT NULL,
    "sourceLinks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CaseSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topicLabel" TEXT,
    "framework" TEXT NOT NULL DEFAULT 'JGAAP',
    "content" TEXT NOT NULL,
    "sourceLinks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseSummary_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseSummary_caseId_key" ON "CaseSummary"("caseId");
