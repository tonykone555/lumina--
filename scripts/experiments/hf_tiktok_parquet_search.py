#!/usr/bin/env python3
"""Experimental DuckDB search over Hugging Face monthly TikTok Parquet.

NOT FOR PRODUCTION: datasocial/tiktok-5.6B-videos is CC BY-NC 4.0.
Usage: pip install 'duckdb>=1.1'
       python scripts/experiments/hf_tiktok_parquet_search.py --query "dyson airwrap" --month 2026-09 --limit 10
Reads remote Parquet columns; does NOT download/store video files.
"""
import argparse
import json
import re
import sys
import time

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--query",required=True)
    p.add_argument("--month",default="2026-09")
    p.add_argument("--limit",type=int,default=10)
    p.add_argument("--timeout-seconds",type=int,default=45)
    args=p.parse_args()
    if not re.fullmatch(r"20\d{2}-(?:0[1-9]|1[0-2])",args.month):
        p.error("invalid --month")
    if not (1<=args.limit<=30):p.error("--limit must be 1..30")
    q=" ".join(args.query.lower().split()).strip()
    if len(q)<3 or len(q)>100:p.error("query length must be 3..100")
    try:import duckdb
    except ImportError:sys.exit("Install duckdb first: pip install duckdb")
    path="hf://datasets/datasocial/tiktok-5.6B-videos/data/"+args.month+".parquet"
    db=duckdb.connect()
    db.execute("SET enable_progress_bar = false")
    # Remote queries must scan selected Parquet columns; LIMIT does not guarantee fast search.
    start=time.monotonic()
    sql="""
      SELECT CAST(video_id AS VARCHAR) AS id, caption,
             CAST(posted_at AS VARCHAR) AS posted_at,
             CAST(views AS BIGINT) AS views,
             hashtags
      FROM read_parquet(?)
      WHERE lower(coalesce(caption,'')) LIKE '%' || ? || '%'
      ORDER BY views DESC NULLS LAST
      LIMIT ?
    """
    try:
        rows=db.execute(sql,[path,q,args.limit]).fetchall()
        results=[{"id":x[0],"caption":x[1],"postedAt":x[2],"views":x[3],
                  "hashtags":x[4],"embedUrl":"https://www.tiktok.com/player/v1/"+x[0]} for x in rows]
        print(json.dumps({"query":q,"month":args.month,"elapsedSeconds":round(time.monotonic()-start,2),
                          "count":len(results),"results":results},ensure_ascii=False))
    finally:db.close()

if __name__=="__main__":main()
