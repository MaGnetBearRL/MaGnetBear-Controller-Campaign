#!/usr/bin/env python3
"""
Fetch MMR data from Tracker.gg using Playwright (headless browser)

This script is designed to run in GitHub Actions but can also run locally.
It intercepts the API response that the tracker.gg page makes and converts
it to the format used by the Road to GC chart.

Usage:
    pip install playwright
    playwright install chromium
    python tools/playwright_fetch_mmr.py
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError as e:
    print(f"ERROR: {e}")
    print("Run: pip install playwright && playwright install chromium")
    sys.exit(1)


# Configuration
TRACKER_URL = os.getenv(
    "TRACKER_URL",
    "https://rocketleague.tracker.network/rocket-league/profile/epic/MaGnetBear/mmr?playlist=28"
)
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "mmr-data.json"

# API endpoint pattern to intercept
API_PATTERN = "api.tracker.gg/api/v1/rocket-league/player-history/mmr"

# Rumble playlist ID
PLAYLIST_ID = 28

# GC1 threshold for Rumble
GC1_THRESHOLD = 1435

# Rank thresholds
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
        # Try to find any playlist with data
        for playlist in api_data.get("data", []):
            if "data" in playlist and len(playlist.get("data", [])) > 0:
                rumble_data = playlist
                print(f"  Using playlist ID: {playlist.get('attributes', {}).get('playlistId', 'unknown')}")
                break
    
    if not rumble_data:
        raise ValueError("Could not find Rumble playlist data")
    
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
    
    data_points.sort(key=lambda x: x["date"])
    
    if not data_points:
        raise ValueError("No data points found")
    
    # Get current rating
    latest = data_points[-1]
    current_rank, current_div = get_rank_from_mmr(latest["mmr"])
    
    # Build rank bands
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
    
    return {
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
            "ssl": 1862
        },
        "rankBands": rank_bands,
        "dataPoints": data_points,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }


def fetch_with_playwright():
    """Use Playwright with stealth to load the page and intercept the API response."""
    
    # Direct API URL for MMR history
    DIRECT_API_URL = "https://api.tracker.gg/api/v1/rocket-league/player-history/mmr/41100349"
    
    api_response_data = None
    intercepted_data = None
    
    def handle_response(response):
        nonlocal intercepted_data
        if "api.tracker.gg" in response.url and "player-history" in response.url:
            print(f"  [INTERCEPT] {response.url[:70]}...")
            try:
                data = response.json()
                if "data" in data:
                    intercepted_data = data
                    print(f"  [SUCCESS] Got {len(data.get('data', []))} playlists!")
            except:
                pass
    
    print("Starting Playwright with stealth mode...")
    
    with sync_playwright() as p:
        # Launch with stealth settings
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ]
        )
        
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
        )
        
        page = context.new_page()
        
        # Listen for API responses
        page.on("response", handle_response)
        
        print(f"Loading: {TRACKER_URL}")
        
        try:
            # Navigate like a real user
            page.goto(TRACKER_URL, wait_until="networkidle", timeout=60000)
            
            # Wait for chart
            print("  Waiting for chart...")
            page.wait_for_selector("svg, .chart, canvas", timeout=20000)
            
            # Give time for API call
            page.wait_for_timeout(5000)
            
            if intercepted_data:
                api_response_data = intercepted_data
            else:
                # Try direct API call with browser context
                print("  Trying direct API call...")
                api_response = page.request.get(DIRECT_API_URL, headers={
                    "Accept": "application/json, text/plain, */*",
                    "Referer": TRACKER_URL,
                    "Origin": "https://rocketleague.tracker.network",
                })
                
                if api_response.ok:
                    api_response_data = api_response.json()
                    print(f"  Direct API worked!")
                else:
                    print(f"  API Status: {api_response.status}")
            
        except Exception as e:
            print(f"  Error: {e}")
        
        browser.close()
    
    if not api_response_data:
        print("\n" + "=" * 60)
        print("AUTO-FETCH BLOCKED - Manual export required")
        print("=" * 60)
        print("""
Tracker.gg is blocking automated access. Here's the manual workaround:

1. Open in your browser:
   https://rocketleague.tracker.network/rocket-league/profile/epic/MaGnetBear/mmr?playlist=28

2. Open DevTools (F12) → Network tab → Refresh

3. Find request to: api.tracker.gg/api/v1/rocket-league/player-history/mmr/...

4. Right-click → Copy → Copy Response

5. Save to: data/trn-raw.json

6. Run: python tools/convert_trn_data.py
""")
        raise RuntimeError("Auto-fetch blocked. Use manual export (see instructions above).")
    
    return api_response_data


def main():
    print("=" * 60)
    print("MaGnetBear MMR Fetcher (Playwright)")
    print("=" * 60)
    print()
    
    # Fetch data using Playwright
    print("Step 1: Fetching data from Tracker.gg...")
    api_data = fetch_with_playwright()
    print("  Success!")
    print()
    
    # Parse and convert
    print("Step 2: Parsing API response...")
    output_data = parse_api_response(api_data)
    print(f"  Found {len(output_data['dataPoints'])} data points")
    print()
    
    # Save
    print("Step 3: Saving to file...")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
    
    print(f"  Saved to: {OUTPUT_FILE}")
    print()
    
    # Summary
    cr = output_data["currentRating"]
    gc_diff = cr["mmr"] - GC1_THRESHOLD
    print("=" * 60)
    print("Summary:")
    print(f"  Rank:     {cr['rank']} {cr['division']}")
    print(f"  MMR:      {cr['mmr']}")
    print(f"  To GC1:   {gc_diff:+d}")
    print(f"  Updated:  {output_data['lastUpdated']}")
    print("=" * 60)
    print()
    print("Done!")


if __name__ == "__main__":
    main()
