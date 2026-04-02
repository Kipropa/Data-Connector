db = db.getSiblingDB('events_db');

db.createCollection('events');
db.createCollection('sessions');

db.events.insertMany([
  { event_type: 'page_view', user_id: 1, page: '/dashboard', ts: new Date('2024-01-14T10:00:00Z'), metadata: { browser: 'Chrome', os: 'Linux' } },
  { event_type: 'click', user_id: 2, page: '/connectors', ts: new Date('2024-01-14T10:02:00Z'), metadata: { element: 'btn-add' } },
  { event_type: 'batch_run', user_id: 1, page: '/batch', ts: new Date('2024-01-14T10:05:00Z'), metadata: { job_id: 'job-001', rows: 500 } },
  { event_type: 'export', user_id: 3, page: '/data-grid', ts: new Date('2024-01-14T10:10:00Z'), metadata: { format: 'csv', rows: 100 } },
  { event_type: 'login', user_id: 4, page: '/auth', ts: new Date('2024-01-14T09:55:00Z'), metadata: { method: 'password' } }
]);

db.sessions.insertMany([
  { session_id: 'sess-abc123', user_id: 1, started: new Date('2024-01-14T09:00:00Z'), ended: new Date('2024-01-14T11:00:00Z'), page_count: 14 },
  { session_id: 'sess-def456', user_id: 2, started: new Date('2024-01-14T10:00:00Z'), ended: null, page_count: 7 }
]);
