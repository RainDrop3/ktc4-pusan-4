# 카드내역 파서를 브라우저로 옮기고 업로드 화면을 실제 계약에 연결했다

- 브랜치: feature/card-parser-ts
- 커밋: 3725cc7..08f79c9 (5개)
- 주요파일: frontend/src/parser/index.ts, frontend/src/parser/kb.ts, frontend/src/parser/ibk.ts, frontend/src/parser/pipeline.ts, frontend/src/pages/Upload.tsx

## 한 일

- `frontend/src/parser/` 에 `tools/parsers/`(KB국민 · IBK기업)의 규칙을 옮겼다 (3725cc7, 6c77d93, 9094263, 08f79c9)
  - `primitives.ts` · `hash.ts`: 금액 · 날짜 · 할부 개월 · 사업자번호 해석, WebCrypto 기반 `fileHash`(`sha256:…`)와 `naturalKey`(앞 16자)
  - `detect.ts`: OLE 매직(KB)과 앞 64KiB HTML 표(IBK)로 형식을 고르고, 헤더로 승인내역 · 청구내역 · 판별불가를 가른다
  - `kb.ts`: SheetJS(`xlsx` 0.20.3, 동적 `import`)로 BIFF8 `.xls` 를 절대 셀 주소 격자로 읽고 요약 영역(0~5행)의 선언 조회기간을 뽑는다
  - `ibk.ts`: `DOMParser` 와 텍스트 노드 순회(`bsText`)로 HTML 위장 `.xls` 를 읽는다
  - `pipeline.ts`: 비거래 항목(`대상제외`) → 취소 상계(승인번호 1건 우선, 62일 폴백, 후보 여럿이면 `needsReview`) → 의료 업종 가림(`의료_마스킹_NN`) 순서로 후처리한다
  - `request.ts` · `index.ts`: 서버 검증기(`UploadRequestValidator`)가 배치 전체를 거절하는 행(날짜 · 금액 · 상호 누락, 승인번호 32자 초과)을 미리 가려내고 `UploadBatchRequest` 를 만든다
  - `samples.ts`: 실제 파일을 저장소에 넣지 않고 테스트와 목업 모드에서 쓸 인메모리 샘플을 만든다
- `/upload` 화면을 재작성해 브라우저 파서와 `POST /upload-batches` 에 이었다 (520454d)
  - `api.uploads.create(body, idempotencyKey)` 가 호출자가 넘긴 `Idempotency-Key` 를 그대로 보내도록 고쳤다. 네트워크 오류 · 5xx 재시도는 같은 키를 유지하고, `IDEMPOTENCY_KEY_REUSED` · `IDEMPOTENCY_RESULT_DELETED` 뒤에는 새 키를 발급한다
  - `UploadBatchCreated`(201 응답 5필드) 타입을 두고, 새 거래가 들어왔을 때 `setBatchId(id)` 와 함께 `setRunId(null)` 로 이전 배치의 실행 폴링을 끊는다. 미분류 거래가 있으면 `/preview`, 없으면 `/interview` 로 이어지고, 모두 중복이면 세션을 유지한 채 `/uploads` 로 안내한다
  - 데이터 경계 문구를 실제 전송 항목(승인일 · 가맹점명 · 금액 · 할부 개월 · 승인번호 · 사업자번호 · 메모 · 파일 해시)과 일치시키고, 청구내역 안내는 카드사 이용(승인)내역 엑셀 저장 경로로 바꿨다
  - 쓰이지 않던 `src/mock/sampleFiles.ts` 와 `SessionContext` 의 `batch` · `setBatch` 를 걷어냈다
- `.github/workflows/aws-release.yml` 의 web 잡에 `npm test` 를 넣었다 (3725cc7)

검증:
- 단위 테스트 98건 통과 (`npm test`), `npm run lint` · `npm run build` 통과 (`xlsx` 청크 분리 확인)
- Python 파서 대조(`parity.test.ts`): 인메모리 샘플 7종 차이 0건, 실제 표본 5개(KB 승인내역 2개 · 27행/6행, IBK 승인내역 1개 · 150행, 은행 입출금 내역 2개 차단)에서 판별 결과와 행 · 필드 차이 0건

## 왜 이렇게 했나

- 의료 가림 행의 `naturalKey` 재료는 원본 상호 대신 고정 표시(`의료_마스킹`)로 바꿨다. 승인일 · 금액 · 승인번호가 평문으로 저장되므로 원본 상호를 해시하면 병원 이름 목록만으로 역추적할 수 있다. KB · IBK 승인내역은 승인번호가 모두 채워져 있어 거래별 고유성과 재업로드 중복 차단은 그대로 유지된다
- `branch` · `branchRaw` 는 보내지 않는다. 정규화 엔진이 백엔드(Java)로 옮겨졌으므로 브라우저에 사전을 복제하면 두 벌이 어긋난다
- 배치 기간은 KB 요약 영역에 선언된 조회기간이 있으면 그것을 쓰고, 선언 기간이 없는 IBK 는 보내는 거래의 최소 · 최대 승인일을 쓴다. 사용자가 내려받은 기간("1분기 내역")과 화면 표시가 어긋나지 않게 하려는 것이다
- 카드사 선택 드롭다운을 두지 않았다. KB(OLE 바이너리)와 IBK(HTML)는 물리 형식이 달라 내용으로 가를 수 있고, 잘못된 리더로 억지로 읽어도 헤더 판별에서 막힌다. 대신 앞 공백 · BOM · `<!doctype html>` 까지 허용해 형식 판별을 넓혔다
- SheetJS 를 `jsdom` 환경에서 돌릴 때 다른 realm 의 `ArrayBuffer` 가 들어오면 `instanceof ArrayBuffer` 검사를 통과하지 못해 빈 시트로 읽히는 문제가 있었다. `readKb` 가 현재 realm 의 `Uint8Array` 로 감싸 넘기도록 고쳤다

## 남은 것 · 아는 문제

- 백엔드 업로드 서비스가 정규화기로 `branch` · `branchRaw` 를 채우도록 트랙 B 와 맞춰야 한다
- 보내지 않은 행(날짜 · 금액 · 상호 누락 등)은 업로드 미리보기에서만 보여주고 서버에는 남기지 않는다. 업로드 뒤에도 건수 설명이 필요하면 배치 메타데이터 확장이 필요하다
- #130 업로드 엔드포인트가 배포된 뒤 실제 서버 환경에서 업로드 → 분류 확인 흐름을 한 번 더 확인해야 한다
