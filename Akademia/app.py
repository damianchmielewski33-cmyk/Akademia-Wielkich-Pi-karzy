import sqlite3
from flask import Flask, render_template, request, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "DianaPolak"

# -----------------------------
#  BAZA DANYCH
# -----------------------------

def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT,
            player_number INTEGER,
            is_admin INTEGER DEFAULT 0
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS match_signups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            match_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()

init_db()

# -----------------------------
#  STRONA GŁÓWNA
# -----------------------------

@app.route("/")
def home():
    return render_template("index.html")

# -----------------------------
#  REJESTRACJA
# -----------------------------

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        full_name = request.form["full_name"]
        email = request.form["email"]
        password = request.form["password"]
        hashed = generate_password_hash(password)

        conn = get_db()

        # ile jest kont?
        count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]

        # pierwsze konto = admin
        is_admin = 1 if count == 0 else 0

        # pobieramy zajęte numery
        used_numbers = conn.execute(
            "SELECT player_number FROM users WHERE player_number IS NOT NULL"
        ).fetchall()

        used_numbers = {row["player_number"] for row in used_numbers}

        # szukamy wolnego numeru 1–99
        free_number = None
        for n in range(1, 100):
            if n not in used_numbers:
                free_number = n
                break

        if free_number is None:
            conn.close()
            return "Brak wolnych numerów zawodników (1–99)."

        try:
            conn.execute(
                "INSERT INTO users (email, password, full_name, player_number, is_admin) VALUES (?, ?, ?, ?, ?)",
                (email, hashed, full_name, free_number, is_admin)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            return "Użytkownik o takim emailu już istnieje!"
        finally:
            conn.close()

        return redirect("/login")

    return render_template("register.html")

# -----------------------------
#  LOGOWANIE
# -----------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        conn.close()

        if user is None or not check_password_hash(user["password"], password):
            return "Błędne dane logowania!"

        session["user"] = email
        session["user_id"] = user["id"]
        session["is_admin"] = user["is_admin"]

        return redirect("/")

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# -----------------------------
#  PANEL ADMINA
# -----------------------------

@app.route("/admin")
def admin_panel():
    if "user_id" not in session:
        return redirect("/login")

    if session.get("is_admin") != 1:
        return "Brak dostępu"

    conn = get_db()
    users = conn.execute("SELECT id, email, full_name, player_number, is_admin FROM users").fetchall()
    conn.close()

    return render_template("admin.html", users=users)

# -----------------------------
#  ZMIANA EMAILA
# -----------------------------

@app.route("/admin/change_email", methods=["POST"])
def admin_change_email():
    if "user_id" not in session or session.get("is_admin") != 1:
        return "Brak dostępu"

    user_id = request.form["user_id"]
    new_email = request.form["new_email"]

    conn = get_db()
    try:
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, user_id))
        conn.commit()
    except sqlite3.IntegrityError:
        return "Taki email już istnieje!"
    finally:
        conn.close()

    return redirect("/admin")

# -----------------------------
#  RESET HASŁA
# -----------------------------

@app.route("/admin/reset_password", methods=["POST"])
def admin_reset_password():
    if "user_id" not in session or session.get("is_admin") != 1:
        return "Brak dostępu"

    user_id = request.form["user_id"]
    new_password = generate_password_hash("123456")

    conn = get_db()
    conn.execute("UPDATE users SET password = ? WHERE id = ?", (new_password, user_id))
    conn.commit()
    conn.close()

    return redirect("/admin")

# -----------------------------
#  USUWANIE UŻYTKOWNIKA
# -----------------------------

@app.route("/delete_user/<int:user_id>", methods=["POST"])
def delete_user(user_id):
    if "user_id" not in session or session.get("is_admin") != 1:
        return "Brak dostępu"

    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return redirect("/admin")

# -----------------------------
#  LISTA PIŁKARZY
# -----------------------------

@app.route("/pilkarze")
def pilkarze():
    return render_template("pilkarze.html")

# -----------------------------
#  START
# -----------------------------

if __name__ == "__main__":
    app.run(debug=True)
