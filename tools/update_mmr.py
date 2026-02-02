#!/usr/bin/env python3
"""
MaGnetBear MMR Update Script
Uses cookies.txt for authenticated API access, falls back to manual if needed.

Usage:
    python tools/update_mmr.py

Setup (one-time):
    1. Install browser extension "Get cookies.txt LOCALLY" (Chrome/Firefox)
    2. Visit https://rocketleague.tracker.network
    3. Export cookies for this site
    4. Save as: tools/cookies.txt
"""

import json
import os
import subprocess
import sys
import time
import http.cookiejar
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    import cloudscraper
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "cloudscraper"], check=True)
    import cloudscraper

try:
    from winotify import Notification, audio
    HAS_WINOTIFY = True
except ImportError:
    HAS_WINOTIFY = False


def send_notification(title, message, is_error=False):
    """Send Windows toast notification."""
    if not HAS_WINOTIFY:
        # Install winotify on first error
        if is_error:
            subprocess.run([sys.executable, "-m", "pip", "install", "winotify"], check=True)
            try:
                from winotify import Notification, audio
                toast = Notification(
                    app_id="MaGnetBear MMR Updater",
                    title=title,
                    msg=message,
                    duration="long"
                )
                toast.set_audio(audio.Default, loop=False)
                toast.show()
            except:
                pass
        return
    
    try:
        toast = Notification(
            app_id="MaGnetBear MMR Updater",
            title=title,
            msg=message,
            duration="long" if is_error else "short"
        )
        if is_error:
            toast.set_audio(audio.Default, loop=False)
        toast.show()
    except Exception as e:
        print(f"  (Notification failed: {e})")

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
COOKIES_FILE = SCRIPT_DIR / "cookies.txt"
RAW_FILE = PROJECT_ROOT / "data" / "trn-raw.json"
OUTPUT_FILE = PROJECT_ROOT / "data" / "mmr-data.json"
ARCHIVE_FILE = PROJECT_ROOT / "data" / "mmr-archive.json"  # Permanent historical record

# URLs
TRACKER_URL = "https://rocketleague.tracker.network/rocket-league/profile/epic/MaGnetBear/mmr?playlist=28"
API_URL = "https://api.tracker.gg/api/v1/rocket-league/player-history/mmr/41100349"

# Config
PLAYLIST_ID = 28
GC1_THRESHOLD = 1435

RANK_THRESHOLDS = [
    (1862, "Supersonic Legend"), (1635, "Grand Champion III"), (1535, "Grand Champion II"),
    (1435, "Grand Champion I"), (1176, "Champion III"), (1096, "Champion II"),
    (1016, "Champion I"), (936, "Diamond III"), (856, "Diamond II"), (776, "Diamond I"),
    (696, "Platinum III"), (616, "Platinum II"), (556, "Platinum I"),
    (496, "Gold III"), (436, "Gold II"), (376, "Gold I"),
    (316, "Silver III"), (256, "Silver II"), (196, "Silver I"),
    (136, "Bronze III"), (76, "Bronze II"), (0, "Bronze I"),
]

RANK_COLORS = {
    "Bronze": "rgba(139, 90, 43, 0.25)", "Silver": "rgba(169, 169, 169, 0.25)",
    "Gold": "rgba(212, 175, 55, 0.25)", "Platinum": "rgba(0, 182, 182, 0.25)",
    "Diamond": "rgba(37, 161, 213, 0.25)", "Champion": "rgba(142, 89, 225, 0.25)",
    "Grand Champion": "rgba(227, 150, 68, 0.25)", "Supersonic Legend": "rgba(251, 163, 177, 0.25)",
}


def get_rank(mmr):
    for i, (threshold, rank) in enumerate(RANK_THRESHOLDS):
        if mmr >= threshold:
            next_t = RANK_THRESHOLDS[i - 1][0] if i > 0 else threshold + 200
            div = min(4, int((mmr - threshold) / ((next_t - threshold) / 4)) + 1)
            return rank, div
    return "Unranked", 0


def load_archive():
    """Load existing archive data, or return empty structure if none exists."""
    if ARCHIVE_FILE.exists():
        try:
            with open(ARCHIVE_FILE, "r", encoding="utf-8") as f:
                archive = json.load(f)
                print(f"  Loaded archive with {len(archive.get('dataPoints', []))} points")
                return archive
        except Exception as e:
            print(f"  Warning: Could not load archive: {e}")
    return {"dataPoints": [], "lastUpdated": None}


def save_archive(archive):
    """Save archive to disk."""
    archive["lastUpdated"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    with open(ARCHIVE_FILE, "w", encoding="utf-8") as f:
        json.dump(archive, f, indent=2)
    print(f"  Archive saved with {len(archive['dataPoints'])} points")


def merge_with_archive(archive, new_points):
    """
    Merge new data points with existing archive.
    - Keeps all historical data from archive
    - Adds new data points
    - Dedupes by date (latest value wins for same date)
    - Returns merged list sorted by date
    """
    # Create dict keyed by date for easy merging
    merged = {}
    
    # Add archive points first
    for point in archive.get("dataPoints", []):
        date_key = point["date"][:10]  # YYYY-MM-DD
        merged[date_key] = point
    
    archive_count = len(merged)
    
    # Add/update with new points (newer data overwrites)
    for point in new_points:
        date_key = point["date"][:10]
        merged[date_key] = point
    
    new_count = len(merged) - archive_count
    if new_count > 0:
        print(f"  Added {new_count} new data points to archive")
    
    # Convert back to sorted list
    result = list(merged.values())
    result.sort(key=lambda x: x["date"])
    return result


def dedupe_to_daily(points):
    """
    Consolidate multiple data points per day to ONE per day.
    Takes the last (most recent) value for each day.
    """
    if not points:
        return points
    
    daily = {}
    for point in points:
        # Parse date and get just the date portion (YYYY-MM-DD)
        date_str = point["date"][:10]
        # Keep the latest value for each day (overwrites earlier ones)
        daily[date_str] = point
    
    # Convert back to list, sorted by date
    result = list(daily.values())
    result.sort(key=lambda x: x["date"])
    return result


def fill_daily_gaps(points):
    """
    Fill gaps between data points to show time passing.
    Only adds ONE point at the end of a gap (the day before next real data).
    This creates clean flat lines without cluttering with daily dots.
    """
    if len(points) < 2:
        return points
    
    filled = []
    for i, point in enumerate(points):
        filled.append(point)
        
        if i < len(points) - 1:
            # Get date portion only
            current_date_str = point["date"][:10]
            next_date_str = points[i + 1]["date"][:10]
            
            current_date = datetime.strptime(current_date_str, "%Y-%m-%d")
            next_date = datetime.strptime(next_date_str, "%Y-%m-%d")
            
            # If there's a gap of 2+ days, add ONE point at the end of gap
            # (the day before next data point, at current MMR)
            gap_days = (next_date - current_date).days
            if gap_days > 1:
                end_of_gap = next_date - timedelta(days=1)
                gap_point = {
                    "date": end_of_gap.strftime("%Y-%m-%dT00:00:00+00:00"),
                    "mmr": point["mmr"],
                    "rank": point["rank"],
                    "division": point["division"]
                }
                filled.append(gap_point)
    
    return filled


def consolidate_flat_periods(points):
    """
    Remove intermediate points in flat (same MMR) periods.
    Keeps only the START and END of consecutive same-MMR runs.
    This reduces visual clutter from lots of dots on flat lines.
    """
    if len(points) < 3:
        return points
    
    consolidated = [points[0]]  # Always keep first point
    
    i = 1
    while i < len(points):
        current = points[i]
        prev = consolidated[-1]
        
        # Check if this is part of a flat run (same MMR as previous)
        if current["mmr"] == prev["mmr"]:
            # Look ahead to find end of flat run
            j = i
            while j < len(points) and points[j]["mmr"] == prev["mmr"]:
                j += 1
            
            # j is now pointing to first different MMR (or end of list)
            # Keep only the last point of the flat run (j-1)
            if j - 1 > i:
                # There were multiple same-MMR points, skip to the last one
                consolidated.append(points[j - 1])
                i = j
            else:
                # Only one point at this MMR, keep it
                consolidated.append(current)
                i += 1
        else:
            consolidated.append(current)
            i += 1
    
    return consolidated


def extract_raw_points(api_data):
    """
    Extract raw data points from API response.
    These are the actual recorded data points (no gap filling).
    Used for archiving.
    """
    data = api_data.get("data", {})
    
    # Get Rumble playlist (ID 28)
    rumble_data = data.get(str(PLAYLIST_ID)) or data.get(PLAYLIST_ID)
    
    if not rumble_data:
        # Try to find any playlist with data
        for key, val in data.items():
            if isinstance(val, list) and len(val) > 0:
                rumble_data = val
                print(f"  Using playlist {key}")
                break
    
    if not rumble_data:
        raise ValueError("No playlist data found")
    
    points = []
    for e in rumble_data:
        rating = e.get("rating")
        date = e.get("collectDate")
        if rating and date:
            r, d = get_rank(rating)
            points.append({"date": date, "mmr": rating, "rank": r, "division": d})
    points.sort(key=lambda x: x["date"])
    
    return points


def build_display_data(points):
    """
    Build the display-ready data structure from data points.
    Applies deduplication, gap filling, and flat period consolidation.
    """
    if not points:
        raise ValueError("No data points")
    
    # Dedupe to one point per day
    display_points = dedupe_to_daily(points)
    # Fill gaps (adds end-of-gap points for flat lines)
    display_points = fill_daily_gaps(display_points)
    # Consolidate flat periods (remove intermediate same-MMR dots)
    display_points = consolidate_flat_periods(display_points)
    
    latest = display_points[-1]
    r, d = get_rank(latest["mmr"])
    mmr_vals = [p["mmr"] for p in display_points]
    
    bands = []
    for i, (t, rank) in enumerate(RANK_THRESHOLDS):
        nt = RANK_THRESHOLDS[i-1][0] if i > 0 else t + 200
        if nt >= min(mmr_vals) - 50 and t <= max(mmr_vals) + 50:
            color = next((c for k, c in RANK_COLORS.items() if rank.startswith(k)), "rgba(100,100,100,0.25)")
            if not any(b["name"] == rank for b in bands):
                bands.append({"name": rank, "minMmr": t, "maxMmr": nt, "color": color})
    bands.reverse()
    
    return {
        "profile": {"platform": "epic", "platformUsername": "MaGnetBear", "playlist": "Rumble", "playlistId": PLAYLIST_ID},
        "currentRating": {"mmr": latest["mmr"], "rank": r, "division": f"Division {d}", "matches": len(display_points)},
        "rankThresholds": {"gc1": 1435, "gc2": 1535, "gc3": 1635, "ssl": 1862},
        "rankBands": bands,
        "dataPoints": display_points,
        "lastUpdated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }


def find_chrome():
    for p in [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")]:
        if os.path.exists(p):
            return p
    return None


def fetch_with_cookies():
    """Try to fetch API data using cookies.txt + cloudscraper for Cloudflare bypass."""
    if not COOKIES_FILE.exists():
        return None, "No cookies.txt found"
    
    try:
        # Load cookies from Netscape format file
        jar = http.cookiejar.MozillaCookieJar(str(COOKIES_FILE))
        jar.load(ignore_discard=True, ignore_expires=True)
        print(f"  Loaded {len(list(jar))} cookies")
        
        # Create cloudscraper session with cookies
        scraper = cloudscraper.create_scraper()
        scraper.cookies = jar
        
        headers = {
            "Accept": "application/json",
            "Origin": "https://rocketleague.tracker.network",
            "Referer": "https://rocketleague.tracker.network/",
        }
        
        print(f"  Fetching from API...")
        response = scraper.get(API_URL, headers=headers, timeout=30)
        
        print(f"  Response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "data" in data:
                return data, None
            return None, "Invalid response format"
        elif response.status_code == 403:
            return None, "Cookies expired - re-export from browser (403)"
        else:
            return None, f"HTTP {response.status_code}"
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None, str(e)


def main():
    print()
    print("=" * 55)
    print("  MaGnetBear MMR Updater")
    print("=" * 55)
    
    data = None
    
    # Try cookies first
    print("\n  Trying auto-fetch with cookies...")
    data, error = fetch_with_cookies()
    
    if data:
        print("  Success! Got data from API.")
    else:
        print(f"  Auto-fetch failed: {error}")
        
        # Send notification if cookies expired
        if "403" in str(error) or "expired" in str(error).lower():
            send_notification(
                "MMR Updater: Cookies Expired!",
                "Re-export cookies from tracker.gg to continue auto-updates.",
                is_error=True
            )
        
        if not COOKIES_FILE.exists():
            print("""
  To enable auto-fetch:
    1. Install "Get cookies.txt LOCALLY" browser extension
    2. Visit tracker.gg and export cookies
    3. Save as: tools/cookies.txt
""")
        
        # Fall back to manual
        print("  Falling back to manual mode...")
        
        chrome = find_chrome()
        if chrome:
            subprocess.Popen([chrome, TRACKER_URL])
        else:
            import webbrowser
            webbrowser.open(TRACKER_URL)
        
        print("""
  Browser opened! Now:
  
  1. F12 -> Network tab -> F5 refresh
  2. Filter: player-history  
  3. Click request -> Response tab
  4. Ctrl+A -> Ctrl+C -> Save to: data/trn-raw.json
  
  Waiting for file...""")
        
        # Wait for file
        start = time.time()
        last_mtime = RAW_FILE.stat().st_mtime if RAW_FILE.exists() else 0
        
        while time.time() - start < 300:
            if RAW_FILE.exists() and RAW_FILE.stat().st_mtime > last_mtime:
                time.sleep(0.5)
                break
            time.sleep(1)
        else:
            print("\n  Timeout. Run again when ready.")
            return
        
        print("\n  File detected!")
        
        try:
            with open(RAW_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"  Error reading file: {e}")
            return
    
    print("  Processing...")
    
    try:
        # Extract raw points from API response
        new_points = extract_raw_points(data)
        print(f"  Got {len(new_points)} points from TRN")
        
        # Load existing archive
        archive = load_archive()
        
        # Merge new points with archive
        merged_points = merge_with_archive(archive, new_points)
        
        # Save updated archive (raw points, no gap filling)
        archive["dataPoints"] = merged_points
        save_archive(archive)
        
        # Build display data (with gap filling) from merged archive
        output = build_display_data(merged_points)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)
        
        gc_diff = output["currentRating"]["mmr"] - GC1_THRESHOLD
        print(f"\n  {output['currentRating']['rank']} {output['currentRating']['division']}")
        print(f"  MMR: {output['currentRating']['mmr']} ({gc_diff:+d} from GC1)")
        print(f"  Archive: {len(merged_points)} raw points")
        print(f"  Display: {len(output['dataPoints'])} points (with gap fill)")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n  Error: {e}")
        return
    
    # Git - show diff but don't auto-commit
    print("\n  Checking for changes...")
    os.chdir(PROJECT_ROOT)
    
    diff = subprocess.run(["git", "diff", "--quiet", "data/"], capture_output=True)
    if diff.returncode == 0:
        print("  No changes to commit.")
    else:
        print("  Changes detected in data/")
        print("  Run these commands to commit:")
        print(f'    git add data/mmr-data.json data/mmr-archive.json')
        print(f'    git commit -m "Update MMR [{datetime.now():%Y-%m-%d %H:%M}]"')
        print(f'    git push')
    
    print("\n  Done!")
    print("=" * 55)


if __name__ == "__main__":
    main()
