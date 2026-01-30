#!/usr/bin/env python3
"""
Convert Tracker.gg API response to mmr-data.json format

Usage:
    1. Copy the API response JSON from browser DevTools
    2. Save it to data/trn-raw.json
    3. Run: py tools/convert_trn_data.py

Or pipe directly:
    py tools/convert_trn_data.py < raw_response.json
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Configuration
INPUT_FILE = Path(__file__).parent.parent / "data" / "trn-raw.json"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "mmr-data.json"

# Rumble playlist ID
PLAYLIST_ID = 28

# GC1 threshold for Rumble
GC1_THRESHOLD = 1435

# Rank thresholds for Rumble (approximate)
RANK_THRESHOLDS = [
    (1862, "Supersonic Legend"),
    (1635, "Grand Champion III"),
    (1535, "Grand Champion II"),
    (1435, "Grand Champion I"),
    (1176, "Champion III"),
    (1096, "Champion II"),
    (1016, "Champion I"),
    (936, "Diamond III"),
    (856, "Diamond II"),
    (776, "Diamond I"),
    (696, "Platinum III"),
    (616, "Platinum II"),
    (556, "Platinum I"),
    (496, "Gold III"),
    (436, "Gold II"),
    (376, "Gold I"),
    (316, "Silver III"),
    (256, "Silver II"),
    (196, "Silver I"),
    (136, "Bronze III"),
    (76, "Bronze II"),
    (0, "Bronze I"),
]

RANK_BAND_COLORS = {
    "Bronze": "rgba(139, 90, 43, 0.25)",
    "Silver": "rgba(169, 169, 169, 0.25)",
    "Gold": "rgba(212, 175, 55, 0.25)",
    "Platinum": "rgba(0, 182, 182, 0.25)",
    "Diamond": "rgba(37, 161, 213, 0.25)",
    "Champion": "rgba(142, 89, 225, 0.25)",
    "Grand Champion": "rgba(227, 150, 68, 0.25)",
    "Supersonic Legend": "rgba(251, 163, 177, 0.25)",
}


def get_rank_from_mmr(mmr):
    """Get rank name and division from MMR value."""
    for i, (threshold, rank) in enumerate(RANK_THRESHOLDS):
        if mmr >= threshold:
            next_threshold = RANK_THRESHOLDS[i - 1][0] if i > 0 else threshold + 200
            spread = next_threshold - threshold
            div_spread = spread / 4
            pos_in_rank = mmr - threshold
            division = min(4, int(pos_in_rank / div_spread) + 1)
            return rank, division
    return "Unranked", 0


def get_rank_color(rank):
    """Get the color for a rank's band."""
    for key, color in RANK_BAND_COLORS.items():
        if rank.startswith(key):
            return color
    return "rgba(100, 100, 100, 0.25)"


def load_input():
    """Load input from file or stdin."""
    # Try stdin first (for piping)
    if not sys.stdin.isatty():
        print("Reading from stdin...")
        return json.load(sys.stdin)
    
    # Otherwise read from file
    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        print()
        print("To use this script:")
        print("  1. Open https://rocketleague.tracker.network/rocket-league/profile/epic/MaGnetBear/mmr?playlist=28")
        print("  2. Open DevTools (F12) -> Network tab")
        print("  3. Refresh the page")
        print("  4. Find request to: api.tracker.gg/api/v1/rocket-league/player-history/mmr/...")
        print("  5. Right-click -> Copy -> Copy Response")
        print(f"  6. Save to: {INPUT_FILE}")
        print("  7. Run this script again")
        sys.exit(1)
    
    print(f"Reading from: {INPUT_FILE}")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_api_response(api_data):
    """Parse API response and convert to our JSON format."""
    
    # Find the Rumble playlist data
    rumble_data = None
    for playlist in api_data.get("data", []):
        playlist_id = playlist.get("attributes", {}).get("playlistId")
        if playlist_id == PLAYLIST_ID:
            rumble_data = playlist
            break
    
    if not rumble_data:
        # Maybe the data is structured differently - try alternate parsing
        if "data" in api_data and isinstance(api_data["data"], list):
            # Try to find any playlist with data
            for playlist in api_data["data"]:
                if "data" in playlist and len(playlist.get("data", [])) > 0:
                    rumble_data = playlist
                    print(f"Using playlist: {playlist.get('attributes', {}).get('playlistId', 'unknown')}")
                    break
    
    if not rumble_data:
        print("ERROR: Could not find Rumble playlist data in the response")
        print("Available playlists:", [p.get("attributes", {}).get("playlistId") for p in api_data.get("data", [])])
        sys.exit(1)
    
    # Extract data points
    data_points = []
    for entry in rumble_data.get("data", []):
        mmr = entry.get("rating")
        timestamp = entry.get("collectDate")
        
        if mmr is not None and timestamp:
            rank, division = get_rank_from_mmr(mmr)
            data_points.append({
                "date": timestamp,
                "mmr": mmr,
                "rank": rank,
                "division": division
            })
    
    # Sort by date
    data_points.sort(key=lambda x: x["date"])
    
    if not data_points:
        print("ERROR: No data points found in the response")
        sys.exit(1)
    
    print(f"Found {len(data_points)} data points")
    
    # Get current (latest) rating
    latest = data_points[-1]
    current_rank, current_div = get_rank_from_mmr(latest["mmr"])
    
    # Build rank bands based on data range
    mmr_values = [d["mmr"] for d in data_points]
    min_mmr = min(mmr_values) - 50
    max_mmr = max(mmr_values) + 50
    
    rank_bands = []
    seen_ranks = set()
    for i, (threshold, rank) in enumerate(RANK_THRESHOLDS):
        next_threshold = RANK_THRESHOLDS[i - 1][0] if i > 0 else threshold + 200
        
        if next_threshold < min_mmr or threshold > max_mmr:
            continue
        
        if rank in seen_ranks:
            continue
        seen_ranks.add(rank)
        
        rank_bands.append({
            "name": rank,
            "minMmr": threshold,
            "maxMmr": next_threshold,
            "color": get_rank_color(rank)
        })
    
    rank_bands.reverse()
    
    # Build output
    output = {
        "profile": {
            "platform": "epic",
            "platformUsername": "MaGnetBear",
            "playlist": "Rumble",
            "playlistId": PLAYLIST_ID
        },
        "currentRating": {
            "mmr": latest["mmr"],
            "rank": current_rank,
            "division": f"Division {current_div}",
            "matches": len(data_points)
        },
        "rankThresholds": {
            "gc1": GC1_THRESHOLD,
            "gc2": 1535,
            "gc3": 1635,
            "ssl": 1862,
            "comment": "Rumble thresholds"
        },
        "rankBands": rank_bands,
        "dataPoints": data_points,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }
    
    return output


def save_data(data):
    """Save data to JSON file."""
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    
    print(f"Saved to: {OUTPUT_FILE}")
    print(f"  Current: {data['currentRating']['rank']} {data['currentRating']['division']}")
    print(f"  MMR: {data['currentRating']['mmr']} ({data['currentRating']['mmr'] - GC1_THRESHOLD:+d} from GC1)")


def main():
    print("=" * 50)
    print("TRN Data Converter")
    print("=" * 50)
    print()
    
    api_data = load_input()
    output_data = parse_api_response(api_data)
    save_data(output_data)
    
    print()
    print("Done! Refresh your browser to see the updated chart.")


if __name__ == "__main__":
    main()
