# LLM 호출을 Langfuse Cloud(Japan)로 추적

- 브랜치: feature/langfuse
- 커밋: 841a5fe..8cda347 (4개)
- 주요파일: ai/pipeline/llm.py, ai/pipeline/candidates.py, ai/app/config.py, deploy/compose.yaml

## 한 일

- `langfuse>=4.16` 의존성을 추가했다 (841a5fe)
- `llm.py` 의 `OpenAI` 를 `langfuse.openai` 것으로 바꿨다. `structured()` 호출이 모델·토큰·비용·지연·입출력과
  함께 기록된다 (a3249c9)
  - Langfuse 클라이언트는 모듈 import 때 settings 의 키로 만든다. 키가 비면 `tracing_enabled=False` 로 끈다
  - `langfuse_base_url` 기본값은 `https://jp.cloud.langfuse.com` 이다
  - `.env.example` · `deploy/production.env.example` · `compose.yaml` · `deploy/compose.yaml` 에
    `LANGFUSE_PUBLIC_KEY` · `LANGFUSE_SECRET_KEY` 를 넣었다
- `candidates.propose()` 에 `@observe()` 를 붙였다. 후보 1건의 rewrite · 검색 임베딩 · select · draft 가
  한 trace 로 묶인다 (486ee76)
- `structured()` 가 `name=schema.__name__` 을 넘긴다. 단계가 `SearchPlan` · `Evidence` · `RuleCardDraft` 로
  구분된다 (8cda347)

확인(로컬 DB, 카페/940909 1건, DB 는 롤백):
- trace 1개 = `propose` 아래 SearchPlan 988토큰 · 임베딩 32 · Evidence 14,471 · RuleCardDraft 985, 12.5초
- 키 변수가 없을 때와 빈 문자열일 때 모두 호출이 정상이다
- ruff · pytest 109 통과

## 왜 이렇게 했나

- Cloud 로 갔다(사용자 결정). v3 셀프호스팅은 ClickHouse · Redis · S3 가 필요해 운영 EC2(ai 512MB)에 무겁다
- 리전은 Japan 이다. 운영 EC2 가 서울(ap-northeast-2)이라 가장 가깝고, 리전 사이 이전은 안 된다
- 주소를 config 기본값으로 둔 이유
  - SDK 기본값이 EU 라 빠뜨리면 인증이 실패한다
  - compose 로 넘길 변수가 하나 준다
- 클라이언트를 `client()` 가 아니라 import 때 만드는 이유
  - `@observe` 가 `rewrite` 보다 먼저 돈다. 그때 클라이언트가 없으면 SDK 가 `os.environ` 에서 키를 찾는다
  - pydantic-settings 는 `.env` 를 `os.environ` 에 넣지 않아서 로컬에서 빈 trace 가 된다
- `tracing_enabled` 를 명시한 이유: compose 는 빈 변수를 `""` 로 넘기는데 SDK 는 `None` 일 때만 끈다
- `flush()` 는 넣지 않았다. SDK 가 atexit 에서 shutdown 하며 보낸다. 배치 종료 뒤 trace 가 들어온 것으로 확인했다
- `embed.py` 는 감싸지 않았다
  - `langfuse.openai` 는 import 만으로 openai 를 전역 패치한다. `llm` 을 import 한 프로세스는 임베딩도 기록된다
  - `reindex` 는 `llm` 을 import 하지 않는다. 재색인 임베딩 수천 건이 Hobby 한도(월 50k units)를 먹지 않는다

## 남은 것 · 아는 문제

- `eval/run_draft.py` 의 `@observe` 는 PR #81(같은 파일 수정 중) 머지 뒤로 미뤘다. 그전엔 하네스 호출이 하나씩 따로 남는다
- 운영 `/etc/ktc4/production.env` 에 키를 넣었다. 이 브랜치가 배포돼야 `deploy/compose.yaml` 이 ai 컨테이너에 넘긴다
- 키 변수가 아예 없으면 SDK 가 호출마다 `Authentication error ... Client will be disabled` 경고를 찍는다. 동작은 정상이다
- 9/16 이후 만든 Langfuse 조직은 옛 조회 API(`GET /api/public/traces/...`)가 410 이다. 스크립트로 읽을 땐
  `observations.get_many(fields=...)` 를 쓴다
- 후보 1건이 약 5 units 다
