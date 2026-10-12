# A1b·A2a·A2b 를 develop 위로 다시 쌓는다

- 브랜치: feature/judgment-origin (#118) → feature/judgment-executor (A2a) → feature/judgment-runs (A2b)
- 커밋: ca8270e..1ec9433 (A2a 4개), A2b 2개
- 주요파일: application.yml, JudgmentExecutor.java

## 한 일

- feature/judgment-origin(A1b)을 develop(4198b1a, #88·#114·#116 포함)으로 rebase 했다. 충돌은 없었다.
- A2a 는 B2·B1b 브랜치를 로컬 merge 한 위에 있었다. merge 두 개를 버리고 A2a 커밋만 A1b 위로 cherry-pick 했다.
  - A2a 의 `V9__create_public_holiday.sql` 을 뺐다. develop 에 같은 표가 V6(#99)으로 이미 있다.
  - `HolidayCalendar` 는 develop 쪽을 그대로 쓴다. `publicHolidays()` 가 같은 모양이라 실행기 코드는 바뀌지 않았다.
  - "공휴일 조회를 리포지토리로 옮긴다" 커밋(edd108a)과 그 worklog 절은 빼고 옮겼다. 같은 리포지토리 구조가 #99 로 develop 에 들어 있다.
  - `application.yml` 은 `app.holiday`(#99)와 `app.rules`(A2a)를 한 `app:` 아래로 합쳤다.
- A2b 는 A2a 위로 그대로 cherry-pick 했다. 충돌은 없었다.
- 2026-10-06-judgment-schema.md 의 A2a 절에 적힌 "V9 public_holiday", "HolidayCalendar(JdbcTemplate)", "B2·B1b 로컬 merge" 는 rebase 전 상태다. 지금은 위 내용이 맞다.

## 확인한 것

- 세 브랜치 각각 `gradlew -p backend check` 통과. A2b 브랜치 기준 test 288, integrationTest 62(실행기 6, run 5 포함).

## 남은 것 · 아는 문제

- 마이그레이션 번호는 A1b 의 V10 이 #117(V9) 뒤를 전제한다. #117 이 먼저 merge 되어야 한다.
- rebase 전 브랜치는 backup/judgment-executor-pre-rebase, backup/judgment-runs-pre-rebase 로 로컬에 남겼다.
