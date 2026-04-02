#!/bin/sh
set -e

echo "==> Celery worker: waiting for PostgreSQL..."
until python -c "
import psycopg2, os, urllib.parse
url = os.environ.get('DATABASE_URL', '')
if url:
    r = urllib.parse.urlparse(url)
    conn = psycopg2.connect(host=r.hostname, port=r.port or 5432, dbname=r.path.lstrip('/'), user=r.username, password=r.password)
else:
    conn = psycopg2.connect(host=os.environ.get('DB_HOST','postgres'), port=5432, dbname=os.environ.get('DB_NAME','dataconnect'), user=os.environ.get('DB_USER','dc_user'), password=os.environ.get('DB_PASSWORD','dc_pass'))
conn.close()
" 2>/dev/null; do
  echo "  sleeping..."
  sleep 2
done

echo "==> Starting Celery worker..."
exec celery -A core worker -l info -c 4
