-- AlterTable
ALTER TABLE `leads` ADD COLUMN `branch` ENUM('Ahmedabad', 'Chennai', 'Pune') NULL;

-- CreateIndex
CREATE INDEX `leads_branch_idx` ON `leads`(`branch`);
