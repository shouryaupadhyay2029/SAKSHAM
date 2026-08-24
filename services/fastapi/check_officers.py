import psycopg2
conn = psycopg2.connect(host='localhost', dbname='saksham_db', user='saksham', password='saksham_secure_pass_2026', port=5432)
cur = conn.cursor()
cur.execute("SELECT id, email, name, role FROM \"Officer\"")
for row in cur.fetchall():
    print(row)
conn.close()
