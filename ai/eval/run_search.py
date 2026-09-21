"""검색 골든셋 하네스. 청킹 전략을 A/B 로 재는 자다.

사용: python -m eval.run_search [--k 8] [--case RC-004]

채점은 랭킹된 청크 본문으로 한다. 조 전문으로 넓힌 본문으로 채점하면 9호와
13호가 같은 조에 있어 RC-007 의 must_not 이 구조적으로 깨진다.
"""

from __future__ import annotations

import argparse
import contextlib
import sys
from datetime import date
from pathlib import Path

import yaml

from pipeline.search import TIERS, Hit, connect, search

with contextlib.suppress(Exception):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GOLDEN = Path(__file__).parent / "golden.yaml"

# 귀속연도. 골든셋 기대값이 현행 조문 기준이다.
AS_OF = date(2026, 1, 1)

# 골든셋 stop_at 표기를 doc_type 값으로 옮긴다.
_TIER_OF = {"법령": "법령", "행정규칙": "행정규칙", "심판례·해석": "심판례해석", "판례": "판례"}


def query_of(case: dict) -> str:
    """집계 한 줄을 검색 질의로 바꾼다.

    ponytail: 카테고리명 한 단어로 시작한다. 업종·사유를 붙이거나 카테고리
              설명으로 넓히는 건 이 하네스 수치를 보고 정할 일이다.
    """
    return case["input"]["merchant_category"]


def _matches(hits: list[Hit], want: dict) -> bool:
    return any(
        h.statute_id == want["statute_id"] and want["must_contain"] in h.body for h in hits
    )


def run(case: dict, k: int) -> dict:
    """stop_at 까지의 위계를 훑어 상위 k 를 모은다."""
    stop = case["stop_at"]
    tiers = TIERS if stop == "보류" else TIERS[: TIERS.index(_TIER_OF[stop]) + 1]

    hits: list[Hit] = []
    with connect() as conn:
        for tier in tiers:
            hits += search(conn, query_of(case), tier, AS_OF, k)

    return {
        "id": case["id"],
        "found": [w for w in case["expect"] if _matches(hits, w)],
        "missed": [w for w in case["expect"] if not _matches(hits, w)],
        "violated": [w for w in case["must_not"] if _matches(hits, w)],
        "hits": hits,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="검색 골든셋 채점")
    ap.add_argument("--k", type=int, default=8, help="위계별 상위 k")
    ap.add_argument("--case", help="한 건만 (예: RC-004)")
    ap.add_argument("--show", action="store_true", help="실패 케이스의 상위 k 를 찍는다")
    args = ap.parse_args()

    cases = yaml.safe_load(GOLDEN.read_text(encoding="utf-8"))
    if args.case:
        cases = [c for c in cases if c["id"] == args.case]

    results = [run(c, args.k) for c in cases]
    hallucinated = sum(len(r["violated"]) for r in results)
    want = sum(len(r["found"]) + len(r["missed"]) for r in results)
    got = sum(len(r["found"]) for r in results)

    print(f"{'id':<8} {'재현율':<9} {'must_not':<9} 비고")
    for r, c in zip(results, cases):
        n = len(r["found"]) + len(r["missed"])
        recall = f"{len(r['found'])}/{n}" if n else "—(음성)"
        bad = "위반" if r["violated"] else "ok"
        note = ", ".join(w["statute_id"] for w in r["missed"] + r["violated"])
        print(f"{r['id']:<8} {recall:<9} {bad:<9} {note}")

    print(f"\n재현율 {got}/{want}   환각(must_not 위반) {hallucinated}건")

    if args.show:
        for r in results:
            if not (r["missed"] or r["violated"]):
                continue
            print(f"\n── {r['id']} 상위 {args.k} ──")
            for h in sorted(r["hits"], key=lambda x: -x.score)[: args.k]:
                sec = f"/{h.section}" if h.section else ""
                print(f"  {h.score:.5f} {h.statute_id}{sec}  {h.body[:60].strip()}")

    # 환각이 재현율보다 먼저다. 없는 근거를 지어내는 건 못 찾는 것보다 나쁘다.
    return 1 if hallucinated else 0


if __name__ == "__main__":
    sys.exit(main())
