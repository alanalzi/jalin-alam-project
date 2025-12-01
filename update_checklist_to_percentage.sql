ALTER TABLE product_checklists
DROP COLUMN is_completed;

ALTER TABLE product_checklists
ADD COLUMN percentage INT DEFAULT 0;
