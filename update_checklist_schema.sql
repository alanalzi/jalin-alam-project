-- This script ensures the 'product_checklists' table has the correct columns.

-- First, drop the 'percentage' column if it exists, as it's no longer used.
-- The IF EXISTS clause prevents an error if the column is already gone.
ALTER TABLE product_checklists DROP COLUMN IF EXISTS percentage;

-- Next, add the 'is_completed' column if it doesn't already exist.
-- This column will store the completion status as a boolean (true/false).
ALTER TABLE product_checklists ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
