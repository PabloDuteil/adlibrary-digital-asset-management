-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('STATIC', 'VIDEO', 'MOTION', 'CARROUSEL', 'UGC');

-- CreateEnum
CREATE TYPE "AssetSource" AS ENUM ('FIGMA', 'UPLOAD', 'DRIVE_IMPORT', 'SHEET_IMPORT');

-- CreateEnum
CREATE TYPE "AdFormat" AS ENUM ('R1x1', 'R4x5', 'R9x16', 'R1_91x1', 'OTHER');

-- CreateEnum
CREATE TYPE "NameStatus" AS ENUM ('CONFORMING', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('BATCH', 'FORMAT', 'AWARENESS', 'ANGLE', 'VALUE_PROP', 'FEATURE', 'TONE', 'SEGMENT', 'PERSONA', 'CONCEPT', 'HOOK', 'CONCEPT_VAR', 'MARKET');

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "type" "AdType" NOT NULL,
    "source" "AssetSource" NOT NULL,
    "figmaFileKey" TEXT,
    "figmaNodeId" TEXT,
    "thumbnailUrl" TEXT,
    "sourceUrl" TEXT,
    "name" TEXT NOT NULL,
    "nameStatus" "NameStatus" NOT NULL DEFAULT 'CONFORMING',
    "nameIssues" TEXT[],
    "awareness" TEXT,
    "angle" TEXT,
    "valueProp" TEXT,
    "feature" TEXT,
    "tone" TEXT,
    "segment" TEXT,
    "persona" TEXT,
    "conceptCode" TEXT,
    "hook" TEXT,
    "conceptVars" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variation" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "format" "AdFormat" NOT NULL,
    "rawFormat" TEXT,
    "figmaNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Variation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localization" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Localization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetFile" (
    "id" TEXT NOT NULL,
    "localizationId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationS" DOUBLE PRECISION,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionStatus" (
    "conceptId" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false,
    "metaAt" TIMESTAMP(3),
    "metaBy" TEXT,
    "linkedin" BOOLEAN NOT NULL DEFAULT false,
    "linkedinAt" TIMESTAMP(3),
    "linkedinBy" TEXT,
    "google" BOOLEAN NOT NULL DEFAULT false,
    "googleAt" TIMESTAMP(3),
    "googleBy" TEXT,

    CONSTRAINT "DistributionStatus_pkey" PRIMARY KEY ("conceptId")
);

-- CreateTable
CREATE TABLE "NomenclatureTerm" (
    "id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "prefix" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "NomenclatureTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Concept_name_key" ON "Concept"("name");

-- CreateIndex
CREATE INDEX "Concept_batch_idx" ON "Concept"("batch");

-- CreateIndex
CREATE INDEX "Concept_type_idx" ON "Concept"("type");

-- CreateIndex
CREATE INDEX "Concept_createdAt_idx" ON "Concept"("createdAt");

-- CreateIndex
CREATE INDEX "Variation_format_idx" ON "Variation"("format");

-- CreateIndex
CREATE UNIQUE INDEX "Variation_conceptId_format_rawFormat_key" ON "Variation"("conceptId", "format", "rawFormat");

-- CreateIndex
CREATE INDEX "Localization_market_idx" ON "Localization"("market");

-- CreateIndex
CREATE UNIQUE INDEX "Localization_variationId_market_language_key" ON "Localization"("variationId", "market", "language");

-- CreateIndex
CREATE INDEX "AssetFile_createdAt_idx" ON "AssetFile"("createdAt");

-- CreateIndex
CREATE INDEX "NomenclatureTerm_dimension_idx" ON "NomenclatureTerm"("dimension");

-- CreateIndex
CREATE UNIQUE INDEX "NomenclatureTerm_dimension_value_key" ON "NomenclatureTerm"("dimension", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Target_quarter_metric_key" ON "Target"("quarter", "metric");

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Localization" ADD CONSTRAINT "Localization_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFile" ADD CONSTRAINT "AssetFile_localizationId_fkey" FOREIGN KEY ("localizationId") REFERENCES "Localization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionStatus" ADD CONSTRAINT "DistributionStatus_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
