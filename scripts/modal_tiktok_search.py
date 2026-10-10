"""YNOT TikTok discovery: deploy with modal deploy scripts/modal_tiktok_search.py.

CPU-only discovery worker; no video downloads, no FetchLayer.
TikTok's unofficial search may require browser cookies/network access and can fail.
"""
import os
import re
from datetime import datetime, timezone
import modal

app = modal.App("ynot-tiktok-search")
image = (modal.Image.debian_slim(python_version="3.11")
         .pip_install("TikTokApi>=7.3.0,<8", "playwright>=1.50,<2")
         .run_commands("python -m playwright install --with-deps chromium"))

@app.function(image=image, cpu=1, memory=2048, timeout=90)
async def search_tiktok_videos(query: str, limit: int = 24):
    from TikTokApi import TikTokApi
    query = str(query or "").strip()[:160]
    if not query:
        return {"ok": True, "videos": []}
    count = max(1, min(int(limit), 36))
    results = []
    seen = set()
    ms_token = os.getenv("TIKTOK_MS_TOKEN") or None
    try:
        async with TikTokApi() as api:
            await api.create_sessions(
                ms_tokens=[ms_token] if ms_token else None,
                num_sessions=1, sleep_after=3, browser="chromium",
                headless=True
            )
            response = await api.make_request(url="https://www.tiktok.com/api/search/item/full/", params={"keyword": query, "count": count, "cursor": 0, "source": "search_video"})
            for item in (response or {}).get("item_list", []):
                video_id = str(item.get("id") or item.get("video_id") or "")
                if not re.fullmatch(r"\\d{10,20}", video_id) or video_id in seen:
                    continue
                seen.add(video_id)
                author = item.get("author") or {}
                if not isinstance(author, dict):
                    author = {}
                username = str(author.get("uniqueId") or author.get("unique_id") or "").strip("@")
                cover = item.get("video") or {}
                stats = item.get("stats") or {}
                created = item.get("createTime") or item.get("create_time") or 0
                try:
                    created = int(created)
                except (ValueError, TypeError):
                    created = 0
                if created and created < int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp()):
                    continue
                results.append({
                    "id": video_id,
                    "username": username,
                    "url": f"https://www.tiktok.com/@{username or '_'}/video/{video_id}",
                    "caption": str(item.get("desc") or item.get("description") or "")[:500],
                    "thumbnail": str(cover.get("cover") or cover.get("originCover") or cover.get("dynamicCover") or ""),
                    "created_at": created,
                    "views": int(stats.get("playCount") or 0),
                    "likes": int(stats.get("diggCount") or 0),
                    "shares": int(stats.get("shareCount") or 0),
                    "saves": int(stats.get("collectCount") or 0),
                })
                if len(results) >= count:
                    break
        return {"ok": True, "videos": results}
    except Exception as exc:
        return {"ok": False, "videos": [], "error": type(exc).__name__ + ": " + str(exc)[:220]}
