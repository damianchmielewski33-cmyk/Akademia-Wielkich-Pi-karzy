from flask import Flask, render_template, request, redirect, session, jsonify
from datetime import date

from db import get_db          # ← baza danych
from stats import stats_bp     # ← blueprint statystyk

app = Flask(__name__)
app.secret_key = "DianaPolak"

# rejestracja blueprintów
app.register_blueprint(stats_bp)

ALL_PLAYERS = [
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Neymar", "Robert Lewandowski",
    "Kevin De Bruyne", "Erling Haaland", "Luka Modrić", "Karim Benzema", "Mohamed Salah",
    "Vinicius Jr", "Pedri", "Gavi", "Antoine Griezmann", "Harry Kane",
    "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Sergio Ramos", "Alisson Becker",
    "Thibaut Courtois", "Marc ter Stegen", "Virgil van Dijk", "Antonio Rüdiger", "Joshua Kimmich",
    "Heung-min Son", "Raheem Sterling", "Paulo Dybala", "Ángel Di María", "Martin Ødegaard"
]

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
            signed_up INTEGER NOT NULL DEFAULT 0,
            played INTEGER NOT NULL DEFAULT 0
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

    # NOWA TABELA STATYSTYK
    conn.execute("""
        CREATE TABLE IF NOT EXISTS match_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            match_id INTEGER NOT NULL,
            goals INTEGER DEFAULT 0,
            assists INTEGER DEFAULT 0,
            distance REAL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(match_id) REFERENCES matches(id)
        )
    """)

    conn.commit()
    conn.close()

init_db()

# -----------------------------------------
# STRONA GŁÓWNA – najbliższy mecz + user_signed
# -----------------------------------------

@app.route("/")
def home():
    conn = get_db()

    next_match = conn.execute(
        "SELECT * FROM matches WHERE match_date >= date('now') ORDER BY match_date, match_time LIMIT 1"
    ).fetchone()

    user_signed = False
    if next_match and "user_id" in session:
        signup = conn.execute(
            "SELECT id FROM match_signups WHERE user_id = ? AND match_id = ?",
            (session["user_id"], next_match["id"])
        ).fetchone()
        if signup:
            user_signed = True

    conn.close()
    return render_template("index.html", next_match=next_match, user_signed=user_signed)

# -----------------------------------------
# REJESTRACJA
# -----------------------------------------

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
            return render_template("register.html", available_players=available_players,
                                   error="Wszystkie pola są wymagane.")

        if player_alias not in available_players:
            conn.close()
            return render_template("register.html", available_players=available_players,
                                   error="Ten piłkarz jest już zajęty lub nieprawidłowy.")

        try:
            conn.execute(
                "INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?, ?, ?, ?)",
                (first_name, last_name, player_alias, is_admin)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return render_template("register.html", available_players=available_players,
                                   error="Ten piłkarz jest już zajęty.")

        conn.close()
        return redirect("/login")

    conn.close()
    return render_template("register.html", available_players=available_players)

# -----------------------------------------
# LOGOWANIE
# -----------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    conn = get_db()
    used_aliases_rows = conn.execute("SELECT player_alias FROM users").fetchall()
    used_aliases = [row["player_alias"] for row in used_aliases_rows]

    if request.method == "POST":
        first_name = request.form["first_name"].strip()
        last_name = request.form["last_name"].strip()
        player_alias = request.form["player_alias"].strip()

        user = conn.execute(
            "SELECT * FROM users WHERE first_name = ? AND last_name = ? AND player_alias = ?",
            (first_name, last_name, player_alias)
        ).fetchone()

        if user is None:
            conn.close()
            return render_template("login.html",
                                   error="Nieprawidłowe dane logowania mordo",
                                   used_players=used_aliases)

        session["user_id"] = user["id"]
        session["first_name"] = user["first_name"]
        session["last_name"] = user["last_name"]
        session["player_alias"] = user["player_alias"]
        session["is_admin"] = user["is_admin"]

        conn.close()
        return redirect("/")

    conn.close()
    return render_template("login.html", used_players=used_aliases)

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# -----------------------------------------
# PANEL ADMINA
# -----------------------------------------

@app.route("/admin")
def admin_panel():
    if "user_id" not in session:
        return redirect("/login")
    if session.get("is_admin") != 1:
        return "Brak dostępu"

    conn = get_db()

    users = conn.execute(
        "SELECT id, first_name, last_name, player_alias, is_admin FROM users ORDER BY first_name"
    ).fetchall()

    used_aliases_rows = conn.execute("SELECT player_alias FROM users").fetchall()
    used_aliases = {row["player_alias"] for row in used_aliases_rows}
    available_players = [p for p in ALL_PLAYERS]

    upcoming_matches = conn.execute(
        "SELECT * FROM matches WHERE match_date >= date('now') AND played = 0 ORDER BY match_date, match_time"
    ).fetchall()

    past_not_confirmed = conn.execute(
        "SELECT * FROM matches WHERE match_date < date('now') AND played = 0 ORDER BY match_date DESC, match_time DESC"
    ).fetchall()

    played_matches = conn.execute(
        "SELECT * FROM matches WHERE played = 1 ORDER BY match_date DESC, match_time DESC"
    ).fetchall()

    all_matches = conn.execute(
        "SELECT * FROM matches ORDER BY match_date DESC, match_time DESC"
    ).fetchall()

    signups = conn.execute("""
        SELECT ms.match_id, ms.user_id, ms.paid,
               u.first_name, u.last_name, u.player_alias
        FROM match_signups ms
        JOIN users u ON u.id = ms.user_id
        ORDER BY u.first_name
    """).fetchall()

    conn.close()

    return render_template(
        "admin.html",
        users=users,
        available_players=available_players,
        upcoming_matches=upcoming_matches,
        past_matches=past_not_confirmed,
        played_matches=played_matches,
        all_matches=all_matches,
        signups=signups
    )

@app.route("/admin/match/<int:match_id>/set_played", methods=["POST"])
def set_played(match_id):
    conn = get_db()
    conn.execute(
        "UPDATE matches SET played = 1 WHERE id = ?",
        (match_id,)
    )
    conn.commit()
    conn.close()
    return redirect("/terminarz")

# -----------------------------------------
# LISTA PIŁKARZY
# -----------------------------------------

@app.route("/pilkarze")
def pilkarze():
    conn = get_db()
    players = conn.execute(
        "SELECT id, first_name, last_name, player_alias FROM users ORDER BY first_name"
    ).fetchall()
    conn.close()
    return render_template("pilkarze.html", players=players)

# -----------------------------------------
# MECZE – dodawanie, zapisy, wypisy
# -----------------------------------------

@app.route("/terminarz/add", methods=["POST"])
def add_match():
    if "user_id" not in session or session.get("is_admin") != 1:
        return "Brak dostępu"

    date_val = request.form["date"]
    time = request.form["time"]
    location = request.form["location"]
    max_slots = request.form["max_slots"]

    conn = get_db()
    conn.execute(
        "INSERT INTO matches (match_date, match_time, location, max_slots, signed_up, played) VALUES (?, ?, ?, ?, 0, 0)",
        (date_val, time, location, max_slots)
    )
    conn.commit()
    conn.close()

    return redirect("/terminarz")

@app.route("/terminarz")
def terminarz():
    conn = get_db()
    matches = conn.execute("SELECT * FROM matches ORDER BY match_date ASC, match_time ASC").fetchall()

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

    today = date.today()
    upcoming_matches = []
    after_date_not_confirmed = []
    played_confirmed = []

    for m in matches:
        m_date = date.fromisoformat(m["match_date"])
        if m["played"] == 1:
            played_confirmed.append(m)
        else:
            if m_date >= today:
                upcoming_matches.append(m)
            else:
                after_date_not_confirmed.append(m)

    return render_template(
        "terminarz.html",
        matches=matches,
        upcoming_matches=upcoming_matches,
        after_date_not_confirmed=after_date_not_confirmed,
        played_confirmed=played_confirmed,
        players_by_match=players_by_match,
        user_signed=user_signed
    )

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

    m_date = date.fromisoformat(match["match_date"])
    if m_date < date.today() or match["played"] == 1:
        conn.close()
        return "Nie można zapisać się na mecz po terminie lub rozegrany."

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

@app.route("/terminarz/unsubscribe/<int:match_id>")
def unsubscribe_match(match_id):
    if "user_id" not in session:
        return redirect("/login")

    user_id = session["user_id"]
    conn = get_db()

    match = conn.execute("SELECT * FROM matches WHERE id = ?", (match_id,)).fetchone()
    if match is None:
        conn.close()
        return "Mecz nie istnieje"

    m_date = date.fromisoformat(match["match_date"])
    if m_date < date.today() or match["played"] == 1:
        conn.close()
        return "Nie można wypisać się z meczu po terminie lub rozegranego."

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

# -----------------------------------------
# ZAPIS Z EKRANU GŁÓWNEGO
# -----------------------------------------

@app.route("/signup_home/<int:match_id>")
def signup_home(match_id):
    if "user_id" not in session:
        return "NOT_LOGGED"

    user_id = session["user_id"]
    conn = get_db()

    match = conn.execute("SELECT * FROM matches WHERE id = ?", (match_id,)).fetchone()
    if match is None:
        conn.close()
        return "NO_MATCH"

    m_date = date.fromisoformat(match["match_date"])
    if m_date < date.today() or match["played"] == 1:
        conn.close()
        return "TOO_LATE"

    if match["signed_up"] >= match["max_slots"]:
        conn.close()
        return "FULL"

    already = conn.execute(
        "SELECT * FROM match_signups WHERE user_id = ? AND match_id = ?",
        (user_id, match_id)
    ).fetchone()

    if already:
        conn.close()
        return "ALREADY"

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

    return "OK"

# -----------------------------------------
# STATYSTYKI — POPUP + ZAPIS + WIDOK
# -----------------------------------------

@app.route("/stats/pending")
def stats_pending():
    if "user_id" not in session:
        return jsonify({"pending": False})

    user_id = session["user_id"]
    conn = get_db()

    row = conn.execute("""
        SELECT m.id, m.match_date, m.match_time, m.location
        FROM matches m
        JOIN match_signups s ON s.match_id = m.id
        WHERE s.user_id = ?
          AND m.played = 1
          AND NOT EXISTS (
                SELECT 1 FROM match_stats st
                WHERE st.user_id = ? AND st.match_id = m.id
          )
        ORDER BY m.match_date DESC, m.match_time DESC
        LIMIT 1
    """, (user_id, user_id)).fetchone()

    conn.close()

    if row:
        return jsonify({
            "pending": True,
            "match_id": row["id"],
            "date": row["match_date"],
            "time": row["match_time"],
            "location": row["location"]
        })

    return jsonify({"pending": False})

@app.route("/stats/save", methods=["POST"])
def stats_save():
    if "user_id" not in session:
        return "NOT_LOGGED"

    user_id = session["user_id"]
    match_id = request.form.get("match_id")
    goals = request.form.get("goals", 0)
    assists = request.form.get("assists", 0)
    distance = request.form.get("distance", 0)

    conn = get_db()

    conn.execute("""
        INSERT INTO match_stats (user_id, match_id, goals, assists, distance)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, match_id, goals, assists, distance))

    conn.commit()
    conn.close()

    return "OK"

if __name__ == "__main__":
    app.run(debug=True)
