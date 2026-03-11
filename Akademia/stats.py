from flask import Blueprint, render_template, session, redirect
from db import get_db

stats_bp = Blueprint("stats_bp", __name__)

@stats_bp.route("/statystyki")
def statystyki():
    if "user_id" not in session:
        return redirect("/login")

    conn = get_db()

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

    conn.close()

    return render_template(
        "statystyki.html",
        total_matches=total_matches,
        played_matches=played_matches,
        upcoming_matches=upcoming_matches,
        players_count=players_count
    )
