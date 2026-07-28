"""
Pull shot chart data for an NBA player (or team) via nba_api and write it to
a static JSON file the frontend fetches directly, plus register it in
public/data/manifest.json so the frontend can discover it for comparisons
(rookie vs current season, player vs player, playoffs vs regular season).

Usage:
    python scripts/fetch_shots.py --player "Luka Doncic" --season 2024-25
    python scripts/fetch_shots.py --player "Luka Doncic" --season 2024-25 --season-type Playoffs
    python scripts/fetch_shots.py --team "Dallas Mavericks" --season 2024-25

Coordinate convention (matches src/scene/court.js):
    x: sideline-to-sideline, -25..25 ft, 0 = court centerline
    z: baseline-to-halfcourt, 0..47 ft, 0 = baseline, 5.25 = rim

nba_api's raw LOC_X/LOC_Y are in tenths of a foot with the origin at the rim
(LOC_Y=0 at the rim, increasing away from the basket). We convert to feet and
shift z by RIM_Z=5.25 so it lines up with the court model.

Data NOT available from this endpoint, and therefore not in the output:
defender distance/shot-clock/live score margin (needs SportVU/tracking or
play-by-play data), video clip URLs, teammates on the floor. Filters/encodings
that depend on those are documented as unavailable in the frontend rather than
faked.
"""

import argparse
import json
import sys
import time
import unicodedata
from pathlib import Path

from team_colors import TEAM_COLORS

RIM_Z = 5.25

ZONE_GROUPS = {
    "paint": ["Restricted Area", "In The Paint (Non-RA)"],
    "mid": ["Mid-Range"],
    "three": ["Above the Break 3", "Left Corner 3", "Right Corner 3"],
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"


def slugify(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return ascii_name.strip().lower().replace(" ", "_")


def zone_group_of(zone_basic: str):
    for key, zones in ZONE_GROUPS.items():
        if zone_basic in zones:
            return key
    return None


def compute_league_efg(league_df) -> dict:
    totals = {key: {"fga": 0, "fgm": 0} for key in ZONE_GROUPS}
    for row in league_df.itertuples():
        key = zone_group_of(row.SHOT_ZONE_BASIC)
        if not key:
            continue
        totals[key]["fga"] += row.FGA
        totals[key]["fgm"] += row.FGM

    efg = {}
    for key, t in totals.items():
        if t["fga"] == 0:
            efg[key] = 0
            continue
        fg_pct = t["fgm"] / t["fga"]
        efg[key] = fg_pct * (1.5 if key == "three" else 1)
    return efg


def fetch_shots(player_id, team_id, season: str, season_type: str):
    from nba_api.stats.endpoints import shotchartdetail
    from nba_api.stats.static import teams as teams_static

    response = shotchartdetail.ShotChartDetail(
        team_id=team_id or 0,
        player_id=player_id or 0,
        season_nullable=season,
        season_type_all_star=season_type,
        context_measure_simple="FGA",
    )
    frame, league_df = response.get_data_frames()

    team_cache = {}

    def team_abbr(tid):
        if tid not in team_cache:
            team_cache[tid] = teams_static.find_team_name_by_id(int(tid))["abbreviation"]
        return team_cache[tid]

    shots = []
    games = {}
    for row in frame.itertuples():
        own_abbr = team_abbr(row.TEAM_ID)
        is_home = own_abbr == row.HTM
        opponent = row.VTM if is_home else row.HTM

        shots.append(
            {
                "x": round(row.LOC_X / 10, 2),
                "z": round(row.LOC_Y / 10 + RIM_Z, 2),
                "made": bool(row.SHOT_MADE_FLAG),
                "shotType": row.SHOT_TYPE,
                "actionType": row.ACTION_TYPE,
                "zone": row.SHOT_ZONE_BASIC,
                "distanceFt": row.SHOT_DISTANCE,
                "period": row.PERIOD,
                "minutesRemaining": row.MINUTES_REMAINING,
                "secondsRemaining": row.SECONDS_REMAINING,
                "date": row.GAME_DATE,
                "gameId": row.GAME_ID,
                "team": own_abbr,
                "opponent": opponent,
                "isHome": is_home,
            }
        )
        games[row.GAME_ID] = {
            "gameId": row.GAME_ID,
            "date": row.GAME_DATE,
            "opponent": opponent,
            "isHome": is_home,
        }

    team_color = TEAM_COLORS.get(team_abbr(frame.iloc[-1].TEAM_ID)) if len(frame) else None

    return {
        "shots": shots,
        "games": sorted(games.values(), key=lambda g: g["date"]),
        "leagueEfg": compute_league_efg(league_df),
        "teamColor": team_color,
    }


def update_manifest(entry_key: str, entry: dict):
    manifest = {}
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())
    manifest[entry_key] = entry
    manifest["latest"] = entry_key
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--player", help='Full player name, e.g. "Luka Doncic"')
    target.add_argument("--team", help='Full team name, e.g. "Dallas Mavericks"')
    parser.add_argument("--season", default="2024-25", help="e.g. 2024-25")
    parser.add_argument(
        "--season-type",
        default="Regular Season",
        choices=["Regular Season", "Playoffs"],
    )
    args = parser.parse_args()

    from nba_api.stats.static import players as players_static, teams as teams_static

    if args.player:
        matches = players_static.find_players_by_full_name(args.player)
        if not matches:
            sys.exit(f"No player found matching '{args.player}'")
        subject_id, subject_type, subject_name = matches[0]["id"], "player", matches[0]["full_name"]
        player_id, team_id = subject_id, None
    else:
        matches = teams_static.find_teams_by_full_name(args.team)
        if not matches:
            sys.exit(f"No team found matching '{args.team}'")
        subject_id, subject_type, subject_name = matches[0]["id"], "team", matches[0]["full_name"]
        player_id, team_id = None, subject_id

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Fetching {subject_name} shots for {args.season} ({args.season_type})...")
    start = time.time()
    result = fetch_shots(player_id, team_id, args.season, args.season_type)
    elapsed = time.time() - start

    made = sum(1 for s in result["shots"] if s["made"])
    data = {
        "subjectType": subject_type,
        "name": subject_name,
        "season": args.season,
        "seasonType": args.season_type,
        "shotCount": len(result["shots"]),
        "fgPct": round(made / len(result["shots"]), 4) if result["shots"] else 0,
        "teamColor": result["teamColor"],
        "leagueEfg": result["leagueEfg"],
        "games": result["games"],
        "shots": result["shots"],
    }

    slug = slugify(subject_name)
    season_type_slug = "playoffs" if args.season_type == "Playoffs" else "regular"
    entry_key = f"{slug}_{args.season}_{season_type_slug}"
    out_path = OUTPUT_DIR / f"{entry_key}.json"
    out_path.write_text(json.dumps(data, indent=2))

    update_manifest(
        entry_key,
        {
            "file": out_path.name,
            "subjectType": subject_type,
            "name": subject_name,
            "season": args.season,
            "seasonType": args.season_type,
            "shotCount": len(result["shots"]),
        },
    )

    print(f"Wrote {data['shotCount']} shots to {out_path} ({elapsed:.1f}s)")
    print(f"Updated {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
