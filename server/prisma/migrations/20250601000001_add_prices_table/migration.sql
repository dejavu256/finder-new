-- CreateTable
CREATE TABLE `prices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemType` VARCHAR(191) NOT NULL,
    `itemKey` VARCHAR(191) NOT NULL,
    `price` FLOAT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `prices_itemType_itemKey_key`(`itemType`, `itemKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default prices for coins
INSERT INTO `prices` (`itemType`, `itemKey`, `price`, `updatedAt`, `createdAt`)
VALUES 
    ('COIN_RATE', 'default', 0.03, NOW(), NOW());

-- Insert default prices for Gold memberships
INSERT INTO `prices` (`itemType`, `itemKey`, `price`, `updatedAt`, `createdAt`)
VALUES 
    ('GOLD_MEMBERSHIP', '7', 4.99, NOW(), NOW()),
    ('GOLD_MEMBERSHIP', '30', 14.99, NOW(), NOW()),
    ('GOLD_MEMBERSHIP', '90', 39.99, NOW(), NOW());

-- Insert default prices for Platinum memberships
INSERT INTO `prices` (`itemType`, `itemKey`, `price`, `updatedAt`, `createdAt`)
VALUES 
    ('PLATINUM_MEMBERSHIP', '7', 9.99, NOW(), NOW()),
    ('PLATINUM_MEMBERSHIP', '30', 29.99, NOW(), NOW()),
    ('PLATINUM_MEMBERSHIP', '90', 79.99, NOW(), NOW()); 