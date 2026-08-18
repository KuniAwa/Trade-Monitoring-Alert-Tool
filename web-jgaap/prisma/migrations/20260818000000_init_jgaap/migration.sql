-- CreateTable
CREATE TABLE "JgaapStandard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standardId" TEXT NOT NULL,
    "titleJa" TEXT NOT NULL,
    "documentKind" TEXT NOT NULL DEFAULT 'STANDARD',
    "documentNumberJa" TEXT NOT NULL DEFAULT '',
    "effectiveDate" TEXT,
    "sourceUrl" TEXT,
    "outlineJson" TEXT NOT NULL DEFAULT '[]',
    "licenseNote" TEXT NOT NULL DEFAULT '公益財団法人 財務会計基準機構（FASF）／企業会計基準委員会（ASBJ）の基準。個人利用・引用は利用条件に従う。',
    "ingestSource" TEXT NOT NULL DEFAULT 'HTML',
    "lastIngestedAt" TIMESTAMP,
    "paragraphCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "JgaapParagraph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standardId" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quoteJa" TEXT NOT NULL,
    "sectionPathJa" TEXT NOT NULL DEFAULT '',
    "obligationLevel" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED',
    "reviewedAt" TIMESTAMP,
    "reviewedNoteJa" TEXT NOT NULL DEFAULT '',
    "notesJa" TEXT NOT NULL DEFAULT '',
    "editedManually" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "JgaapParagraph_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "JgaapStandard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JgaapCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'JUDGMENT',
    "title" TEXT NOT NULL,
    "topicLabel" TEXT,
    "transactionSummaryJa" TEXT NOT NULL,
    "initialQuestionJa" TEXT NOT NULL,
    "notesJa" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "JgaapStandardLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JgaapStandardLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "JgaapCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JgaapCaseStandard" (
    "caseId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,

    PRIMARY KEY ("caseId", "standardId"),
    CONSTRAINT "JgaapCaseStandard_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "JgaapCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JgaapCaseStandard_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "JgaapStandard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JgaapSearchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JgaapSearchResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "JgaapCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JgaapConversationTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "mode" TEXT NOT NULL DEFAULT 'FOLLOWUP_QUESTION',
    "contentJa" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JgaapConversationTurn_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "JgaapCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JgaapDraftAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'JUDGMENT',
    "structuredAnswerJson" TEXT NOT NULL,
    "summaryJa" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JgaapDraftAnswer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "JgaapCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JgaapFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "draftId" TEXT,
    "rating" TEXT NOT NULL DEFAULT 'ADEQUATE',
    "commentJa" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JgaapFeedback_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "JgaapCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JgaapFeedback_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "JgaapDraftAnswer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JgaapStandard_standardId_key" ON "JgaapStandard"("standardId");

-- CreateIndex
CREATE UNIQUE INDEX "JgaapParagraph_standardId_paragraphId_key" ON "JgaapParagraph"("standardId", "paragraphId");
