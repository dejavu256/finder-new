/*
  Warnings:

  - You are about to drop the column `action` on the `gifts` table. All the data in the column will be lost.
  - You are about to drop the column `actionDate` on the `gifts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `gifts` DROP COLUMN `action`,
    DROP COLUMN `actionDate`,
    ADD COLUMN `isAccepted` BOOLEAN NULL;
