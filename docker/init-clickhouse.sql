-- ── ClickHouse Data Warehouse seed data ───────────────────────────────────

-- 1. Sales fact table
CREATE TABLE IF NOT EXISTS warehouse_db.sales (
    id          UInt64,
    order_date  Date,
    region      String,
    product     String,
    category    String,
    qty         UInt32,
    unit_price  Float64,
    total       Float64,
    currency    String
) ENGINE = MergeTree()
ORDER BY (order_date, region, product);

-- 2. System metrics time-series
CREATE TABLE IF NOT EXISTS warehouse_db.metrics (
    id           UInt64,
    metric_name  String,
    value        Float64,
    tags         Map(String, String),
    recorded_at  DateTime
) ENGINE = MergeTree()
ORDER BY (recorded_at, metric_name);

-- 3. Page analytics
CREATE TABLE IF NOT EXISTS warehouse_db.page_stats (
    date             Date,
    page             String,
    views            UInt64,
    unique_users     UInt64,
    avg_duration_ms  UInt32,
    bounce_rate      Float32
) ENGINE = MergeTree()
ORDER BY (date, page);

-- 4. User activity log
CREATE TABLE IF NOT EXISTS warehouse_db.user_activity (
    event_id    UInt64,
    user_id     UInt32,
    action      String,
    resource    String,
    status_code UInt16,
    duration_ms UInt32,
    ip          String,
    ts          DateTime
) ENGINE = MergeTree()
ORDER BY (ts, user_id);

-- ── Seed: sales ──────────────────────────────────────────────────────────
INSERT INTO warehouse_db.sales VALUES
  (1,  '2024-01-02', 'East Africa',    'DataConnect Pro',        'Software',  5,  99.00,  495.00, 'USD'),
  (2,  '2024-01-03', 'West Africa',    'DataConnect Enterprise',  'Software',  2, 499.00,  998.00, 'USD'),
  (3,  '2024-01-04', 'East Africa',    'Storage Add-on 100GB',   'Add-on',   10,   9.00,   90.00, 'USD'),
  (4,  '2024-01-05', 'Southern Africa','DataConnect Pro',        'Software',  3,  99.00,  297.00, 'USD'),
  (5,  '2024-01-06', 'North Africa',   'DataConnect Basic',      'Software',  8,  29.00,  232.00, 'USD'),
  (6,  '2024-01-07', 'East Africa',    'API Access Pack',        'Add-on',    4,  49.00,  196.00, 'USD'),
  (7,  '2024-01-08', 'West Africa',    'DataConnect Pro',        'Software',  6,  99.00,  594.00, 'USD'),
  (8,  '2024-01-09', 'Southern Africa','DataConnect Enterprise',  'Software',  1, 499.00,  499.00, 'USD'),
  (9,  '2024-01-10', 'East Africa',    'DataConnect Basic',      'Software', 12,  29.00,  348.00, 'USD'),
  (10, '2024-01-11', 'North Africa',   'Storage Add-on 100GB',   'Add-on',    7,   9.00,   63.00, 'USD'),
  (11, '2024-01-12', 'East Africa',    'DataConnect Enterprise',  'Software',  3, 499.00, 1497.00, 'USD'),
  (12, '2024-01-13', 'West Africa',    'API Access Pack',        'Add-on',    9,  49.00,  441.00, 'USD'),
  (13, '2024-01-14', 'Southern Africa','DataConnect Basic',      'Software', 15,  29.00,  435.00, 'USD'),
  (14, '2024-01-15', 'East Africa',    'DataConnect Pro',        'Software',  7,  99.00,  693.00, 'USD'),
  (15, '2024-01-16', 'North Africa',   'DataConnect Enterprise',  'Software',  2, 499.00,  998.00, 'USD');

-- ── Seed: metrics ────────────────────────────────────────────────────────
INSERT INTO warehouse_db.metrics VALUES
  (1,  'api_latency_ms',    42.5,  map('service','backend','env','prod'),       '2024-01-14 10:00:00'),
  (2,  'db_query_ms',        8.1,  map('db','postgres','query','select'),       '2024-01-14 10:00:01'),
  (3,  'batch_throughput', 1240.0, map('job','extract','source','postgres'),    '2024-01-14 10:05:00'),
  (4,  'memory_mb',         512.0, map('service','backend','env','prod'),       '2024-01-14 10:10:00'),
  (5,  'cpu_pct',            23.4, map('service','celery','env','prod'),        '2024-01-14 10:10:01'),
  (6,  'api_latency_ms',    38.2,  map('service','backend','env','prod'),       '2024-01-14 11:00:00'),
  (7,  'db_query_ms',        6.7,  map('db','postgres','query','insert'),       '2024-01-14 11:00:01'),
  (8,  'cache_hit_rate',    94.3,  map('service','redis','env','prod'),         '2024-01-14 11:05:00'),
  (9,  'active_connections', 18.0, map('service','backend','env','prod'),       '2024-01-14 11:10:00'),
  (10, 'cpu_pct',            31.7, map('service','celery','env','prod'),        '2024-01-14 11:10:01'),
  (11, 'api_latency_ms',    55.9,  map('service','backend','env','prod'),       '2024-01-14 12:00:00'),
  (12, 'memory_mb',         489.0, map('service','backend','env','prod'),       '2024-01-14 12:10:00'),
  (13, 'batch_throughput',  980.0, map('job','extract','source','mysql'),       '2024-01-14 12:15:00'),
  (14, 'db_query_ms',       12.4,  map('db','clickhouse','query','select'),     '2024-01-14 12:20:00'),
  (15, 'cache_hit_rate',    91.8,  map('service','redis','env','prod'),         '2024-01-14 12:25:00');

-- ── Seed: page_stats ─────────────────────────────────────────────────────
INSERT INTO warehouse_db.page_stats VALUES
  ('2024-01-12', '/dashboard',   980, 240, 11200, 0.32),
  ('2024-01-12', '/connections', 540, 130, 28400, 0.21),
  ('2024-01-12', '/data-grid',   420, 110, 51000, 0.18),
  ('2024-01-12', '/batch-jobs',  210,  65, 39000, 0.25),
  ('2024-01-12', '/files',       180,  55, 22000, 0.29),
  ('2024-01-13', '/dashboard',  1180, 290, 12100, 0.30),
  ('2024-01-13', '/connections', 690, 175, 31000, 0.19),
  ('2024-01-13', '/data-grid',   510, 140, 54000, 0.16),
  ('2024-01-13', '/batch-jobs',  280,  80, 41000, 0.23),
  ('2024-01-13', '/files',       240,  70, 24500, 0.27),
  ('2024-01-14', '/dashboard',  1420, 340, 12500, 0.28),
  ('2024-01-14', '/connections', 870, 220, 34000, 0.17),
  ('2024-01-14', '/data-grid',   650, 180, 58000, 0.15),
  ('2024-01-14', '/batch-jobs',  310,  95, 42000, 0.22),
  ('2024-01-14', '/files',       290,  88, 26000, 0.25);

-- ── Seed: user_activity ──────────────────────────────────────────────────
INSERT INTO warehouse_db.user_activity VALUES
  (1,  1, 'LOGIN',          '/auth/login',          200, 142,  '10.0.0.1', '2024-01-14 08:00:01'),
  (2,  1, 'VIEW',           '/dashboard',           200,  38,  '10.0.0.1', '2024-01-14 08:00:05'),
  (3,  1, 'CREATE',         '/connections',         201, 210,  '10.0.0.1', '2024-01-14 08:01:12'),
  (4,  2, 'LOGIN',          '/auth/login',          200, 155,  '10.0.0.2', '2024-01-14 08:15:00'),
  (5,  2, 'VIEW',           '/batch-jobs',          200,  44,  '10.0.0.2', '2024-01-14 08:15:30'),
  (6,  2, 'CREATE',         '/batch-jobs',          201, 890,  '10.0.0.2', '2024-01-14 08:16:05'),
  (7,  1, 'VIEW',           '/data-grid',           200,  62,  '10.0.0.1', '2024-01-14 08:30:00'),
  (8,  1, 'UPDATE',         '/records/42',          200, 105,  '10.0.0.1', '2024-01-14 08:30:45'),
  (9,  3, 'LOGIN',          '/auth/login',          200, 138,  '10.0.0.3', '2024-01-14 09:00:00'),
  (10, 3, 'VIEW',           '/files',               200,  41,  '10.0.0.3', '2024-01-14 09:00:10'),
  (11, 3, 'DOWNLOAD',       '/files/7/download',    200, 320,  '10.0.0.3', '2024-01-14 09:01:00'),
  (12, 2, 'TEST_CONN',      '/connections/3/test',  200, 245,  '10.0.0.2', '2024-01-14 09:30:00'),
  (13, 1, 'SUBMIT',         '/records/submit',      200, 512,  '10.0.0.1', '2024-01-14 10:00:00'),
  (14, 4, 'LOGIN',          '/auth/login',          401,  88,  '10.0.0.9', '2024-01-14 10:05:00'),
  (15, 1, 'LOGOUT',         '/auth/logout',         200,  22,  '10.0.0.1', '2024-01-14 11:00:00');
