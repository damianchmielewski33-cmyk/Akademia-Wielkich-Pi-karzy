from flask import Blueprint, render_template, session, redirect
from db import get_db

stats_bp = Blueprint("stats_bp", __name__)

@stats_bp.route("/statystyki")
def statystyki():
    if "user_id" not in session:
        return redirect("/login")

    conn = get_db()

    # Ogólne statystyki systemu
    total_matches = conn.execute(
        "SELECT COUNT(*) AS c FROM matches"
    ).fetchone()["c"]

    played_matches = conn.execute(
        "SELECT COUNT(*) AS c FROM matches WHERE played = 1"
    ).fetchone()["c"]

    upcoming_matches = conn.execute(
        "SELECT COUNT(*) AS c FROM matches WHERE match_date >= date('now') AND played = 0"
    ).fetchone()["c"]

    players_count = conn.execute(
        "SELECT COUNT(*) AS c FROM users"
    ).fetchone()["c"]

    # Statystyki użytkownika
    user_stats = conn.execute("""
        SELECT m.match_date, m.match_time, m.location,
               s.goals, s.assists, s.distance
        FROM match_stats s
        JOIN matches m ON m.id = s.match_id
        WHERE s.user_id = ?
        ORDER BY m.match_date DESC, m.match_time DESC
    """, (session["user_id"],)).fetchall()

    conn.close()

    return render_template(
        "statystyki.html",
        total_matches=total_matches,
        played_matches=played_matches,
        upcoming_matches=upcoming_matches,
        players_count=players_count,
        user_stats=user_stats
    )
