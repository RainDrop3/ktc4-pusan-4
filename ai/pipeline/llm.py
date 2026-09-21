"""LLM 호출. 임베딩과 다른 엔드포인트·다른 키를 쓴다."""

from __future__ import annotations

from openai import OpenAI

from app.config import settings

MODEL = "gpt-4o-mini"


def client() -> OpenAI:
    if not settings.agent_api_key or not settings.agent_base_url:
        raise SystemExit("AGENT_API_KEY / AGENT_BASE_URL 이 .env 에 없습니다")
    return OpenAI(
        api_key=settings.agent_api_key,
        base_url=settings.agent_base_url,
        max_retries=5,
        timeout=60,
    )


def complete(system: str, user: str, api: OpenAI | None = None) -> str:
    api = api or client()
    res = api.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    return (res.choices[0].message.content or "").strip()
