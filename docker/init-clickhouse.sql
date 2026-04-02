CREATE TABLE IF NOT EXISTS warehouse_db.metrics (
    id UInt64,
    metric_name String,
    value Float64,
    tags Map(String, String),
    recorded_at DateTime
) ENGINE = MergeTree()
ORDER BY (recorded_at, metric_name);

CREATE TABLE IF NOT EXISTS warehouse_db.page_stats (
    date Date,
    page String,
    views UInt64,
    unique_users UInt64,
    avg_duration_ms UInt32
) ENGINE = MergeTree()
ORDER BY (date, page);

INSERT INTO warehouse_db.metrics VALUES
  (1, 'api_latency_ms',   42.5,   map('service', 'backend', 'env', 'prod'),   '2024-01-14 10:00:00'),
  (2, 'db_query_ms',       8.1,   map('db', 'postgres', 'query', 'select'),   '2024-01-14 10:00:01'),
  (3, 'batch_throughput', 1240.0, map('job', 'extract', 'source', 'postgres'),'2024-01-14 10:05:00'),
  (4, 'memory_mb',        512.0,  map('service', 'backend', 'env', 'prod'),   '2024-01-14 10:10:00'),
  (5, 'cpu_pct',           23.4,  map('service', 'celery', 'env', 'prod'),    '2024-01-14 10:10:01');

INSERT INTO warehouse_db.page_stats VALUES
  ('2024-01-14', '/dashboard',  1420, 340, 12500),
  ('2024-01-14', '/connectors',  870, 220, 34000),
  ('2024-01-14', '/data-grid',   650, 180, 58000),
  ('2024-01-14', '/batch-jobs',  310,  95, 42000);
