/*
  Warnings:

  - Added the required column `type` to the `EdgeDevices` table without a default value. This is not possible if the table is not empty.
  - Made the column `location` on table `EdgeDevices` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EdgeDevices" ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "location" SET NOT NULL;
