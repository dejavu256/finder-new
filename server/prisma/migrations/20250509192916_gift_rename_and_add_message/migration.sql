/*
  Warnings:

  - The values [ROSE,COFFEE,TEDDY,CARD,FRUITBASKET] on the enum `gifts_giftType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `gifts` ADD COLUMN `specialMessage` TEXT NULL,
    MODIFY `giftType` ENUM('SILVER', 'GOLD', 'EMERALD', 'DIAMOND', 'RUBY') NOT NULL;
