-- Removes the lead "branch" column (and its index). Safe to run when the column is already gone.
-- Only `branch` is dropped; every other column and all rows stay as they are. Before this migration no lead
-- had a branch value, so no data is lost.

SET @has_branch = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'branch'
);

-- The index covers only `branch`, so dropping the column drops it too; dropping it first keeps the order explicit.
SET @has_index = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'leads' AND index_name = 'leads_branch_idx'
);
SET @drop_index = IF(@has_index > 0, 'DROP INDEX `leads_branch_idx` ON `leads`', 'DO 0');
PREPARE drop_index FROM @drop_index;
EXECUTE drop_index;
DEALLOCATE PREPARE drop_index;

SET @drop_column = IF(@has_branch > 0, 'ALTER TABLE `leads` DROP COLUMN `branch`', 'DO 0');
PREPARE drop_column FROM @drop_column;
EXECUTE drop_column;
DEALLOCATE PREPARE drop_column;
