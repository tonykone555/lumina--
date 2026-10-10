# Hugging Face Parquet video-search experiment

This is an **isolated research prototype**, not a YNOT production integration.

The `datasocial/tiktok-5.6B-videos` dataset is explicitly licensed **CC BY-NC 4.0**. Do not connect these records to YNOT's commercial storefront without separate commercial permission from its rights holder.

The dataset consists of monthly Parquet files and contains TikTok video IDs, captions, dates, hashtags, and engagement statistics. A query can inspect a remote monthly file without downloading videos.

```bash
pip install 'duckdb>=1.1'
python scripts/experiments/hf_tiktok_parquet_search.py --query 'dyson airwrap' --month 2026-09 --limit 10
```

Measure both latency and results. Even with column pruning, remote full-text scanning may take far longer than two seconds; a searchable prebuilt index is required for consistent fast lookup. TikTok video IDs must be validated against the official TikTok embed/oEmbed endpoint before display. The underlying public dataset records may include deleted or non-embeddable posts.

Future production path, subject to commercial data rights: build an index of video IDs plus search text, update it from permitted sources, and query the index from the product page. Do not serve remote Parquet scans directly to each visitor.
