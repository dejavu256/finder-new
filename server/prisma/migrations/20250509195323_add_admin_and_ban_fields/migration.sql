-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `banExpiry` DATETIME(3) NULL,
    ADD COLUMN `banReason` TEXT NULL,
    ADD COLUMN `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isBanned` BOOLEAN NOT NULL DEFAULT false;
