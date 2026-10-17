-- AlterTable
ALTER TABLE `leads` ADD COLUMN `state` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `leads_state_idx` ON `leads`(`state`);

-- Data migration: existing "state" values stored in custom_fields move into the new column.
-- Nothing else in custom_fields changes; a key is removed only after its value was copied to `state`.
-- Text that is not a valid state name is copied exactly as it was (trimmed), never guessed or changed.

-- 1. Copy the value of the first of "state", "State", "STATE" that holds text of 1-100 characters
UPDATE `leads`
SET `state` = COALESCE(IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.state')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.state'))), ''), NULL), IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.State')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.State'))), ''), NULL), IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.STATE')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.STATE'))), ''), NULL))
WHERE `state` IS NULL
  AND `custom_fields` IS NOT NULL
  AND JSON_VALID(`custom_fields`)
  AND CHAR_LENGTH(COALESCE(IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.state')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.state'))), ''), NULL), IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.State')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.State'))), ''), NULL), IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.STATE')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.STATE'))), ''), NULL))) BETWEEN 1 AND 100;

-- 2. Remove the copied keys from custom_fields (only those holding the value that was copied)
UPDATE `leads`
SET `custom_fields` = JSON_REMOVE(`custom_fields`, '$.state')
WHERE `state` IS NOT NULL
  AND `custom_fields` IS NOT NULL
  AND JSON_VALID(`custom_fields`)
  AND IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.state')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.state'))), ''), NULL) = `state`;

UPDATE `leads`
SET `custom_fields` = JSON_REMOVE(`custom_fields`, '$.State')
WHERE `state` IS NOT NULL
  AND `custom_fields` IS NOT NULL
  AND JSON_VALID(`custom_fields`)
  AND IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.State')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.State'))), ''), NULL) = `state`;

UPDATE `leads`
SET `custom_fields` = JSON_REMOVE(`custom_fields`, '$.STATE')
WHERE `state` IS NOT NULL
  AND `custom_fields` IS NOT NULL
  AND JSON_VALID(`custom_fields`)
  AND IF(JSON_TYPE(JSON_EXTRACT(`custom_fields`, '$.STATE')) = 'STRING', NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`custom_fields`, '$.STATE'))), ''), NULL) = `state`;

-- 3. Use the official spelling where the text clearly names a state ("maharashtra" -> "Maharashtra", "Orissa" -> "Odisha").
-- Keep this list in sync with STATES / STATE_ALIASES in backend/constants/index.js.
CREATE TEMPORARY TABLE `_state_names` (
  `lookup` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_state_names` (`lookup`, `name`) VALUES
  ('andaman and nicobar islands', 'Andaman and Nicobar Islands'),
  ('andhra pradesh', 'Andhra Pradesh'),
  ('arunachal pradesh', 'Arunachal Pradesh'),
  ('assam', 'Assam'),
  ('bihar', 'Bihar'),
  ('chandigarh', 'Chandigarh'),
  ('chhattisgarh', 'Chhattisgarh'),
  ('dadra and nagar haveli and daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('delhi', 'Delhi'),
  ('goa', 'Goa'),
  ('gujarat', 'Gujarat'),
  ('haryana', 'Haryana'),
  ('himachal pradesh', 'Himachal Pradesh'),
  ('jammu and kashmir', 'Jammu and Kashmir'),
  ('jharkhand', 'Jharkhand'),
  ('karnataka', 'Karnataka'),
  ('kerala', 'Kerala'),
  ('ladakh', 'Ladakh'),
  ('lakshadweep', 'Lakshadweep'),
  ('madhya pradesh', 'Madhya Pradesh'),
  ('maharashtra', 'Maharashtra'),
  ('manipur', 'Manipur'),
  ('meghalaya', 'Meghalaya'),
  ('mizoram', 'Mizoram'),
  ('nagaland', 'Nagaland'),
  ('odisha', 'Odisha'),
  ('puducherry', 'Puducherry'),
  ('punjab', 'Punjab'),
  ('rajasthan', 'Rajasthan'),
  ('sikkim', 'Sikkim'),
  ('tamil nadu', 'Tamil Nadu'),
  ('telangana', 'Telangana'),
  ('tripura', 'Tripura'),
  ('uttar pradesh', 'Uttar Pradesh'),
  ('uttarakhand', 'Uttarakhand'),
  ('west bengal', 'West Bengal'),
  ('orissa', 'Odisha'),
  ('uttaranchal', 'Uttarakhand'),
  ('pondicherry', 'Puducherry'),
  ('tamilnadu', 'Tamil Nadu'),
  ('chattisgarh', 'Chhattisgarh'),
  ('new delhi', 'Delhi'),
  ('nct of delhi', 'Delhi'),
  ('andaman and nicobar', 'Andaman and Nicobar Islands'),
  ('dadra and nagar haveli', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('j and k', 'Jammu and Kashmir');

UPDATE `leads` l
JOIN `_state_names` n ON n.`lookup` = TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REPLACE(LOWER(l.`state`), '&', ' and '), '[^a-z ]+', ' '), ' +', ' '))
SET l.`state` = n.`name`
WHERE l.`state` IS NOT NULL;

DROP TEMPORARY TABLE `_state_names`;
