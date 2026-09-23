---
name: worklog
description: 이번 push 에 담길 작업을 worklog/ 에 문서로 남긴다. pre-push 훅이 push 를 막았을 때, 또는 push 직전에 사용한다. "worklog", "작업 로그 남겨줘", "/worklog" 요청에 사용.
---

# worklog

push 한 번에 문서 한 개를 새로 만든다. 기존 문서는 고치지 않는다.

## 1. 범위 확인

```
git log --oneline @{push}..HEAD
git diff --name-only @{push}..HEAD
```

브랜치를 처음 push 하는 경우엔 `@{push}` 가 없다. 그때는
`$(git merge-base origin/develop HEAD)..HEAD` 를 범위로 쓴다.

## 2. 도메인 하나 고른다

| 변경 경로 | 도메인 |
|---|---|
| `frontend/` | `fe` |
| `backend/`, `db/`, `docker/`, `compose.yaml` | `be` |
| `ai/`, `engine/`, `eval/`, `rules/`, `seeds/`, `tools/`, `profiles/` | `ai` |
| 그 외 (`docs/`, `.github/`, 빌드·설정) | `etc` |

여러 도메인에 걸치면 변경 파일이 가장 많은 쪽 하나만 고른다. 문서는 한 개다.

## 3. 문서를 쓴다

경로: `worklog/<도메인>/<YYYY-MM-DD-HHmm>-<슬러그>.md` — 슬러그는 영문 케밥케이스.

```markdown
# <한 줄 제목>

- 브랜치: <브랜치명>
- 커밋: <short>..<short> (N개)

## 한 일

## 왜 이렇게 했나

## 남은 것 · 아는 문제
```

커밋 메시지와 diff 에서 실제로 읽히는 것만 쓴다. 추측으로 채우지 않는다.
"왜" 에 쓸 게 없으면 그 절은 지운다.

## 4. 커밋

```
git add worklog/
git commit -m "docs: worklog <슬러그>"
```

push 는 하지 않는다. 사용자가 한다.
