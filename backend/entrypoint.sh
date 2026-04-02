#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL..."
until python -c "
import psycopg2, os, urllib.parse
url = os.environ.get('DATABASE_URL', '')
if url:
    r = urllib.parse.urlparse(url)
    conn = psycopg2.connect(host=r.hostname, port=r.port or 5432, dbname=r.path.lstrip('/'), user=r.username, password=r.password)
else:
    conn = psycopg2.connect(host=os.environ.get('DB_HOST','postgres'), port=int(os.environ.get('DB_PORT',5432)), dbname=os.environ.get('DB_NAME','dataconnect'), user=os.environ.get('DB_USER','dc_user'), password=os.environ.get('DB_PASSWORD','dc_pass'))
conn.close()
print('PostgreSQL is ready')
" 2>/dev/null; do
  echo "  PostgreSQL unavailable - sleeping 2s"
  sleep 2
done

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Seeding demo data..."
python manage.py seed_demo || true

echo "==> Starting Django server..."
exec python manage.py runserver 0.0.0.0:8000
