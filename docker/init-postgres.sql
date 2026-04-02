-- Create sample schema for connector demo
CREATE SCHEMA IF NOT EXISTS sample;

CREATE TABLE IF NOT EXISTS sample.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    region VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sample.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES sample.users(id),
    product VARCHAR(255),
    amount NUMERIC(12,2),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO sample.users (email, name, status, region) VALUES
  ('amara.k@acme.io', 'Amara Kamau', 'active', 'EA'),
  ('john.m@techco.ke', 'John Mwangi', 'pending', 'EA'),
  ('fatima.n@corp.ng', 'Fatima Nwosu', 'active', 'WA'),
  ('sipho.d@zacorp.za', 'Sipho Dlamini', 'inactive', 'SA'),
  ('priya.s@startup.in', 'Priya Singh', 'active', 'SA'),
  ('kwame.a@fintech.gh', 'Kwame Asante', 'active', 'WA'),
  ('aisha.b@corp.tz', 'Aisha Bakari', 'active', 'EA'),
  ('omar.f@tech.eg', 'Omar Farouk', 'active', 'NA')
ON CONFLICT DO NOTHING;

INSERT INTO sample.orders (user_id, product, amount, status) VALUES
  (1, 'Pro Plan', 99.00, 'paid'),
  (2, 'Basic Plan', 29.00, 'pending'),
  (3, 'Enterprise', 499.00, 'paid'),
  (1, 'Add-on Storage', 9.00, 'paid')
ON CONFLICT DO NOTHING;
