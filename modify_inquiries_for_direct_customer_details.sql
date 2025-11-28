-- jalin-alam/modify_inquiries_for_direct_customer_details.sql

-- Drop the foreign key constraint first if it exists
ALTER TABLE inquiries DROP FOREIGN KEY inquiries_ibfk_1;

-- Drop the customer_id column
ALTER TABLE inquiries DROP COLUMN customer_id;

-- Add new columns for direct customer details
ALTER TABLE inquiries
ADD COLUMN customer_name VARCHAR(255) NOT NULL AFTER id,
ADD COLUMN customer_email VARCHAR(255) NULL AFTER customer_name,
ADD COLUMN customer_phone VARCHAR(50) NULL AFTER customer_email,
ADD COLUMN customer_address TEXT NULL AFTER customer_phone;
