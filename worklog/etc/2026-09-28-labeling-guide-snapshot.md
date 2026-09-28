# 라벨링 기준표 판단 로그를 스냅샷에 고정

- 브랜치: docs/labeling-guide
- 커밋: b3664a1 이후 1개 (+ origin/develop 위로 rebase)
- 주요파일: `docs/labeling_guide.md`

## 한 일

- `docs/labeling-guide` 를 origin/develop 위로 rebase 했다. 충돌 없음.
- PR #49 브랜치 도구(`d4dfcb4`)로 `--detail --blocked` 를 돌려 스냅샷을
  `data/snapshots/2026-09-28/` 에 고정했다. 레포에는 없다(gitignore).
  - `unclassified_detail.csv` 25행
  - `branch_blocked.csv` 7행
- 기준표 판단 로그 위에 "스냅샷 기준" 절을 넣었다. 생성 커밋·생성일·파일별
  행 수와 sha256, 원문 대조는 스냅샷 보유자(PM)만 가능하다는 점.
- 판단 로그 행을 스냅샷에 맞춰 26 -> 25 로 줄였다. 문서 맨 위 "판단 대상 목록"
  경로도 스냅샷 경로로 바꿨다(스냅샷 밖 CSV 와 대조하지 않는다는 규칙과 맞추려고).
- 1층 재료표 `layer1_material.csv` 를 스냅샷 폴더에 만들었다. 행마다 그룹·바이트 수·
  절단 신호·법인격 접두어·대조군 유무.

## 왜 이렇게 했나

- 판단 로그가 CSV 순위를 가리켜서, 버스 룰이 들어간 뒤 CSV 를 다시 뽑으면 미분류가
  24 -> 23 이 되고 번호와 상호가 어긋난다. 고정 ID 로 바꾸는 안도 있었지만 도구와
  로그 형식을 같이 바꿔야 해서, 지금은 스냅샷 고정으로 간다. 재검토 조건은 실카드
  검증 등으로 CSV 를 다시 뽑아야 할 때.

## 남은 것 · 아는 문제

- 기준 칸은 비어 있다. PM 이 채운다.
- rebase 한 브랜치라 원격에 올리려면 force push 가 필요하다.
