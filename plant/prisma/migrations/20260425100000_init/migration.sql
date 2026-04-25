-- CreateTable
CREATE TABLE "Identification" (
    "id" TEXT NOT NULL,
    "capturedMonth" INTEGER,
    "location" TEXT,
    "habitat" TEXT,
    "userNote" TEXT,
    "organ" TEXT,
    "plantNetProject" TEXT NOT NULL DEFAULT 'k-world-flora',
    "thumbnailBase64" TEXT,
    "plantNetRawJson" TEXT,
    "selectedCandidateId" TEXT,
    "finalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "identificationId" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "family" TEXT,
    "commonNameJa" TEXT,
    "description" TEXT,
    "plantNetScore" DOUBLE PRECISION NOT NULL,
    "rerankScore" DOUBLE PRECISION,
    "rerankReason" TEXT,
    "rank" INTEGER NOT NULL,
    "plantNetSpeciesJson" TEXT,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Identification_createdAt_idx" ON "Identification"("createdAt");

-- CreateIndex
CREATE INDEX "Candidate_identificationId_idx" ON "Candidate"("identificationId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_identificationId_fkey" FOREIGN KEY ("identificationId") REFERENCES "Identification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
