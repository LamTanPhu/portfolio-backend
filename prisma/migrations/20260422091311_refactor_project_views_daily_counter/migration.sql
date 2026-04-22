/*
  Warnings:

  - You are about to drop the column `viewed_at` on the `project_views` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[project_id,date]` on the table `project_views` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `project_views` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `project_views` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "project_views_viewed_at_idx";

-- AlterTable
ALTER TABLE "project_views" DROP COLUMN "viewed_at",
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "project_views_date_idx" ON "project_views"("date");

-- CreateIndex
CREATE UNIQUE INDEX "project_views_project_id_date_key" ON "project_views"("project_id", "date");
