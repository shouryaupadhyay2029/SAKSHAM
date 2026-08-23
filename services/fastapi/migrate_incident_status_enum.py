import psycopg2

conn = psycopg2.connect(host='localhost', dbname='saksham_db', user='saksham', password='saksham_secure_pass_2026', port=5432)
conn.autocommit = True
cur = conn.cursor()

values_to_add = [
    ('AWAITING_MATCH', 'VERIFIED'),
    ('MATCHED', 'AWAITING_MATCH'),
    ('DISPATCHED', 'MATCHED'),
    ('CANCELLED', 'RESOLVED'),
]

for value, after in values_to_add:
    try:
        sql = "ALTER TYPE \"IncidentStatus\" ADD VALUE IF NOT EXISTS '{}' AFTER '{}'".format(value, after)
        cur.execute(sql)
        print("Added:", value)
    except Exception as e:
        print("Error for {}: {}".format(value, e))

cur.execute("SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname='IncidentStatus' ORDER BY e.enumsortorder")
print("Final values:", [r[0] for r in cur.fetchall()])
conn.close()
