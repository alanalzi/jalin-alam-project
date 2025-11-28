-- SQL to add customer_id to the products table
ALTER TABLE products
ADD COLUMN customer_id INT,
ADD CONSTRAINT fk_customer
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
