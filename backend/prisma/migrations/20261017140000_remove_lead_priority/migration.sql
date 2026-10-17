-- Removes the lead "priority" column. Safe to run when it is already gone.
-- Only `priority` is dropped; every other column and all rows stay as they are. Before this migration every lead
-- still had the default priority "Medium", so no information is lost.

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'priority') > 0,
  'ALTER TABLE `leads` DROP COLUMN `priority`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
