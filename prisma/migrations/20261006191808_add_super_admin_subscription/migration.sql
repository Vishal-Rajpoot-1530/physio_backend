-- AlterTable
ALTER TABLE `admins` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `phone` VARCHAR(40) NOT NULL DEFAULT '',
    MODIFY `type` VARCHAR(10) NOT NULL DEFAULT 'offline';

-- CreateTable
CREATE TABLE `app_subscriptions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `plan` VARCHAR(20) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `app_subscriptions_admin_id_end_date_idx`(`admin_id`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `app_subscriptions` ADD CONSTRAINT `app_subscriptions_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
