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
| `backend/`, `db/`, `docker/`, `engine/`, `tools/` | `be` |
| `ai/`, `eval/`, `rules/`,  `profiles/` | `ai` |
| 그 외 (`docs/`, `.github/`, 빌드·설정) | `etc` |

위 표를 참고하되 절대적이진 않다. 작업 성격에따라 유연하게 도메인을 고른다.

여러 도메인에 걸치면 변경 파일이 가장 많은 쪽 하나만 고른다. 문서는 한 개다.

## 3. 문서를 쓴다

경로: `worklog/<도메인>/<YYYY-MM-DD>-<슬러그>.md` — 슬러그는 영문 케밥케이스.
같은 이름이 이미 있으면 슬러그를 더 구체적으로 바꾼다. 기존 문서는 덮어쓰지 않는다.

```markdown
# <한 줄 제목>

- 브랜치: <브랜치명>
- 커밋: <short>..<short> (N개)
- 주요파일: <파일명> (1~4개)

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

## 5. push

pre-push 훅에 막혀서 이 스킬을 실행한 경우에만, 막혔던 push 명령을 그대로 다시 실행한다.
문서가 범위에 들어갔으므로 이번엔 통과한다.

사용자가 직접 불러서 실행한 경우에는 커밋까지만 하고 push 하지 않는다.
올릴 생각이 없던 커밋까지 함께 올라가기 때문이다.
