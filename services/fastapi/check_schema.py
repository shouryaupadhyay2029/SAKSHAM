import psycopg2
conn = psycopg2.connect(host='localhost', dbname='saksham_db', user='saksham', password='saksham_secure_pass_2026', port=5432)
cur = conn.cursor()
cur.execute("""
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'IncidentStatus'
ORDER BY e.enumsortorder
""")
print("IncidentStatus enum values in PostgreSQL:")
for row in cur.fetchall():
    print(" -", row[0])
conn.close()
