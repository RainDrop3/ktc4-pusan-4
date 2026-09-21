"""하이브리드 검색 — 벡터와 pg_bigm 을 RRF 로 융합한다.

벡터만 쓰면 "3만원 초과"와 "5만원 초과"의 임베딩이 거의 같아 세법에서 판정을
가르는 숫자를 놓친다. 키워드만 쓰면 구어체 질문과 법률 문어체가 글자가 안 겹쳐
못 찾는다. 둘을 순위로 합치면 가중치를 안 정해도 된다.

키워드 쪽은 `=%` 가 아니라 LIKE 다. `=%` 는 길이가 비슷한 두 문자열의 유사도
검색용이라, 짧은 질의와 긴 조문 사이에서는 기본 임계값(0.3)을 못 넘어 통째로
죽는다(실측: '업무와 관련이 없다고 인정되는 금액' vs 소득세법-33-1-13 = 0.129).
pg_bigm 의 gin_bigm_ops 인덱스는 원래 LIKE 를 가속하라고 있는 것이다.
임계값을 낮추려면 shared_preload_libraries 가 필요한데 지금 비어 있기도 하다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import psycopg
from psycopg.rows import dict_row

from pipeline.embed import embed

# 상위 근거로 충분하면 아래로 안 내려간다. 순서를 코드로 강제한다.
TIERS = ["법령", "행정규칙", "심판례해석", "판례"]

# 기각된 청구인 주장이 근거로 인용되면 정반대 결론이 나간다.
SKIP_SECTIONS = ["주장"]

TOP_K = 8
CANDIDATES = 30
RRF_K = 60

_FILTER = """
    doc_type = %(tier)s
    AND is_superseded = false
    AND (effective_to IS NULL OR effective_to > %(on)s)
    AND (section IS NULL OR section <> ALL(%(skip)s))
"""

_SQL = f"""
WITH vec AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY d) AS rnk FROM (
        SELECT id, embedding <=> %(q_vec)s::vector AS d
          FROM legal_chunk WHERE {_FILTER}
         ORDER BY d LIMIT %(cand)s) t
), kw AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY s DESC) AS rnk FROM (
        SELECT id, bigm_similarity(body, %(q_text)s) AS s
          FROM legal_chunk WHERE {_FILTER} AND body LIKE '%%' || %(q_text)s || '%%'
         ORDER BY s DESC LIMIT %(cand)s) t
)
SELECT c.statute_id, c.doc_id, c.doc_type, c.hierarchy, c.section, c.body,
       COALESCE(1.0 / (%(rrf)s + vec.rnk), 0)
     + COALESCE(1.0 / (%(rrf)s + kw.rnk), 0) AS score
  FROM legal_chunk c
  LEFT JOIN vec ON c.id = vec.id
  LEFT JOIN kw  ON c.id = kw.id
 WHERE vec.id IS NOT NULL OR kw.id IS NOT NULL
 ORDER BY score DESC LIMIT %(k)s
"""


@dataclass(frozen=True)
class Hit:
    statute_id: str
    doc_id: str
    doc_type: str
    hierarchy: str
    section: str | None
    body: str
    score: float


def search(
    conn: psycopg.Connection,
    query: str,
    tier: str,
    on: date,
    k: int = TOP_K,
    q_vec: list[float] | None = None,
) -> list[Hit]:
    """한 위계만 뒤진다. 여러 위계를 볼 때는 q_vec 를 넘겨 임베딩을 한 번만 부른다."""
    vector = q_vec if q_vec is not None else embed([query])[0]
    rows = conn.execute(
        _SQL,
        {
            "q_vec": str(vector),
            "q_text": query,
            "tier": tier,
            "on": on,
            "skip": SKIP_SECTIONS,
            "cand": CANDIDATES,
            "rrf": RRF_K,
            "k": k,
        },
    ).fetchall()
    return [Hit(**r) for r in rows]


def search_tiers(conn: psycopg.Connection, query: str, on: date, k: int = TOP_K):
    """위계 순서대로 훑는다. '충분한가' 판정은 여기서 하지 않는다.

    조기 종료는 에이전트가 근거를 읽고 정하는 일이다. 검색이 점수 임계값으로
    끊으면 그 임계값 자체가 비결정성의 원천이 된다.
    """
    vector = embed([query])[0]
    for tier in TIERS:
        yield tier, search(conn, query, tier, on, k, q_vec=vector)


def expand(conn: psycopg.Connection, hits: list[Hit]) -> dict[str, str]:
    """법령 청크를 소속 조 전문으로 바꿔 돌려준다.

    항의 88%가 다른 조문을 참조해서 호 하나만 떼면 "제2항에도 불구하고"의
    제2항을 못 본다. 랭킹은 청크 단위로 유지하고 에이전트에게 넘길 때만 넓힌다.
    조 전문은 statute_version 에 이미 별도 행으로 있어 조인 한 번이면 된다.
    """
    wanted = {h.statute_id: "-".join(h.statute_id.split("-")[:2]) for h in hits if h.doc_type == "법령"}
    if not wanted:
        return {}
    rows = conn.execute(
        "SELECT statute_id, body FROM statute_version"
        " WHERE statute_id = ANY(%s) AND effective_to IS NULL",
        (list(set(wanted.values())),),
    ).fetchall()
    bodies = {r["statute_id"]: r["body"] for r in rows}
    return {sid: bodies[jo] for sid, jo in wanted.items() if jo in bodies}


def connect() -> psycopg.Connection:
    from app.config import settings

    return psycopg.connect(settings.database_url, row_factory=dict_row)
