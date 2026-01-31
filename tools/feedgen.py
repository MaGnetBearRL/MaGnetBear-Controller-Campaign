# File: C:\Users\silver\dev\magnetbear-controller-campaign\tools\feedgen.py

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date, datetime
from typing import Any, Dict, List, Optional


def repo_root_from_this_file() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def load_json(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {"items": []}

    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON in {path}: {e}") from e

    if not isinstance(data, dict):
        raise RuntimeError(f"Expected JSON object at top-level in {path}")
    if "items" not in data or not isinstance(data["items"], list):
        data["items"] = []
    return data


def save_json(path: str, data: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def prompt(msg: str, default: Optional[str] = None) -> str:
    if default is not None and default != "":
        q = f"{msg} [{default}]: "
    elif default == "":
        q = f"{msg} [empty]: "
    else:
        q = f"{msg}: "
    out = input(q).strip()
    return out if out != "" else (default or "")


def prompt_multiline(msg: str) -> str:
    print(msg)
    print("Enter multiple lines. Submit an empty line to finish.")
    lines: List[str] = []
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)
    return "\n".join(lines).strip()


def is_https_url(url: str) -> bool:
    return url.startswith("https://")


def safe_https_url(url: str) -> str:
    url = url.strip()
    if not url:
        return ""
    if not is_https_url(url):
        raise RuntimeError(f"URL must be https:// (got: {url})")
    return url


YOUTUBE_ID_PATTERNS = [
    re.compile(r"^https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{6,})"),
    re.compile(r"^https://youtu\.be/([A-Za-z0-9_-]{6,})"),
    re.compile(r"^https://www\.youtube\.com/shorts/([A-Za-z0-9_-]{6,})"),
    re.compile(r"^https://www\.youtube\.com/embed/([A-Za-z0-9_-]{6,})"),
]


def extract_youtube_id(url: str) -> str:
    for pat in YOUTUBE_ID_PATTERNS:
        m = pat.search(url)
        if m:
            return m.group(1)
    return ""


def youtube_thumb_from_id(video_id: str) -> str:
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def ensure_relative_asset_path(p: str) -> str:
    p = p.strip().replace("\\", "/")
    if p.startswith("/"):
        p = p[1:]
    return p


def add_item_at_top(data: Dict[str, Any], item: Dict[str, Any]) -> None:
    items = data.get("items", [])
    if not isinstance(items, list):
        items = []
    items.insert(0, item)
    data["items"] = items


def make_links_interactive() -> List[Dict[str, str]]:
    links: List[Dict[str, str]] = []
    print("Add links? (label + url). Leave label empty to stop.")
    while True:
        label = prompt("Link label", default="")
        if label == "":
            break
        url = safe_https_url(prompt("Link url (https://...)"))
        links.append({"label": label, "url": url})
    return links


def make_media_interactive() -> Optional[Any]:
    print("Add media?")
    print("  1) image (local assets path, png/jpg/webp/gif)")
    print("  2) youtube preview card (auto thumbnail)")
    print("  3) embed iframe (spotify/youtube/etc embed URL)")
    print("  4) link card (label + url)")
    print("  5) none")
    choice = prompt("Choose 1-5", default="5")

    if choice == "5":
        return None

    if choice == "1":
        src = ensure_relative_asset_path(prompt("Image src (e.g. assets/img/example.png)"))
        alt = prompt("Alt text", default="Post image")
        return {"type": "image", "src": src, "alt": alt}

    if choice == "2":
        url = safe_https_url(prompt("YouTube URL (watch/shorts/youtu.be)"))
        vid = extract_youtube_id(url)
        if not vid:
            raise RuntimeError("Could not extract YouTube video id from that URL.")
        label = prompt("Card label", default="Watch on YouTube")
        thumb = youtube_thumb_from_id(vid)

        return {
            "type": "video",
            "platform": "youtube",
            "url": url,
            "thumb": thumb,
            "label": label,
        }

    if choice == "3":
        url = safe_https_url(prompt("Embed URL (e.g. https://open.spotify.com/embed/track/...)"))
        title = prompt("Embed title", default="Embedded media")
        height = prompt("Embed height (px)", default="352")
        return {"type": "embed", "url": url, "title": title, "height": int(height)}

    if choice == "4":
        label = prompt("Link label", default="Open link")
        url = safe_https_url(prompt("Link URL (https://...)"))
        return {"type": "link", "label": label, "url": url}

    raise RuntimeError("Invalid choice. Pick 1-5.")


def current_hhmm() -> str:
    now = datetime.now().astimezone()
    return now.strftime("%H:%M")


def current_tz_label() -> str:
    now = datetime.now().astimezone()
    tz = now.tzname() or ""
    return tz


def run_posts(posts_path: str) -> None:
    data = load_json(posts_path)

    d = prompt("Date (YYYY-MM-DD)", default=str(date.today()))
    t = prompt("Time (HH:MM)", default=current_hhmm())
    tz = prompt("TZ label (EST/EDT/ET)", default=current_tz_label())

    title = prompt("Title", default="Post")
    body = prompt_multiline("Body (multiline):")

    inline = prompt("Add inline link? (y/n)", default="n").lower().startswith("y")
    inline_link: Optional[Dict[str, str]] = None
    if inline:
        label = prompt("Inline link label", default="Link")
        url = safe_https_url(prompt("Inline link url (https://...)"))
        inline_link = {"label": label, "url": url}

    media = make_media_interactive()
    links = make_links_interactive()

    item: Dict[str, Any] = {
        "date": d,
        "title": title,
        "body": body,
    }

    if t.strip():
        item["time"] = t.strip()
    if tz.strip():
        item["tz"] = tz.strip()

    if inline_link:
        item["inlineLink"] = inline_link
    if media is not None:
        item["media"] = media
    if links:
        item["links"] = links

    print("\nNew POST item preview:\n")
    print(json.dumps(item, indent=2, ensure_ascii=False))

    ok = prompt("\nWrite to posts.json? (y/n)", default="y").lower().startswith("y")
    if not ok:
        print("Aborted. Nothing written.")
        return

    add_item_at_top(data, item)
    save_json(posts_path, data)
    print(f"Wrote post to: {posts_path}")


def run_updates(updates_path: str) -> None:
    data = load_json(updates_path)

    d = prompt("Date (YYYY-MM-DD)", default=str(date.today()))
    t = prompt("Time (HH:MM)", default=current_hhmm())
    tz = prompt("TZ label (EST/EDT/ET)", default=current_tz_label())

    title = prompt("Title", default="Update")
    body = prompt_multiline("Body (multiline):")
    links = make_links_interactive()

    item: Dict[str, Any] = {
        "date": d,
        "title": title,
        "body": body,
    }

    if t.strip():
        item["time"] = t.strip()
    if tz.strip():
        item["tz"] = tz.strip()

    if links:
        item["links"] = links

    print("\nNew UPDATE item preview:\n")
    print(json.dumps(item, indent=2, ensure_ascii=False))

    ok = prompt("\nWrite to updates.json? (y/n)", default="y").lower().startswith("y")
    if not ok:
        print("Aborted. Nothing written.")
        return

    add_item_at_top(data, item)
    save_json(updates_path, data)
    print(f"Wrote update to: {updates_path}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Add a new item to data/posts.json or data/updates.json"
    )
    parser.add_argument(
        "feed",
        choices=["posts", "updates"],
        help="Which feed to edit"
    )
    parser.add_argument(
        "--repo",
        default=repo_root_from_this_file(),
        help="Path to repo root (defaults to parent of tools/)"
    )
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)
    posts_path = os.path.join(repo, "data", "posts.json")
    updates_path = os.path.join(repo, "data", "updates.json")

    try:
        if args.feed == "posts":
            run_posts(posts_path)
        else:
            run_updates(updates_path)
        return 0
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
