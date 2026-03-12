-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DISABLED', 'ERROR');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('ABUSE', 'ASSAULT', 'FIGHTING');

-- CreateEnum
CREATE TYPE "PreferenceType" AS ENUM ('SYSTEM_DEFAULT', 'USER_PREFERENCE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EMAIL', 'WHATSAPP', 'TELEGRAM');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "wa_number" TEXT,
    "telegram_username" TEXT,
    "profile_picture" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshTokens" (
    "id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "video_retention_days" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdgeDevices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "max_cameras" INTEGER NOT NULL DEFAULT 1,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "error_message" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdgeDevices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cameras" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "cv_treshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "error_message" JSONB,
    "edge_device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CctvLayoutDetails" (
    "id" TEXT NOT NULL,
    "layout_page_id" TEXT NOT NULL,
    "layout_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CctvLayoutDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CctvLayoutPages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "preference" "PreferenceType" NOT NULL DEFAULT 'SYSTEM_DEFAULT',
    "page" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CctvLayoutPages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectedAnomalies" (
    "id" TEXT NOT NULL,
    "camera_id" TEXT,
    "video_path" TEXT NOT NULL,
    "video_duration" INTEGER,
    "video_start_date" TIMESTAMP(3),
    "video_end_date" TIMESTAMP(3),
    "anomaly_type" "AnomalyType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "is_valid" BOOLEAN,
    "is_reported" BOOLEAN NOT NULL DEFAULT false,
    "report_sent" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectedAnomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportPlatforms" (
    "id" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "platform_name" TEXT NOT NULL,
    "platform_slug" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportPlatforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaSentDetails" (
    "id" TEXT NOT NULL,
    "wa_api_token" TEXT NOT NULL,
    "wa_number_id" TEXT NOT NULL,
    "report_platform_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaSentDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaReceivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wa_number" TEXT NOT NULL,
    "wa_sent_detail_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_activated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaReceivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSentDetails" (
    "id" TEXT NOT NULL,
    "email_cred_username" TEXT NOT NULL,
    "email_cred_password" TEXT NOT NULL,
    "email_sender_name" TEXT NOT NULL,
    "email_sender_address" TEXT NOT NULL,
    "report_platform_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSentDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailReceivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_sent_detail_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_activated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailReceivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSentDetails" (
    "id" TEXT NOT NULL,
    "telegram_username" TEXT NOT NULL,
    "telegram_api_token" TEXT NOT NULL,
    "report_platform_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSentDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramReceivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "telegram_sent_detail_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_activated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramReceivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CamerasToCctvLayoutDetails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CamerasToCctvLayoutDetails_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshTokens_refresh_token_key" ON "RefreshTokens"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "EdgeDevices_slug_key" ON "EdgeDevices"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Cameras_slug_key" ON "Cameras"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CctvLayoutDetails_layout_page_id_key" ON "CctvLayoutDetails"("layout_page_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReportPlatforms_platform_slug_key" ON "ReportPlatforms"("platform_slug");

-- CreateIndex
CREATE UNIQUE INDEX "WaSentDetails_report_platform_id_key" ON "WaSentDetails"("report_platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "WaReceivers_wa_number_wa_sent_detail_id_key" ON "WaReceivers"("wa_number", "wa_sent_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSentDetails_email_cred_username_key" ON "EmailSentDetails"("email_cred_username");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSentDetails_email_sender_address_key" ON "EmailSentDetails"("email_sender_address");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSentDetails_report_platform_id_key" ON "EmailSentDetails"("report_platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailReceivers_email_email_sent_detail_id_key" ON "EmailReceivers"("email", "email_sent_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSentDetails_report_platform_id_key" ON "TelegramSentDetails"("report_platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramReceivers_telegram_chat_id_telegram_sent_detail_id_key" ON "TelegramReceivers"("telegram_chat_id", "telegram_sent_detail_id");

-- CreateIndex
CREATE INDEX "_CamerasToCctvLayoutDetails_B_index" ON "_CamerasToCctvLayoutDetails"("B");

-- AddForeignKey
ALTER TABLE "RefreshTokens" ADD CONSTRAINT "RefreshTokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cameras" ADD CONSTRAINT "Cameras_edge_device_id_fkey" FOREIGN KEY ("edge_device_id") REFERENCES "EdgeDevices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CctvLayoutDetails" ADD CONSTRAINT "CctvLayoutDetails_layout_page_id_fkey" FOREIGN KEY ("layout_page_id") REFERENCES "CctvLayoutPages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CctvLayoutPages" ADD CONSTRAINT "CctvLayoutPages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedAnomalies" ADD CONSTRAINT "DetectedAnomalies_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "Cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaSentDetails" ADD CONSTRAINT "WaSentDetails_report_platform_id_fkey" FOREIGN KEY ("report_platform_id") REFERENCES "ReportPlatforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaReceivers" ADD CONSTRAINT "WaReceivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaReceivers" ADD CONSTRAINT "WaReceivers_wa_sent_detail_id_fkey" FOREIGN KEY ("wa_sent_detail_id") REFERENCES "WaSentDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSentDetails" ADD CONSTRAINT "EmailSentDetails_report_platform_id_fkey" FOREIGN KEY ("report_platform_id") REFERENCES "ReportPlatforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailReceivers" ADD CONSTRAINT "EmailReceivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailReceivers" ADD CONSTRAINT "EmailReceivers_email_sent_detail_id_fkey" FOREIGN KEY ("email_sent_detail_id") REFERENCES "EmailSentDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramSentDetails" ADD CONSTRAINT "TelegramSentDetails_report_platform_id_fkey" FOREIGN KEY ("report_platform_id") REFERENCES "ReportPlatforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramReceivers" ADD CONSTRAINT "TelegramReceivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramReceivers" ADD CONSTRAINT "TelegramReceivers_telegram_sent_detail_id_fkey" FOREIGN KEY ("telegram_sent_detail_id") REFERENCES "TelegramSentDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CamerasToCctvLayoutDetails" ADD CONSTRAINT "_CamerasToCctvLayoutDetails_A_fkey" FOREIGN KEY ("A") REFERENCES "Cameras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CamerasToCctvLayoutDetails" ADD CONSTRAINT "_CamerasToCctvLayoutDetails_B_fkey" FOREIGN KEY ("B") REFERENCES "CctvLayoutDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
