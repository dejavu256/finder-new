-- AlterTable
ALTER TABLE `profiles` ADD COLUMN `multiple_t_sex` TEXT NULL;

-- CreateTable
CREATE TABLE `admin_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `targetUserId` INTEGER NULL,
    `actionType` ENUM('PROFILE_EDIT', 'BAN_USER', 'UNBAN_USER', 'REMOVE_PHOTO', 'REMOVE_AVATAR', 'MEMBERSHIP_CHANGE', 'SYSTEM_UPDATE', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
