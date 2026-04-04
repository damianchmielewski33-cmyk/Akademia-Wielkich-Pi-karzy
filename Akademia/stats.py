from flask import Blueprint, render_template, session, redirect
from db import get_db

stats_bp = Blueprint("stats_bp", __name__)

PT_GOAL = 5
PT_ASSIST = 2
PT_KM = 0.5
PT_SAVE = 2


def _rank_players(players, key, reverse=True):
    """Przy remisie ten sam numer miejsca (1, 1, 3 …). Drugi klucz: nazwa."""
    sorted_p = sorted(
        players,
        key=lambda x: (x[key], x["zawodnik"]),
        reverse=reverse,
    )
    out = []
    i = 0
    while i < len(sorted_p):
        val = sorted_p[i][key]
        j = i
        while j < len(sorted_p) and sorted_p[j][key] == val:
            j += 1
        rank = i + 1
        for k in range(i, j):
            row = dict(sorted_p[k])
            row["rank"] = rank
            out.append(row)
        i = j
    return out


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
               s.goals, s.assists, s.distance, s.saves
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


@stats_bp.route("/rankingi")
def rankingi():
    if "user_id" not in session:
        return redirect("/login")

    conn = get_db()
    rows = conn.execute("""
        SELECT u.player_alias AS zawodnik,
               COALESCE(SUM(s.goals), 0) AS goals,
               COALESCE(SUM(s.assists), 0) AS assists,
               COALESCE(SUM(s.distance), 0) AS distance,
               COALESCE(SUM(s.saves), 0) AS saves,
               COUNT(s.id) AS mecze
        FROM users u
        LEFT JOIN match_stats s ON s.user_id = u.id
        GROUP BY u.id, u.player_alias
    """).fetchall()
    conn.close()

    players = []
    for r in rows:
        g = int(r["goals"] or 0)
        a = int(r["assists"] or 0)
        d = float(r["distance"] or 0)
        sv = int(r["saves"] or 0)
        mecze = int(r["mecze"] or 0)
        punkty = PT_GOAL * g + PT_ASSIST * a + PT_KM * d + PT_SAVE * sv
        players.append({
            "zawodnik": r["zawodnik"],
            "goals": g,
            "assists": a,
            "distance": d,
            "saves": sv,
            "mecze": mecze,
            "punkty": round(punkty, 2),
        })

    ranking_gole = _rank_players(players, "goals")
    ranking_asysty = _rank_players(players, "assists")
    ranking_dystans = _rank_players(players, "distance")
    ranking_obrony = _rank_players(players, "saves")
    ranking_ogolny = _rank_players(players, "punkty")

    return render_template(
        "rankingi.html",
        ranking_gole=ranking_gole,
        ranking_asysty=ranking_asysty,
        ranking_dystans=ranking_dystans,
        ranking_obrony=ranking_obrony,
        ranking_ogolny=ranking_ogolny,
        pt_goal=PT_GOAL,
        pt_assist=PT_ASSIST,
        pt_km=PT_KM,
        pt_save=PT_SAVE,
    )
