import sqlite3
from flask import Flask, render_template, request, redirect, session

app = Flask(__name__)
app.secret_key = "DianaPolak"

# -----------------------------
#  STAŁA LISTA PIŁKARZY
# -----------------------------

ALL_PLAYERS = [
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Neymar", "Robert Lewandowski",
    "Kevin De Bruyne", "Erling Haaland", "Luka Modrić", "Karim Benzema", "Mohamed Salah",
    "Vinicius Jr", "Pedri", "Gavi", "Antoine Griezmann", "Harry Kane",
    "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Sergio Ramos", "Alisson Becker",
    "Thibaut Courtois", "Marc ter Stegen", "Virgil van Dijk", "Antonio Rüdiger", "Joshua Kimmich",
    "Heung-min Son", "Raheem Sterling", "Paulo Dybala", "Ángel Di María", "Martin Ødegaard"
]

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
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            player_alias TEXT UNIQUE NOT NULL,
            is_admin INTEGER DEFAULT 0
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_date TEXT NOT NULL,
            match_time TEXT NOT NULL,
            location TEXT NOT NULL,
            max_slots INTEGER NOT NULL,
            signed_up INTEGER NOT NULL DEFAULT 0
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS match_signups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            match_id INTEGER NOT NULL,
            paid INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(match_id) REFERENCES matches(id)
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
#  REJESTRACJA – IMIĘ, NAZWISKO, PIŁKARZ
# -----------------------------

@app.route("/register", methods=["GET", "POST"])
def register():
    conn = get_db()

    count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    is_admin = 1 if count == 0 else 0

    used_aliases_rows = conn.execute("SELECT player_alias FROM users").fetchall()
    used_aliases = {row["player_alias"] for row in used_aliases_rows}

    available_players = [p for p in ALL_PLAYERS if p not in used_aliases]

    if request.method == "POST":
        first_name = request.form["first_name"].strip()
        last_name = request.form["last_name"].strip()
        player_alias = request.form["player_alias"].strip()

        if not first_name or not last_name or not player_alias:
            conn.close()
            return render_template(
                "register.html",
                available_players=available_players,
                error="Wszystkie pola są wymagane."
            )

        if player_alias not in available_players:
            conn.close()
            return render_template(
                "register.html",
                available_players=available_players,
                error="Ten piłkarz jest już zajęty lub nieprawidłowy."
            )

        try:
            conn.execute(
                "INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?, ?, ?, ?)",
                (first_name, last_name, player_alias, is_admin)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return render_template(
                "register.html",
                available_players=available_players,
                error="Ten piłkarz jest już zajęty."
            )

        conn.close()
        return redirect("/login")

    conn.close()
    return render_template("register.html", available_players=available_players)

# -----------------------------
#  LOGOWANIE – IMIĘ, NAZWISKO, PIŁKARZ
# -----------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        first_name = request.form["first_name"].strip()
        last_name = request.form["last_name"].strip()
        player_alias = request.form["player_alias"].strip()

        conn = get_db()
        user = conn.execute(
            "SELECT * FROM users WHERE first_name = ? AND last_name = ? AND player_alias = ?",
            (first_name, last_name, player_alias)
        ).fetchone()
        conn.close()

        if user is None:
            return render_template(
                "login.html",
                error="Nieprawidłowe dane logowania mordo",
                used_players=[]
            )

        session["user_id"] = user["id"]
        session["first_name"] = user["first_name"]
        session["last_name"] = user["last_name"]
        session["player_alias"] = user["player_alias"]
        session["is_admin"] = user["is_admin"]

        return redirect("/")

    conn = get_db()
    used_aliases_rows = conn.execute("SELECT player_alias FROM users").fetchall()
    conn.close()
    used_aliases = [row["player_alias"] for row in used_aliases_rows]

    return render_template("login.html", used_players=used_aliases)

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# -----------------------------
#  PANEL ADMINA – PROSTA LISTA
# -----------------------------

@app.route("/admin")
def admin_panel():
    if "user_id" not in session:
        return redirect("/login")

    if session.get("is_admin") != 1:
        return "Brak dostępu"

    conn = get_db()
    users = conn.execute(
        "SELECT id, first_name, last_name, player_alias, is_admin FROM users"
    ).fetchall()
    conn.close()

    return render_template("admin.html", users=users)

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
#  LISTA PIŁKARZY – statyczna
# -----------------------------

@app.route("/pilkarze")
def pilkarze():
    return render_template("pilkarze.html")

# -----------------------------
#  TERMINARZ – WYŚWIETLANIE + LISTA ZAPISANYCH
# -----------------------------

@app.route("/terminarz")
def terminarz():
    conn = get_db()
    matches = conn.execute("SELECT * FROM matches ORDER BY match_date ASC").fetchall()

    signups = conn.execute("""
        SELECT ms.match_id, ms.paid, u.first_name, u.last_name, u.player_alias
        FROM match_signups ms
        JOIN users u ON u.id = ms.user_id
        ORDER BY u.first_name ASC
    """).fetchall()

    conn.close()

    players_by_match = {}
    for s in signups:
        players_by_match.setdefault(s["match_id"], []).append(s)

    user_signed = {}
    if "player_alias" in session:
        for s in signups:
            if s["player_alias"] == session["player_alias"]:
                user_signed[s["match_id"]] = True

    return render_template(
        "terminarz.html",
        matches=matches,
        players_by_match=players_by_match,
        user_signed=user_signed
    )

# -----------------------------
#  TERMINARZ – DODAWANIE MECZU
# -----------------------------

@app.route("/terminarz/add", methods=["POST"])
def add_match():
    if "user_id" not in session or session.get("is_admin") != 1:
        return "Brak dostępu"

    date = request.form["date"]
    time = request.form["time"]
    location = request.form["location"]
    max_slots = request.form["max_slots"]

    conn = get_db()
    conn.execute(
        "INSERT INTO matches (match_date, match_time, location, max_slots, signed_up) VALUES (?, ?, ?, ?, 0)",
        (date, time, location, max_slots)
    )
    conn.commit()
    conn.close()

    return redirect("/terminarz")

# -----------------------------
#  TERMINARZ – ZAPIS NA MECZ
# -----------------------------

@app.route("/terminarz/signup/<int:match_id>")
def signup_match(match_id):
    if "user_id" not in session:
        return redirect("/login")

    user_id = session["user_id"]
    conn = get_db()

    match = conn.execute("SELECT * FROM matches WHERE id = ?", (match_id,)).fetchone()
    if match is None:
        conn.close()
        return "Mecz nie istnieje"

    if match["signed_up"] >= match["max_slots"]:
        conn.close()
        return "Brak miejsc na ten mecz!"

    already = conn.execute(
        "SELECT * FROM match_signups WHERE user_id = ? AND match_id = ?",
        (user_id, match_id)
    ).fetchone()

    if already:
        conn.close()
        return "Już jesteś zapisany na ten mecz!"

    conn.execute(
        "INSERT INTO match_signups (user_id, match_id, paid) VALUES (?, ?, 0)",
        (user_id, match_id)
    )
    conn.execute(
        "UPDATE matches SET signed_up = signed_up + 1 WHERE id = ?",
        (match_id,)
    )

    conn.commit()
    conn.close()

    return redirect("/terminarz")

# -----------------------------
#  TERMINARZ – WYPISANIE Z MECZU
# -----------------------------

@app.route("/terminarz/unsubscribe/<int:match_id>")
def unsubscribe_match(match_id):
    if "user_id" not in session:
        return redirect("/login")

    user_id = session["user_id"]
    conn = get_db()

    signup = conn.execute(
        "SELECT * FROM match_signups WHERE user_id = ? AND match_id = ?",
        (user_id, match_id)
    ).fetchone()

    if signup:
        conn.execute("DELETE FROM match_signups WHERE id = ?", (signup["id"],))
        conn.execute(
            "UPDATE matches SET signed_up = signed_up - 1 WHERE id = ?",
            (match_id,)
        )
        conn.commit()

    conn.close()
    return redirect("/terminarz")

# -----------------------------
#  START
# -----------------------------

if __name__ == "__main__":
    app.run(debug=True)
