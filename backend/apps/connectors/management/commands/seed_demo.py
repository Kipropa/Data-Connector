"""
Usage: python manage.py seed_demo
Creates the admin user + 4 sample connections pointing to the Docker databases.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

SAMPLE_CONNECTIONS = [
    {
        "name": "Analytics DB (PostgreSQL)",
        "db_type": "postgresql",
        "host": "postgres",
        "port": 5432,
        "database": "dataconnect",
        "username": "dc_user",
        "password": "dc_pass",
    },
    {
        "name": "Sales MySQL",
        "db_type": "mysql",
        "host": "mysql",
        "port": 3306,
        "database": "sales_db",
        "username": "mysql_user",
        "password": "mysql_pass",
    },
    {
        "name": "Events Store (MongoDB)",
        "db_type": "mongodb",
        "host": "mongo",
        "port": 27017,
        "database": "events_db",
        "username": "mongo_user",
        "password": "mongo_pass",
    },
    {
        "name": "ClickHouse Data Warehouse",
        "db_type": "clickhouse",
        "host": "clickhouse",
        "port": 9000,
        "database": "warehouse_db",
        "username": "ch_user",
        "password": "ch_pass",
    },
]


class Command(BaseCommand):
    help = "Seed demo admin user and sample connections"

    def handle(self, *args, **options):
        # Admin user
        admin, created = User.objects.get_or_create(
            email="admin@dataconnect.io",
            defaults={"name": "Admin User", "role": "admin", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password("admin1234")
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created admin@dataconnect.io / admin1234"))
        else:
            self.stdout.write("Admin user already exists")

        # Sample connections
        from apps.connectors.models import Connection
        for cfg in SAMPLE_CONNECTIONS:
            conn, created = Connection.objects.get_or_create(
                owner=admin,
                name=cfg["name"],
                defaults=cfg,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created connection: {conn.name}"))

        self.stdout.write(self.style.SUCCESS("\nDemo seeding complete! Login at http://localhost:3000"))
