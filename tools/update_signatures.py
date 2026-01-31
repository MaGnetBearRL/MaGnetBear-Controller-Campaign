#!/usr/bin/env python3
"""
update_signatures.py — Fetches signature data from the published Google Sheet
and writes signatures.json for the campaign site.

Usage:
    python tools/update_signatures.py

The script:
    1. Fetches the published CSV from Google Sheets
    2. Counts total submissions
    3. Filters to only approved entries (approval_status = 'approved' or 'auto_approved')
    4. Extracts public_display_name values
    5. Writes data/signatures.json
"""

import csv
import json
import sys
from io import StringIO
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# ============================================================================
# CONFIGURATION
# ============================================================================

# Published Google Sheet CSV URL
SHEET_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vQ2OBJcuF8Ou9z2a9-68cLtIEV1nDSuWFhJpvhbbVsR9Z4Ez4m3HbtiKjUmKOsqaNXJjeM9Xs_zsyPa"
    "/pub?gid=867923593&single=true&output=csv"
)

# Column headers we care about
COL_APPROVAL_STATUS = "approval_status"
COL_PUBLIC_DISPLAY_NAME = "public_display_name"

# Approval statuses that count as "approved" for display
APPROVED_STATUSES = {"approved", "auto_approved"}

# Output path (relative to repo root)
OUTPUT_FILE = Path(__file__).parent.parent / "signatures.json"

# ============================================================================
# MAIN LOGIC
# ============================================================================

def fetch_csv(url: str) -> str:
    """Fetch CSV content from URL."""
    print(f"[Signatures] Fetching CSV from Google Sheets...")
    
    req = Request(url, headers={"User-Agent": "MaGnetBear-SignatureUpdater/1.0"})
    
    try:
        with urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            print(f"[Signatures] Fetched {len(content)} bytes")
            return content
    except HTTPError as e:
        print(f"[Signatures] HTTP Error {e.code}: {e.reason}")
        sys.exit(1)
    except URLError as e:
        print(f"[Signatures] URL Error: {e.reason}")
        sys.exit(1)


def parse_signatures(csv_content: str) -> dict:
    """
    Parse CSV and extract signature data.
    
    Returns:
        {
            "total_signatures": int,
            "approved_signatures": int,
            "entries": [str, ...]
        }
    """
    reader = csv.DictReader(StringIO(csv_content))
    
    total = 0
    approved_names = []
    
    for row in reader:
        total += 1
        
        status = row.get(COL_APPROVAL_STATUS, "").strip().lower()
        name = row.get(COL_PUBLIC_DISPLAY_NAME, "").strip()
        
        # Only include if status is approved/auto_approved AND has a display name
        if status in APPROVED_STATUSES and name:
            approved_names.append(name)
    
    print(f"[Signatures] Total submissions: {total}")
    print(f"[Signatures] Approved with names: {len(approved_names)}")
    
    return {
        "total_signatures": total,
        "approved_signatures": len(approved_names),
        "entries": approved_names
    }


def write_json(data: dict, output_path: Path) -> None:
    """Write data to JSON file with pretty formatting."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")  # trailing newline
    
    print(f"[Signatures] Wrote {output_path}")


def main():
    print("=" * 60)
    print("MaGnetBear Signature Wall Updater")
    print("=" * 60)
    
    # Fetch
    csv_content = fetch_csv(SHEET_CSV_URL)
    
    # Parse
    data = parse_signatures(csv_content)
    
    # Write
    write_json(data, OUTPUT_FILE)
    
    # Summary
    print()
    print("=" * 60)
    print(f"[OK] Total signatures:    {data['total_signatures']}")
    print(f"[OK] Approved to display: {data['approved_signatures']}")
    print(f"[OK] Output written to:   {OUTPUT_FILE.name}")
    print("=" * 60)
    
    # Show preview of names
    if data["entries"]:
        print()
        print("Preview of approved names:")
        for name in data["entries"][:10]:
            print(f"  - {name}")
        if len(data["entries"]) > 10:
            print(f"  ... and {len(data['entries']) - 10} more")


if __name__ == "__main__":
    main()
