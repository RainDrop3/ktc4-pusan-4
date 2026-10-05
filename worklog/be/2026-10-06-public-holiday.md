# 공휴일 표와 공공 API 동기화

- 브랜치: feature/public-holiday
- 커밋: 1개
- 주요파일: HolidayApiClient.java, HolidaySync.java, HolidayCalendar.java, V6__create_public_holiday.sql

## 한 일

- V6 `public_holiday(holiday_date PK, name, fetched_at)` 를 추가했다. 판정에 넘길 평일 공휴일(대체·임시공휴일 포함)을 담는다.
- `HolidayApiClient`: 공공데이터포털 「한국천문연구원_특일 정보」 `getRestDeInfo?solYear=…&numOfRows=100&_type=json` 으로 한 해의 공휴일을 받는다.
  - `isHoliday=Y` 만 담는다.
  - 같은 날이 두 번 오면 이름을 합쳐 한 건으로 만든다.
  - resultCode 가 00 이 아니면 예외다. 게이트웨이 오류(`OpenAPI_ServiceResponse.errMsg`)도 메시지에 담는다.
  - 연결 3초, 읽기 5초 타임아웃.
- `HolidaySync`
  - `ApplicationReadyEvent` 와 매일 04:00 KST(`@Scheduled`)에 올해 앞뒤 1년을 동기화한다.
  - 받은 해는 그 해 행을 통째로 교체한다.
  - 실패하거나 빈 응답이면 기존 행을 유지한다. 키가 없으면 건너뛴다.
- `HolidayCalendar`: `publicHolidays()`(판정용 날짜 집합)와 `replaceYear` 를 둔다. 둘 다 `PublicHolidayRepository` 만 부른다.
- 설정 `app.holiday.base-url`·`app.holiday.api-key`(`HOLIDAY_API_KEY`). deploy `compose.yaml`·`production.env.example` 에 키를 추가하고, docs/deployment.md 에 7절 "공휴일 동기화" 를 넣었다.
- 테스트
  - `HolidayApiClientTest`(MockRestServiceServer): 키 인코딩, 1년치(같은 날 병합), 1건 객체, 0건 빈 문자열, 게이트웨이 오류, 키 유무.
  - `HolidaySyncIntegrationTest`: 연도만 교체, 실패·빈 응답이면 유지, 3개 연도 호출, 키 없으면 건너뜀.

## 왜 이렇게 했나

- 공휴일 처리 방식 결정(계획 문서 10/6 마감): 공공 API → DB 캐시. 판정은 API 를 직접 부르지 않고 표만 읽는다.
  - API 장애가 판정 실패로 번지지 않는다.
  - 같은 표를 읽는 동안 재판정 결과가 흔들리지 않는다.
- 판정 실행기(A2a)와 따로 올린다. 공휴일 기능은 판정 코드에 기대지 않고, 판정 쪽이 읽기만 한다. 그래서 다른 PR(#84·#88·#98)을 기다리지 않고 먼저 리뷰받을 수 있다. 로컬의 A2a 는 이 PR 위로 옮긴다.
- 응답 형식은 실제 API 로 확인했다. 그 응답(2025 1년치, 2025-12 1건, 2025-11 0건)을 그대로 테스트 샘플로 두었다. 응답에 키는 없다.
  - 연도만 넘기면 1년치가 온다(2024 19건, 2025 20건, 2026 22건, 2027 24건). 발표 전 연도(2030)는 0건이다.
  - 항목이 여럿이면 배열, 하나면 객체, 없으면 `items` 가 빈 문자열이다.
  - 2025-05-05 는 어린이날·부처님오신날이 겹친 날이라 두 건으로 온다. PK(holiday_date) 충돌을 막고 이름도 잃지 않도록 "어린이날, 부처님오신날" 한 행으로 합쳤다.
    - 판정은 날짜 집합만 쓴다. PK 를 (날짜, 이름)으로 바꾸는 건 이득이 없다.
    - `ON CONFLICT DO NOTHING` 은 두 번째 이름을 버린다.
- 키는 URI 변수로 넘긴다. `queryParam` 값으로 넣으면 '+' 가 인코딩되지 않아 공백으로 읽힌다.
  - 키는 Decoding 키여야 한다. Encoding 키를 넣으면 이중 인코딩되어 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` 가 난다(실제로 확인).
- 빈 응답으로 기존 행을 지우지 않는다. 다음 해는 발표 전이면 0건이 온다.
- 서비스에서 JdbcTemplate 으로 쿼리하던 초안을 리뷰("레포지토리와 서비스 계층은 분리") 에 따라 리포지토리로 옮겼다.

## 확인한 것

- `test`·`integrationTest` 전부 통과(209개).
- 실제 키로 `java -jar` 를 빈 Postgres 에 붙여 띄웠다. V1~V6 을 적용하고 기동한 직후 2025 19건, 2026 22건, 2027 24건이 들어갔다.

## 남은 것 · 아는 문제

- develop 에는 아직 `publicHolidays()` 를 부르는 코드가 없다. 판정 실행기(A2a)가 쓴다.
- 마이그레이션 V6 은 B2(#84)와 번호가 겹친다. 나중에 merge 되는 쪽이 develop 최신 +1 로 이름을 바꾼다.
- 운영 `/etc/ktc4/production.env` 에 `HOLIDAY_API_KEY`(Decoding 키)를 넣어야 동기화가 돈다.
- 동기화로 공휴일이 바뀌어도 기존 판정을 자동으로 다시 돌리지는 않는다.

## 06:00 Codex 리뷰 반영: 교체 직렬화, 잘린 응답 거부, 저장 실패 격리

- 커밋: 1개
- 주요파일: HolidayCalendar.java, PublicHolidayRepository.java, HolidayApiClient.java, HolidaySync.java

### 한 일

- Codex(gpt-5.6-sol, high) 리뷰 지적 3개를 모두 반영했다.
- `replaceYear` 가 시작할 때 `lock table public_holiday in share row exclusive mode` 를 건다(`PublicHolidayRepository.lockForReplace`). 교체끼리만 막고 판정의 조회는 막지 않는다.
- 받은 항목 수가 `totalCount` 와 다르면 `IllegalStateException` 을 던진다. 동기화는 이를 실패로 보고 기존 행을 유지한다.
- `HolidaySync.syncYear` 가 저장 예외도 잡아 경고만 남긴다.
- 테스트를 추가했다.
  - 통합: 첫 교체가 쓰고 커밋하기 전에 두 번째 교체가 들어와도, 결과가 두 번째 응답과 정확히 같다(합집합이 아님).
  - 단위: 잘린 응답("1 of 20")은 실패한다.
  - 단위: 저장이 실패해도 예외가 밖으로 나가지 않고 나머지 해는 계속 동기화한다. 2026-01-01 00:30 KST(UTC 로는 2025년)에 2025·2026·2027 을 고르는 것도 함께 확인한다.

### 왜 이렇게 했나

- 동시 교체: 잠금이 없으면 뒤 교체의 삭제가 앞 교체가 넣은 행을 보지 못한다(READ COMMITTED). 뒤 교체의 저장은 merge 라 겹치는 날만 갱신한다. 그래서 두 응답의 합집합이 남는다. 기동 직후와 04:00 이 겹치거나 서버가 둘일 때 생길 수 있다.
- 잘린 응답: 지금까지 그런 응답은 없었지만, 오면 빠진 공휴일이 조용히 지워진다. 검사는 한 줄이다.
- 저장 실패: API 예외만 잡고 저장 예외는 잡지 않아서, 기동 순간의 DB 순단이 `ApplicationReadyEvent` 를 거쳐 애플리케이션 기동 실패로 이어졌다.
- 기동이 최대 수십 초 늦어질 수 있다는 지적은 그대로 뒀다. 이 이벤트는 웹 서버가 요청을 받기 시작한 뒤에 돈다.

### 확인한 것

- `test`·`integrationTest` 전부 통과(212개).
- 일부러 깨 봤다.
  - 잠금 호출을 빼면 동시 교체 테스트가 실패한다(합집합이 남는다).
  - 저장 예외 처리를 빼면 저장 실패 테스트가 실패한다.
