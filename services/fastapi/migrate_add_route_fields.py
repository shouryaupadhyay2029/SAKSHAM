"""
migrate_add_route_fields.py
============================
One-time safe migration: adds route-decision columns to the Dispatch table.

Uses "ADD COLUMN IF NOT EXISTS" so it is safe to run multiple times.

Usage:
    cd services/fastapi
    python migrate_add_route_fields.py
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from sqlalchemy import create_engine, text

MIGRATION_SQL = """
ALTER TABLE "Dispatch"
    ADD COLUMN IF NOT EXISTS "routeProvider"        VARCHAR,
    ADD COLUMN IF NOT EXISTS "routeProfile"         VARCHAR,
    ADD COLUMN IF NOT EXISTS "routeDistanceMeters"  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "routeDurationSeconds" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "routeGeometry"        TEXT,
    ADD COLUMN IF NOT EXISTS "routeScore"           DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "routeDecisionReason"  VARCHAR,
    ADD COLUMN IF NOT EXISTS "routeDecisionFactors" TEXT,
    ADD COLUMN IF NOT EXISTS "routeAlternatives"    TEXT,
    ADD COLUMN IF NOT EXISTS "routeCalculatedAt"    TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "routeDeviationStatus" VARCHAR DEFAULT 'NOMINAL';
"""

def run_migration():
    engine = create_engine(settings.DATABASE_URL)
    print(f"Connecting to: {settings.DATABASE_URL[:40]}...")
    with engine.connect() as conn:
        conn.execute(text(MIGRATION_SQL))
        conn.commit()
    print("Migration complete: route columns added to Dispatch table.")

if __name__ == "__main__":
    run_migration()
