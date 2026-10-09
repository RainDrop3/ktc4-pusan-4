from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    database_url: str = "postgresql://ktc4:ktc4-local@localhost:15432/ktc4"
    agent_api_key: str | None = None
    agent_base_url: str | None = None
    # 게이트웨이는 모델마다 엔드포인트가 달라 AGENT_BASE_URL 과 같이 바꾼다.
    agent_model: str = "gpt-4o-mini"
    # 추론 모델에만 준다. 받지 않는 모델에 보내면 게이트웨이가 400 으로 거절한다.
    agent_reasoning_effort: str | None = None
    embedding_api_key: str | None = None
    embedding_base_url: str | None = None
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_base_url: str = "https://jp.cloud.langfuse.com"
    law_api_oc: str = "test"
    team_discord_webhook: str | None = None

settings = Settings()