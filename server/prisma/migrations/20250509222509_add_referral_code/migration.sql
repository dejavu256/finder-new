/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `usedReferralCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `accounts_referralCode_key` ON `accounts`(`referralCode`);
