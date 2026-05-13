/*
  Warnings:

  - The values [ABUSE] on the enum `AnomalyType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `source` to the `Cameras` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_type` to the `Cameras` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CameraSourceType" AS ENUM ('LOCAL', 'STATIC_FILE', 'RTSP_LINK');

-- AlterEnum
BEGIN;
CREATE TYPE "AnomalyType_new" AS ENUM ('ASSAULT', 'FIGHTING', 'ROBBERY', 'SHOOTING');
ALTER TABLE "DetectedAnomalies" ALTER COLUMN "anomaly_type" TYPE "AnomalyType_new" USING ("anomaly_type"::text::"AnomalyType_new");
ALTER TYPE "AnomalyType" RENAME TO "AnomalyType_old";
ALTER TYPE "AnomalyType_new" RENAME TO "AnomalyType";
DROP TYPE "public"."AnomalyType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Cameras" ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "source_type" "CameraSourceType" NOT NULL;
