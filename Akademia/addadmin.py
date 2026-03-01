import sqlite3
from werkzeug.security import generate_password_hash

EMAIL = "Damianchmielewski33@gmail.com"
PASSWORD = "1234"

def add_admin():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # sprawdź, czy użytkownik już istnieje
    cur.execute("SELECT * FROM users WHERE email = ?", (EMAIL,))
    user = cur.fetchone()

    if user:
        print("Użytkownik już istnieje. Aktualizuję go jako admina...")
        hashed = generate_password_hash(PASSWORD)
        cur.execute("UPDATE users SET password = ?, is_admin = 1 WHERE email = ?", (hashed, EMAIL))
        conn.commit()
        conn.close()
        print("Gotowe! Konto zostało ustawione jako admin.")
        return

    # dodaj nowego admina
    hashed = generate_password_hash(PASSWORD)
    cur.execute(
        "INSERT INTO users (email, password, is_admin) VALUES (?, ?, 1)",
        (EMAIL, hashed)
    )
    conn.commit()
    conn.close()

    print("Konto admina zostało dodane pomyślnie!")

if __name__ == "__main__":
    add_admin()
