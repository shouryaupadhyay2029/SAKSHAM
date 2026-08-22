from sqlalchemy import text
from database import engine, Base
import models

with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
    conn.commit()

Base.metadata.create_all(bind=engine)
print("Database initialized with PostGIS + resources table")