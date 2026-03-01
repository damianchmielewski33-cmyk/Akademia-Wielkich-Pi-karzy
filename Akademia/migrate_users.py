import sqlite3

def migrate():
    conn = sqlite3.connect("database.db")
    cur = conn.cursor()

    # dodanie kolumny full_name
    try:
        cur.execute("ALTER TABLE users ADD COLUMN full_name TEXT;")
        print("Dodano kolumnę full_name")
    except Exception as e:
        print("Kolumna full_name już istnieje lub błąd:", e)

    # dodanie kolumny player_number
    try:
        cur.execute("ALTER TABLE users ADD COLUMN player_number INTEGER;")
        print("Dodano kolumnę player_number")
    except Exception as e:
        print("Kolumna player_number już istnieje lub błąd:", e)

    conn.commit()
    conn.close()
    print("Migracja zakończona.")

if __name__ == "__main__":
    migrate()
