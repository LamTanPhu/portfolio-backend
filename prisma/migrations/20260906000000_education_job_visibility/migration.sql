-- AlterTable
ALTER TABLE "educations" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "educations_is_public_idx" ON "educations"("is_public");

-- CreateIndex
CREATE INDEX "jobs_is_public_idx" ON "jobs"("is_public");
