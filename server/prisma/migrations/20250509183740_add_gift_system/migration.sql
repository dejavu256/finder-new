-- CreateTable
CREATE TABLE `gifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,
    `giftType` ENUM('ROSE', 'COFFEE', 'TEDDY', 'CARD') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isViewed` BOOLEAN NOT NULL DEFAULT false,
    `action` VARCHAR(191) NULL,
    `actionDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
