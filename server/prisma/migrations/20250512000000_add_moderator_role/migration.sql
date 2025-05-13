-- Add isModerator field to accounts table
ALTER TABLE `accounts` ADD COLUMN `isModerator` BOOLEAN NOT NULL DEFAULT false; 