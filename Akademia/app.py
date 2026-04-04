from flask import Flask, render_template, request, redirect, session, jsonify
from datetime import date
import sqlite3

from db import get_db
from stats import stats_bp

app = Flask(__name__)
app.secret_key = "DianaPolak"

# blueprinty
app.register_blueprint(stats_bp)

# ============================================================
# PANEL ADMINA (FRONT SPA)
# ============================================================

@app.route("/panel-admina")
def panel_admina():
    if "user_id" not in session:
        return redirect("/login")
    if session.get("is_admin") != 1:
        return "Brak dostępu"

    return render_template("admin.html")

@app.route("/admin")
def admin_redirect():
    return redirect("/panel-admina")
# ============================================================
# DASHBOARD API
# ============================================================

@app.route("/admin/summary")
def admin_summary():
    conn = get_db()
    players = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    matches = conn.execute("SELECT COUNT(*) AS c FROM matches").fetchone()["c"]
    stats = conn.execute("SELECT COUNT(*) AS c FROM match_stats").fetchone()["c"]
    conn.close()

    return jsonify({
        "players": players,
        "matches": matches,
        "stats": stats
    })


@app.route("/admin/activity")
def admin_activity():
    # Możesz tu dodać prawdziwe logi z bazy
    return jsonify([
        {"text": "System uruchomiony", "time": "2026-03-12 21:10"},
        {"text": "Panel admina aktywny", "time": "2026-03-12 21:05"}
    ])
# ============================================================
# USERS API
# ============================================================

@app.route("/admin/users")
def admin_users():
    conn = get_db()
    rows = conn.execute("""
        SELECT id, first_name, last_name, player_alias,
               CASE WHEN is_admin = 1 THEN 'admin' ELSE 'player' END AS role
        FROM users
        ORDER BY first_name
    """).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


@app.route("/admin/user/<int:user_id>")
def admin_user(user_id):
    conn = get_db()
    row = conn.execute("""
        SELECT id, first_name, last_name, player_alias,
               CASE WHEN is_admin = 1 THEN 'admin' ELSE 'player' END AS role
        FROM users WHERE id = ?
    """, (user_id,)).fetchone()
    conn.close()

    return jsonify(dict(row))


@app.route("/admin/user/<int:user_id>", methods=["PUT"])
def admin_user_edit(user_id):
    data = request.json
    conn = get_db()
    conn.execute("""
        UPDATE users
        SET first_name = ?, last_name = ?, player_alias = ?, is_admin = ?
        WHERE id = ?
    """, (
        data["first_name"],
        data["last_name"],
        data["player_alias"],
        1 if data["role"] == "admin" else 0,
        user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/admin/user/<int:user_id>", methods=["DELETE"])
def admin_user_delete(user_id):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})


@app.route("/admin/user/<int:user_id>/role", methods=["POST"])
def admin_user_role(user_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE users SET is_admin = ? WHERE id = ?",
        (1 if data["role"] == "admin" else 0, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "role_changed"})


# ============================================================
# MATCHES API
# ============================================================

@app.route("/admin/matches")
def admin_matches():
    conn = get_db()
    rows = conn.execute("""
        SELECT id, match_date AS date, match_time AS time,
               location, signed_up AS players_count
        FROM matches
        ORDER BY match_date DESC
    """).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


@app.route("/admin/match/<int:match_id>")
def admin_match(match_id):
    conn = get_db()
    row = conn.execute("""
        SELECT id, match_date AS date, match_time AS time, location
        FROM matches WHERE id = ?
    """, (match_id,)).fetchone()
    conn.close()

    return jsonify(dict(row))


@app.route("/admin/match/<int:match_id>", methods=["PUT"])
def admin_match_edit(match_id):
    data = request.json
    conn = get_db()
    conn.execute("""
        UPDATE matches
        SET match_date = ?, match_time = ?, location = ?
        WHERE id = ?
    """, (data["date"], data["time"], data["location"], match_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/admin/match/<int:match_id>", methods=["DELETE"])
def admin_match_delete(match_id):
    conn = get_db()
    conn.execute("DELETE FROM matches WHERE id = ?", (match_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})


# ============================================================
# STATS API
# ============================================================

@app.route("/admin/stats")
def admin_stats():
    conn = get_db()
    rows = conn.execute("""
        SELECT s.id,
               u.player_alias AS player_name,
               s.match_id,
               s.goals, s.assists, s.distance
        FROM match_stats s
        JOIN users u ON u.id = s.user_id
        ORDER BY s.id DESC
    """).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


@app.route("/admin/stat/<int:stat_id>")
def admin_stat(stat_id):
    conn = get_db()
    row = conn.execute("""
        SELECT id, goals, assists, distance
        FROM match_stats WHERE id = ?
    """, (stat_id,)).fetchone()
    conn.close()

    return jsonify(dict(row))


@app.route("/admin/stat/<int:stat_id>", methods=["PUT"])
def admin_stat_edit(stat_id):
    data = request.json
    conn = get_db()
    conn.execute("""
        UPDATE match_stats
        SET goals = ?, assists = ?, distance = ?
        WHERE id = ?
    """, (data["goals"], data["assists"], data["distance"], stat_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})
# ============================================================
# STARTOWE DANE
# ============================================================

ALL_PLAYERS = [
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Neymar", "Robert Lewandowski",
    "Kevin De Bruyne", "Erling Haaland", "Luka Modrić", "Karim Benzema", "Mohamed Salah",
    "Vinicius Jr", "Pedri", "Gavi", "Antoine Griezmann", "Harry Kane",
    "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Sergio Ramos", "Alisson Becker",
    "Thibaut Courtois", "Marc ter Stegen", "Virgil van Dijk", "Antonio Rüdiger", "Joshua Kimmich",
    "Heung-min Son", "Raheem Sterling", "Paulo Dybala", "Ángel Di María", "Martin Ødegaard"
]

def log_activity(user_id, action):
    conn = get_db()
    conn.execute(
        "INSERT INTO activity_log (user_id, action) VALUES (?, ?)",
        (user_id, action)
    )
    conn.commit()
    conn.close()


# ============================================================
# INICJALIZACJA BAZY
# ============================================================

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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


init_db()

# ============================================================
# STRONA GŁÓWNA
# ============================================================

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


# ============================================================
# REJESTRACJA
# ============================================================

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
            cursor = conn.execute(
                "INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?, ?, ?, ?)",
                (first_name, last_name, player_alias, is_admin)
            )
            conn.commit()

            new_user_id = cursor.lastrowid
            log_activity(new_user_id, "Utworzył konto")

        except sqlite3.IntegrityError:
            conn.close()
            return render_template("register.html", available_players=available_players,
                                   error="Ten piłkarz jest już zajęty.")

        conn.close()
        return redirect("/login")

    conn.close()
    return render_template("register.html", available_players=available_players)


# ============================================================
# LOGOWANIE
# ============================================================

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


# ============================================================
# LISTA PIŁKARZY
# ============================================================
# ============================================================
# TERMINARZ — MECZE
# ============================================================

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
    if "user_id" in session:
        for s in signups:
            if s["player_alias"] == session["player_alias"]:
                user_signed[s["match_id"]] = True

    players_data = {}
    for m in matches:
        mid = m["id"]
        plist = []
        for p in players_by_match.get(mid, []):
            fn = (p["first_name"] or "").strip()
            ln = (p["last_name"] or "").strip()
            initials = ""
            if fn:
                initials += fn[0]
            if ln:
                initials += ln[0]
            plist.append(
                {
                    "name": f"{fn} {ln}".strip(),
                    "alias": p["player_alias"] or "",
                    "initials": initials,
                    "paid": p["paid"],
                }
            )
        players_data[mid] = {
            "date": m["match_date"],
            "time": m["match_time"],
            "location": m["location"],
            "max": m["max_slots"],
            "players": plist,
        }

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
        players_data=players_data,
        user_signed=user_signed,
    )

# ============================================================
# TERMINARZ — DODAWANIE MECZU (ADMIN)
# ============================================================

@app.route("/terminarz/add", methods=["POST"])
def terminarz_add():
    if "user_id" not in session or session.get("is_admin") != 1:
        return "FORBIDDEN", 403

    data = request.get_json()

    conn = get_db()
    conn.execute("""
        INSERT INTO matches (match_date, match_time, location, max_slots, signed_up, played)
        VALUES (?, ?, ?, ?, 0, 0)
    """, (data["date"], data["time"], data["location"], data["max_slots"]))
    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})


# ============================================================
# TERMINARZ — POBIERANIE MECZU DO EDYCJI
# ============================================================

@app.route("/terminarz/get/<int:match_id>")
def terminarz_get(match_id):
    conn = get_db()
    row = conn.execute("""
        SELECT id, match_date, match_time, location, max_slots
        FROM matches
        WHERE id = ?
    """, (match_id,)).fetchone()
    conn.close()

    return jsonify(dict(row))


# ============================================================
# TERMINARZ — EDYCJA MECZU (ADMIN)
# ============================================================

@app.route("/terminarz/edit", methods=["POST"])
def terminarz_edit():
    if "user_id" not in session or session.get("is_admin") != 1:
        return "FORBIDDEN", 403

    data = request.get_json()

    conn = get_db()
    conn.execute("""
        UPDATE matches
        SET match_date = ?, match_time = ?, location = ?, max_slots = ?
        WHERE id = ?
    """, (data["date"], data["time"], data["location"], data["max_slots"], data["match_id"]))
    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})
@app.route("/pilkarze")
def pilkarze():
    conn = get_db()
    gracze = conn.execute("""
        SELECT id, first_name, last_name, player_alias
        FROM users
        ORDER BY first_name ASC
    """).fetchall()
    conn.close()

    return render_template("pilkarze.html", players=gracze)


# ============================================================
# ZAPISY NA MECZE
# ============================================================

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


# ============================================================
# STATYSTYKI — POPUP + ZAPIS
# ============================================================

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


# ============================================================
# STATYSTYKI GRACZA
# ============================================================

@app.route("/player_stats/<int:user_id>")
def player_stats(user_id):
    conn = get_db()

    user = conn.execute(
        "SELECT first_name, last_name, player_alias FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()

    stats = conn.execute("""
        SELECT m.match_date, m.match_time, m.location,
               s.goals, s.assists, s.distance
        FROM match_stats s
        JOIN matches m ON m.id = s.match_id
        WHERE s.user_id = ?
        ORDER BY m.match_date DESC
    """, (user_id,)).fetchall()

    conn.close()

    total_goals = sum(s["goals"] for s in stats)
    total_assists = sum(s["assists"] for s in stats)
    total_distance = sum(s["distance"] for s in stats)

    return jsonify({
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "player_alias": user["player_alias"],
        "matches": len(stats),
        "goals": total_goals,
        "assists": total_assists,
        "distance": total_distance,
        "games": [
            {
                "date": s["match_date"],
                "time": s["match_time"],
                "location": s["location"],
                "goals": s["goals"],
                "assists": s["assists"],
                "distance": s["distance"]
            }
            for s in stats
        ]
    })


# ============================================================
# START APLIKACJI
# ============================================================

if __name__ == "__main__":
    app.run(debug=True)
