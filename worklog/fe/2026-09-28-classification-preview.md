# 분류 결과 확인 화면과 API 레이어 v2

- 브랜치: `feature/classification-preview`
- 커밋: a703bac..11e1e49 (2개)
- 주요파일: `frontend/src/pages/ClassificationPreview.tsx`, `frontend/src/api/contract.ts`, `frontend/src/types/domain.ts`, `frontend/src/components/ui/Empty.tsx`

## 한 일

- `/preview` 화면을 만들었다. `GET /classification-reviews?grouped=true` 로 서버가 분류하지 못한 가맹점을 묶어 보여주고, 카테고리를 고르면 `POST /classification-responses` 로 확정한다. 확정한 그룹은 카드가 빠지고 진척 바·카운터가 줄어든다.
- 카드마다 그룹 안 거래를 승인일·카드사 표기·금액으로 나열한다. 4건까지 보이고 넘으면 「외 N건」이다.
- 한 가맹점이 카드사에서 여러 표기로 찍힌 경우(`PADDLE.NET* RAYCAST` / `TABLEPLUS` / `CURSOR AI`) 제목을 `groupKey` 의 정규화 이름(`Paddle`)으로 쓰고 표기 가짓수를 함께 적는다.
- 확인하지 않고 넘어가면 그 건이 판정에서 빠진다는 것을 화면 하단에 적었다.
- `ui/Empty` 부품을 추가하고 `/styleguide` 예시와 `DESIGN.md` 규칙을 함께 넣었다.
- 앞선 PR #39 에서 도메인 타입을 `docs/api.md` v2 와 1:1 로 맞췄다. 거래 상태를 `sourceStatus`·`userInclusion`·`effectiveStatus` 로 나누고, `Judgment.state` 를 빼고 `origin`·`outOfScope`·`ruleCardId`·`rulesCommitSha`·`userContextVersion` 을 넣었다.

## 왜 이렇게 했나

- **건별 내역을 붙인 이유**: 처음에는 「1건 · 47,000원」만 보여줬는데, 사용자가 그게 무슨 결제였는지 떠올릴 단서가 없다. 카드내역을 올린 지 며칠 지난 시점에 답하는 화면이라 날짜가 가장 중요한 단서다.
- **API 를 3번 호출한다**: `grouped=true` 응답에는 건별 정보가 없다(`api.md` 3.5 — `reviewIds`·`count`·`totalAmount`·`merchantRaw`·`suggestedCategories`). 개별 리뷰 목록과 거래 목록을 따로 받아 `merchantNorm` 으로 조인했다. 그룹 응답에 `transactionIds` 가 생기면 한 번으로 줄어든다.
- **제목을 정규화 이름으로**: 그룹의 `merchantRaw` 는 대표값 하나라, 표기가 여러 개인 그룹에서 첫 결제 표기가 3건 전체를 대표하는 것처럼 보였다.
- **상태색을 분류 상태에도 썼다**: `DESIGN.md` 는 상태색을 판정 결과에만 쓰도록 했는데, 계약이 분류 확인도 `NEEDS_REVIEW` 로 부르고 뜻도 「사람 확인이 필요하다」로 같아서 규칙 쪽을 넓혔다.
- **모션은 절제했다**: 진척 바 전환, 해결된 카드 퇴장, hover lift 뿐이다. 랜딩과 달리 판정·세무 화면에서 화려한 연출은 신뢰를 깎는다고 봤다.
- **분류 결과 전체 분포는 넣지 않았다**: 목업 거래가 30여 건이라 292건 헤더와 숫자가 맞지 않는다. 실데이터가 붙은 뒤 판단한다.

## 남은 것 · 아는 문제

- 데이터는 아직 `src/api/mock` 인메모리 구현이다. 백엔드가 붙으면 `src/api/index.ts` 한 줄을 http 구현으로 바꾼다. 배포 구성상 API 는 같은 오리진의 `/api/v1/*` 이므로(`deploy/Caddyfile`) base URL 만 있으면 된다.
- 목 서버가 두 개다. NestJS(`mock-server/`)는 상태를 들고 재판정·revision 을 흉내 내지만 PR #55 에서 제거 예정이고, Spring 쪽은 고정 응답이라 상태가 변하지 않는다. 그동안 프론트 데모는 자체 목업으로 돈다.
- `npm run lint` 경고 11건이 남아 있다. `Button.tsx` 의 구조분해 버림값(`_v`·`_s`)과 `SessionContext`·`Results` 의 react-refresh·exhaustive-deps 경고다. 오류는 0건이라 CI 는 통과한다.
- 이 브랜치가 fe 도메인 첫 worklog 다. 앞선 PR #32·#39 는 worklog 규칙이 생기기 전이거나 빠뜨렸다.
