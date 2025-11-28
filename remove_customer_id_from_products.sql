ALTER TABLE products
DROP FOREIGN KEY fk_customer;

ALTER TABLE products
DROP COLUMN customer_id;
