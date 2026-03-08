-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "breakdownJson" TEXT;
ALTER TABLE "Listing" ADD COLUMN "flagsJson" TEXT;

-- AlterTable
ALTER TABLE "SellerVerificationSubmission" ADD COLUMN "aiAnalysis" TEXT;
ALTER TABLE "SellerVerificationSubmission" ADD COLUMN "aiConfidence" INTEGER;
