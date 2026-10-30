-- CreateTable
CREATE TABLE `admins` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `revenue_goal` DECIMAL(12, 2) NOT NULL DEFAULT 18500,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `months` INTEGER NOT NULL,
    `fee` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `plans_admin_id_months_key`(`admin_id`, `months`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `members` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(190) NOT NULL DEFAULT '',
    `phone` VARCHAR(40) NOT NULL DEFAULT '',
    `gender` VARCHAR(30) NOT NULL,
    `age` INTEGER NOT NULL,
    `plan` VARCHAR(100) NOT NULL,
    `duration_months` INTEGER NOT NULL,
    `fee` DECIMAL(12, 2) NOT NULL,
    `joining_date` DATETIME(3) NOT NULL,
    `expiry_date` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `keycard` VARCHAR(100) NULL,
    `photo_path` VARCHAR(500) NULL,
    `pr_kg` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `members_admin_id_idx`(`admin_id`),
    UNIQUE INDEX `members_admin_id_keycard_key`(`admin_id`, `keycard`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `member_id` BIGINT UNSIGNED NULL,
    `member_name` VARCHAR(150) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `plan` VARCHAR(100) NOT NULL DEFAULT '',
    `description` VARCHAR(500) NOT NULL DEFAULT '',
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` VARCHAR(40) NOT NULL DEFAULT 'Cash',

    INDEX `finance_admin_id_idx`(`admin_id`),
    INDEX `finance_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `member_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NULL,
    `tags` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notes_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `checkins` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `member_id` BIGINT UNSIGNED NOT NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `checkins_admin_id_idx`(`admin_id`),
    INDEX `checkins_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plans` ADD CONSTRAINT `plans_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `members` ADD CONSTRAINT `members_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance` ADD CONSTRAINT `finance_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance` ADD CONSTRAINT `finance_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes` ADD CONSTRAINT `notes_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes` ADD CONSTRAINT `notes_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkins` ADD CONSTRAINT `checkins_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkins` ADD CONSTRAINT `checkins_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
