-- AlterTable
ALTER TABLE `matches` ADD COLUMN `isPending` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pendingUserId` INTEGER NULL;
