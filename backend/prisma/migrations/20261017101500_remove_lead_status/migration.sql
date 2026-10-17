-- Removes the lead "status" column and the indexes that used it. Safe to run when they are already gone.
-- Only `status` is dropped; every other column and all rows stay as they are. Before this migration every lead
-- still had the default status "New", so no information is lost.

-- The replacement index comes first: the foreign key on assigned_to_id needs an index at all times
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'leads' AND index_name = 'leads_assigned_to_id_created_at_idx') = 0,
  'CREATE INDEX `leads_assigned_to_id_created_at_idx` ON `leads`(`assigned_to_id`, `created_at`)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Then drop the two indexes that include `status`
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'leads' AND index_name = 'leads_assigned_to_id_status_created_at_idx') > 0,
  'DROP INDEX `leads_assigned_to_id_status_created_at_idx` ON `leads`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'leads' AND index_name = 'leads_status_idx') > 0,
  'DROP INDEX `leads_status_idx` ON `leads`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Then drop the column
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'status') > 0,
  'ALTER TABLE `leads` DROP COLUMN `status`', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
