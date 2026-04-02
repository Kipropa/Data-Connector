CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2),
    stock_qty INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    qty INT,
    unit_price DECIMAL(10,2),
    total DECIMAL(10,2),
    sale_date DATE,
    region VARCHAR(50),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO products (sku, name, category, price, stock_qty) VALUES
  ('SKU-001', 'DataConnect Pro', 'Software', 99.00, 9999),
  ('SKU-002', 'DataConnect Enterprise', 'Software', 499.00, 9999),
  ('SKU-003', 'Storage Add-on 100GB', 'Add-on', 9.00, 9999),
  ('SKU-004', 'API Access Pack', 'Add-on', 49.00, 9999),
  ('SKU-005', 'DataConnect Basic', 'Software', 29.00, 9999);

INSERT INTO sales (product_id, qty, unit_price, total, sale_date, region) VALUES
  (1, 5, 99.00, 495.00, '2024-01-10', 'East Africa'),
  (2, 2, 499.00, 998.00, '2024-01-11', 'West Africa'),
  (3, 10, 9.00, 90.00, '2024-01-12', 'East Africa'),
  (1, 3, 99.00, 297.00, '2024-01-13', 'Southern Africa'),
  (5, 8, 29.00, 232.00, '2024-01-14', 'North Africa');
