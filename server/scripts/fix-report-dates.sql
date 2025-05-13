-- Hatalı updatedAt değerlerini düzeltme SQL sorgusu
-- Bu sorgu, updatedAt değeri geçersiz olan kayıtları createdAt değeri ile günceller

-- Önce MySQL/MariaDB için
UPDATE reports 
SET updatedAt = createdAt 
WHERE MONTH(updatedAt) = 0 OR DAY(updatedAt) = 0;

-- Alternatif olarak SQLite için
-- UPDATE reports 
-- SET updatedAt = createdAt 
-- WHERE strftime('%m', updatedAt) = '00' OR strftime('%d', updatedAt) = '00';

-- Alternatif olarak PostgreSQL için
-- UPDATE reports 
-- SET "updatedAt" = "createdAt" 
-- WHERE EXTRACT(MONTH FROM "updatedAt") = 0 OR EXTRACT(DAY FROM "updatedAt") = 0; 