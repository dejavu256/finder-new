/*
  Warnings:

  - You are about to drop the column `isBlocked` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `reasonType` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `reportedId` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedAt` on the `reports` table. All the data in the column will be lost.
  - The values [RESOLVED] on the enum `reports_status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `reason` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reportedAccountId` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `reports_reportedId_fkey`;

-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `reports_reporterId_fkey`;

-- DropIndex
DROP INDEX `reports_reportedId_fkey` ON `reports`;

-- DropIndex
DROP INDEX `reports_reporterId_fkey` ON `reports`;

-- AlterTable
ALTER TABLE `accounts` DROP COLUMN `isBlocked`;

-- AlterTable
ALTER TABLE `reports` DROP COLUMN `details`,
    DROP COLUMN `reasonType`,
    DROP COLUMN `reportedId`,
    DROP COLUMN `resolvedAt`,
    ADD COLUMN `reason` TEXT NOT NULL,
    ADD COLUMN `reportedAccountId` INTEGER NOT NULL,
    ADD COLUMN `reviewNote` TEXT NULL,
    ADD COLUMN `reviewedBy` INTEGER NULL,
    ADD COLUMN `rewardAmount` INTEGER NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';
