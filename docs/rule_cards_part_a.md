# 룰카드 초안 — 담당 A(사무·인프라)

2026-09-14 홍성진 / **검수 전 초안 v2**
대상: 페르소나 1(1인 사업자, 업종코드 940909, 간편장부·기준경비율)
스키마 근거: `backend/.../judgment/rule/RuleCardLoader.java`, `rules/categories.yaml`, `CONTEXT.md` §4·§6
**v2 변경 사유: PR #25(팀 평가셋 50건)에 카드를 걸어 본 결과 반영.** 대조 결과는 §7.

## 0. 요약

| 관문 | 장수 | ID |
|---|---:|---|
| G2 통상성 (차단형) | 24 | R-020~R-022, R-028~R-030, R-032~R-049 |
| G3 안분 (속성형) | 2 | R-070, R-071 |
| G4 자산·기간귀속 (속성형) | 3 | R-050, R-052, R-053 |
| G5 증빙 (속성형) | 1 | R-080 |
| **계** | **30** | |

전제: `categories.yaml` 에 **카테고리 6종 추가**(§3). 승인 전에는 R-022·R-044~R-048 여섯 장이 로딩에 실패합니다.

**ID 블록 (팀 확인 필요)** — R-020~049 A파트 G2 / R-050~059 G4 / R-070~079 G3 / R-080~089 G5.
CONTEXT 예시의 R-027(카페)·R-031(서버클라우드)·R-051(자산일반)은 비워 뒀습니다.
R-028(PG_미상 안전망)은 A 파트가 아니라 공통입니다. §7에서 구멍을 발견해 같이 써 뒀고 담당은 팀이 정해야 합니다.

**담당 범위** — 사무 + 인프라 + 여비교통 + 교육 + 수리비. (`차량`은 CONTEXT §G3에서 범위 밖 핸드오프)

**되묻기 어휘는 PR #25 평가셋을 따랐습니다** — `용도`(업무미팅/업무출장/업무용/개인), `전용여부`(전용/공용/개인). 새로 만든 fact_type 은 §4-8에 모아 뒀습니다.

---

## 1. G2 — 통상성 (차단형, verdict 필수)

### 1-1. 항상 가능

```yaml
# rules/cards/R-032_사무용품.yaml
id: R-032
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [사무용품] }
verdict: 가능
account: 소모품비
reason: "사업 운영에 통상적으로 필요한 사무용 소모품 구입액입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
evidence: [카드매출전표]
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-033_도서.yaml
id: R-033
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [도서] }
verdict: 가능
account: 도서인쇄비
reason: "직무 관련 지식 습득을 위한 도서 구입액입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ 업무 무관 도서가 같은 카테고리로 들어옵니다. 되묻기를 붙일지 검수 질문 §5-3.

```yaml
# rules/cards/R-030_교육.yaml
id: R-030
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [교육] }
verdict: 가능
account: 교육훈련비
reason: "직무 능력 유지·향상을 위한 강의료·교재비입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> PR #25 E-007이 **보류**입니다 — 본인 교육비를 직접 지목한 호가 없어 해석이 갈립니다. 세무사 확인 대상(§5-3).

```yaml
# rules/cards/R-034_광고선전.yaml
id: R-034
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [광고] }
verdict: 가능
account: 광고선전비
reason: "사업 홍보를 위한 광고 집행액입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-046_전문가수수료.yaml  ← 카테고리 신설 필요
id: R-046
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [전문가수수료] }
verdict: 가능
account: 지급수수료
reason: "사업과 관련한 세무·법무·회계 용역 대가입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ 원천징수 의무가 붙는 축이 따로 있습니다(§164 지급명세서). 이 카드는 경비 판정만 합니다.

```yaml
# rules/cards/R-048_배송.yaml  ← 카테고리 신설 필요
id: R-048
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [배송] }
verdict: 가능
account: 운반비
reason: "사업상 재화 운송에 지출한 택배·퀵 요금입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-022_수리비.yaml  ← 카테고리 신설 필요
id: R-022
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [수리비], amount_max: 5999999 }
verdict: 가능
account: 수선비
reason: "업무용 자산의 수선비입니다. 자산별 600만원 미만이면 자본적 지출에 포함하지 않고 당해 경비로 처리합니다."
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법시행령-67-3, 위계: 시행령 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> PR #25 E-044(노트북 수리비 35만원)가 지금 `기타`로 빠져 확인필요가 됩니다. 카테고리 신설로 푸는 자리입니다.

### 1-2. 업종에 따라 갈리는 것 (프로파일 자리)

```yaml
# rules/cards/R-038_해외SaaS.yaml
id: R-038
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match:
  category: [해외SaaS]
  industry: ["940909"]
  amount_max: 99999
verdict: 가능
account: 지급수수료
reason: "사업 운영에 직접 사용되는 해외 소프트웨어·클라우드 이용료입니다."
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법시행규칙-95의3-4, 위계: 시행규칙 }
evidence: [카드매출전표, 인보이스]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> **v2에서 두 가지를 좁혔습니다.**
> `industry` — PR #25 E-010(음식점 사업자의 클라우드 결제)이 제 v1 카드에서 **치명 오탐**으로 떨어졌습니다. 통상성은 업종에 따라 갈리는데 업종 무관 `가능`으로 못 박았던 탓입니다. 업종 프로파일이 생기면 `verdict_by_profile` 로 바뀔 자리입니다(§4-4).
> `amount_max` — 10만원 이상은 연간 선결제일 수 있어 R-029로 넘깁니다(E-043).

```yaml
# rules/cards/R-039_국내SW클라우드.yaml
id: R-039
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match:
  category: [국내SW]
  industry: ["940909"]
  amount_max: 99999
verdict: 가능
account: 지급수수료
reason: "사업 운영에 직접 사용되는 국내 소프트웨어·호스팅·협업도구 이용료입니다."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-029_구독_기간미확인.yaml
id: R-029
version: 1
gate: G2
priority: 505
effective_period: { start: 2025-01-01, end: null }
match:
  category: [해외SaaS, 국내SW, 구독서비스]
  amount_min: 100000
verdict: 확인필요
reason: "결제 금액만으로는 이 요금이 몇 개월치인지 알 수 없습니다. 이용 기간을 알려주시면 해당 연도 몫만 경비로 잡습니다."
question:
  code: SUBSCRIPTION_PERIOD
  text: "이 결제가 커버하는 이용 기간은 어떻게 되나요?"
  fact_type: 이용기간
  group_by: merchant
  options:
    - { value: 1개월, verdict: 가능, account: 지급수수료 }
    - { value: 1년, verdict: 가능, account: 지급수수료, 선급비용: true, 배분단위: 월, 배분개월: 12 }
    - { value: 1년초과, verdict: 확인필요, 선급비용: true }
citations:
  - { id: 소득세법-33-1-14, 위계: 법률 }
  - { id: 소득세법-39, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> **v1에서 이 자리를 G4에 뒀던 게 오탐의 원인이었습니다.** G2가 `가능`을 확정하면 뒤의 속성형 관문이 미응답이어도 판정을 못 낮춥니다(§4-1). 기간을 모르면 통상성 판단 자체가 안 선다고 보고 G2로 올렸습니다.
> priority를 505로 둔 이유: R-038·R-039와 금액 구간이 안 겹치지만, 겹치는 날이 와도 이 카드가 이기게 하려는 것입니다.

### 1-3. 용도로 갈리는 것 (되묻기)

```yaml
# rules/cards/R-040_구독서비스.yaml
id: R-040
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [구독서비스], amount_max: 99999 }
verdict: 확인필요
reason: "구독 결제는 업무용과 개인용이 같은 카테고리로 들어옵니다."
question:
  code: SUBSCRIPTION_PURPOSE
  text: "이 구독은 업무에 사용하시나요?"
  fact_type: 용도
  group_by: merchant
  options:
    - { value: 업무용, verdict: 가능, account: 지급수수료 }
    - { value: 개인, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-049_여비교통.yaml
id: R-049
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [여비교통] }
verdict: 확인필요
reason: "교통 결제는 업무 목적 이동과 개인 이동이 섞입니다."
question:
  code: TRAVEL_PURPOSE
  text: "이 이동은 업무 목적이었나요?"
  fact_type: 용도
  group_by: transaction
  options:
    - { value: 업무출장, verdict: 가능, account: 여비교통비 }
    - { value: 개인, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> `group_by`가 `transaction`인 이유: 같은 KTX라도 이번 건은 출장, 저번 건은 귀향일 수 있습니다. 가맹점 단위로 묶으면 한 번 답한 게 전부에 적용돼 오탐이 납니다(PR #25 E-032/E-033이 한 쌍으로 이걸 봅니다).

```yaml
# rules/cards/R-036_생활용품.yaml
id: R-036
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [생활용품] }
verdict: 확인필요
reason: "생활용품점 결제는 사무용품과 가사용품이 섞입니다."
question:
  code: SUPPLY_PURPOSE
  text: "이 결제는 어떤 용도였나요?"
  fact_type: 용도
  group_by: merchant
  options:
    - { value: 업무용, verdict: 가능, account: 소모품비 }
    - { value: 개인, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-045_전자기기.yaml  ← 카테고리 신설 필요
id: R-045
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [전자기기] }
verdict: 확인필요
reason: "전자기기 구매는 업무용 장비와 개인용 기기가 섞입니다."
question:
  code: DEVICE_PURPOSE
  text: "이 기기는 업무에 사용하시나요?"
  fact_type: 용도
  group_by: transaction
  options:
    - { value: 업무용, verdict: 가능, account: 소모품비 }
    - { value: 공용, verdict: 확인필요, 안분필요: true }
    - { value: 개인, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-044_임차료.yaml  ← 카테고리 신설 필요
id: R-044
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [임차료] }
verdict: 확인필요
reason: "사업장 임차료는 인정되지만, 자택 겸용이면 가사 관련 경비와 구분되어야 합니다."
question:
  code: LEASE_WORKPLACE
  text: "이 임차료는 어떤 공간에 대한 것인가요?"
  fact_type: 사업장형태
  group_by: merchant
  options:
    - { value: 별도사무실, verdict: 가능, account: 지급임차료 }
    - { value: 자택겸용, verdict: 확인필요, 안분필요: true }
    - { value: 주거전용, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
  - { id: 소득세법시행령-61, 위계: 시행령 }
evidence: [임대차계약서]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ 월세는 계좌이체가 많아 카드내역에 잘 안 찍힙니다. 공유오피스와 관리비가 주 대상입니다.

```yaml
# rules/cards/R-042_수도광열.yaml
id: R-042
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [수도광열] }
verdict: 확인필요
reason: "사업장이 자택 겸용이면 가사 관련 경비와 구분되어야 합니다."
question:
  code: WORKPLACE_TYPE
  text: "사업장 형태가 어떻게 되나요?"
  fact_type: 사업장형태
  group_by: transaction
  options:
    - { value: 별도사무실, verdict: 가능, account: 수도광열비 }
    - { value: 자택겸용, verdict: 확인필요, 안분필요: true }
    - { value: 주거전용, verdict: 불가 }
citations:
  - { id: 소득세법-33-1-5, 위계: 법률 }
  - { id: 소득세법시행령-61, 위계: 시행령 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ 사업장 형태는 원래 사업자 컨텍스트(`requires`)로 걸러야 하는데 스키마에 그 필드가 없습니다(§4-2).

```yaml
# rules/cards/R-041_통신.yaml
id: R-041
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [통신] }
verdict: 확인필요
reason: "업무 전용 회선인지에 따라 전액 경비인지 안분 대상인지가 갈립니다."
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> **v1에서 `가능`이었고, PR #25 E-038(공용 회선)에서 치명 오탐이 났습니다.** 안분 안 된 공용 회선 요금이 전액 경비로 나갔습니다. 되묻기는 G3(R-070)가 하고, 응답이 오면 거기서 `가능`/`불가`가 확정됩니다.

```yaml
# rules/cards/R-047_보험.yaml  ← 카테고리 신설 필요
id: R-047
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [보험] }
verdict: 확인필요
reason: "사업 관련 보험료와 본인·가족 보장성 보험이 같은 카테고리로 들어옵니다."
question:
  code: INSURANCE_KIND
  text: "어떤 보험의 보험료인가요?"
  fact_type: 보험종류
  group_by: merchant
  options:
    - { value: 사업장_재산_배상책임, verdict: 가능, account: 보험료 }
    - { value: 본인_보장성, verdict: 불가 }
    - { value: 기타, verdict: 확인필요 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-035_금융수수료.yaml
id: R-035
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [금융] }
verdict: 확인필요
reason: "금융 결제는 수수료·이자·개인 금융이 한 카테고리로 들어와 성격 확인이 필요합니다."
question:
  code: FINANCE_KIND
  text: "이 결제는 어떤 성격인가요?"
  fact_type: 지출성격
  group_by: merchant
  options:
    - { value: 은행수수료, verdict: 가능, account: 지급수수료 }
    - { value: 카드연회비, verdict: 가능, account: 지급수수료 }
    - { value: 사업용대출이자, verdict: 확인필요 }
    - { value: 개인금융, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```

### 1-4. 상호로 확정되는 것 (되묻기 없음)

```yaml
# rules/cards/R-020_국민연금.yaml
id: R-020
version: 1
gate: G2
priority: 700
effective_period: { start: 2025-01-01, end: null }
match:
  category: [금융]
  keyword: [국민연금]
verdict: 불가
reason: "국민연금 보험료는 필요경비가 아니라 종합소득공제(연금보험료공제) 대상입니다. 5월 신고 때 소득공제로 반영하세요."
citations: [{ id: 소득세법-27-1, 위계: 법률 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ **시행령 §55①11의3(지역가입자 보험료)을 인용하면 안 됩니다.** 그 호는 건강보험·노인장기요양보험만 열거합니다. PR #25 E-019가 `근거조문_제외`로 이걸 잡습니다.

```yaml
# rules/cards/R-021_건강보험료.yaml
id: R-021
version: 1
gate: G2
priority: 699
effective_period: { start: 2025-01-01, end: null }
match:
  category: [금융]
  keyword: [국민건강보험, 노인장기요양]
verdict: 가능
account: 보험료
reason: "직원 없는 1인 사업자는 지역가입자이고, 지역가입자 건강보험료·노인장기요양보험료는 필요경비에 산입합니다."
citations:
  - { id: 소득세법시행령-55-1-11의3, 위계: 시행령 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> **v1의 "알려진 미커버"가 여기서 풀렸습니다.** 되묻기로 보내면 "본인 보장성 → 불가"로 떨어지는데, 상호로 특정되는 항목이라 카드가 직접 판정하는 게 맞습니다.
> priority 699/700은 R-035(금융, 500)를 확실히 이기고 서로는 충돌 검사에 안 걸리게 한 값입니다.

### 1-5. 안전망

```yaml
# rules/cards/R-037_온라인쇼핑.yaml
id: R-037
version: 1
gate: G2
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [온라인쇼핑] }
verdict: 확인필요
reason: "종합몰 결제는 상호에 품목 정보가 없어 무엇을 샀는지 확인되지 않습니다."
review: { by: 미검수-초안, date: 2026-09-14 }
```
> 되묻기를 안 붙인 이유: 막힘 4층 중 **1층(입력)** 이라 사용자도 기억하지 못합니다. `unmatched_log.reason` 에 `규칙없음`이 아니라 `미분류`로 기록돼야 합니다.

```yaml
# rules/cards/R-043_기타_안전망.yaml
id: R-043
version: 1
gate: G2
priority: 410
effective_period: { start: 2025-01-01, end: null }
match: { category: [기타] }
verdict: 확인필요
reason: "분류되지 않은 지출입니다. 무엇에 쓰신 비용인지 알려주시면 판정할 수 있습니다."
review: { by: 미검수-초안, date: 2026-09-14 }
```

```yaml
# rules/cards/R-028_PG미상_안전망.yaml  ← 담당 미정
id: R-028
version: 1
gate: G2
priority: 410
effective_period: { start: 2025-01-01, end: null }
match: { category: [PG_미상] }
verdict: 확인필요
reason: "결제대행사를 거친 결제라 실제 가맹점이 확인되지 않습니다. 어떤 서비스 결제인지 알려주시면 판정할 수 있습니다."
review: { by: 미검수-초안, date: 2026-09-14 }
```
> `question`을 안 붙인 이유: PG 결제의 실제 가맹점은 선택지로 좁힐 수 없습니다(구글플레이 하나에 Onedrive·Gemini·GPT가 섞여 나옵니다). `pg_blocklist` 가 남기는 `matched_suffix` 힌트를 띄우고 자유 입력을 받는 쪽이 맞습니다.

---

## 2. G3 · G4 · G5 — 속성형

```yaml
# rules/cards/R-070_통신_안분.yaml
id: R-070
version: 1
gate: G3
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [통신] }
attributes: { 안분타입: 전용여부 }
question:
  code: TELECOM_DEDICATED
  text: "이 회선은 업무 전용인가요?"
  fact_type: 전용여부
  group_by: merchant
  options:
    - { value: 전용, verdict: 가능, account: 통신비, 안분율: 100 }
    - { value: 공용, verdict: 확인필요, 안분필요: true }
    - { value: 개인, verdict: 불가 }
citations:
  - { id: 소득세법-27-1, 위계: 법률 }
  - { id: 소득세법-33-1-5, 위계: 법률 }
  - { id: 소득세법기본통칙-33-3, 위계: 기본통칙 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> "몇 %인가"를 묻지 않는 이유는 CONTEXT §G3 그대로입니다 — 사용자도 답을 모르고 근거도 없습니다.
> §27①을 citations에 넣은 건 PR #25 E-037이 전용 회선의 근거로 그걸 요구하기 때문입니다.

```yaml
# rules/cards/R-071_면적안분.yaml
id: R-071
version: 1
gate: G3
priority: 500
effective_period: { start: 2025-01-01, end: null }
match: { category: [수도광열, 임차료] }
attributes: { 안분타입: 면적 }
question:
  code: HOME_OFFICE_AREA
  text: "작업공간이 전체 면적에서 차지하는 비율은 어느 정도인가요?"
  fact_type: 안분율
  group_by: merchant
  options:
    - { value: 전부_업무공간, verdict: 가능, 안분율: 100 }
    - { value: 일부_업무공간, verdict: 확인필요, 안분_직접입력: true }
    - { value: 업무공간_없음, verdict: 불가 }
citations:
  - { id: 소득세법-33-1-5, 위계: 법률 }
  - { id: 소득세법시행령-61, 위계: 시행령 }
  - { id: 소득세법기본통칙-33-3, 위계: 기본통칙 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ 비율은 숫자 입력이어야 하는데 `question.options` 가 문자열 목록이라 구간 선택으로 우회했습니다(§4-3).
> 비율을 **우리가 제안하지 않는다**는 원칙 때문에 옵션에 "30%" 같은 값을 넣지 않았습니다.

```yaml
# rules/cards/R-050_소액자산_즉시비용.yaml
id: R-050
version: 1
gate: G4
priority: 510
effective_period: { start: 2025-01-01, end: null }
match:
  amount_max: 1000000
  category: [사무용품, 전자기기, 생활용품, 온라인쇼핑]
attributes: { 즉시상각: true }
reason: "거래단위별 취득가액 100만원 이하 감가상각자산은 사업에 사용한 과세기간의 필요경비에 산입합니다."
citations: [{ id: 소득세법시행령-67-4, 위계: 시행령 }]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> **v2 신규.** PR #25 E-041은 100만원 이하 비품의 근거로 시행령 §67④를 요구하는데, v1에는 그 조문을 가진 카드가 100만원 **초과** 쪽(R-052)에만 있었습니다. 경계의 양쪽 모두 §67④가 근거입니다.

```yaml
# rules/cards/R-052_비품_자산화.yaml
id: R-052
version: 1
gate: G4
priority: 520
effective_period: { start: 2025-01-01, end: null }
match:
  amount_min: 1000001
  category: [전자기기, 사무용품, 온라인쇼핑, 생활용품]
attributes:
  자산: true
  내용연수: 5
  상각방법: 정액법
  자산대장_등재: true
  자산유형: 유형자산_비품
reason: "취득가액이 100만원을 넘어 감가상각자산으로 처리됩니다."
citations:
  - { id: 소득세법시행령-62, 위계: 시행령 }
  - { id: 소득세법시행령-67-4, 위계: 시행령 }
evidence: [자산대장 등재]
review: { by: 미검수-초안, date: 2026-09-14 }
```
> ⚠️ R-051(자산일반)과 match가 겹치므로 **공통 키의 값을 똑같이 맞춰야** 합니다(§4-7).
> ⚠️ `상각방법`은 CONTEXT §G4("무신고 시 유형자산은 정률법")와 R-051 예시(`정액법`)가 어긋납니다(§4-6).

```yaml
# rules/cards/R-053_소프트웨어_100만원초과.yaml
id: R-053
version: 1
gate: G4
priority: 520
effective_period: { start: 2025-01-01, end: null }
match:
  amount_min: 1000001
  category: [해외SaaS, 국내SW, 구독서비스]
question:
  code: SW_PURCHASE_TYPE
  text: "이 결제는 영구 라이선스 구매인가요, 기간 구독 선결제인가요?"
  fact_type: 결제유형
  group_by: merchant
  options:
    - { value: 영구라이선스, verdict: 확인필요, 자산: true, 자산유형: 무형자산_소프트웨어, 내용연수: 5, 상각방법: 정액법 }
    - { value: 연간_선결제, verdict: 가능, account: 지급수수료, 선급비용: true, 배분단위: 월, 배분개월: 12 }
    - { value: 월_구독, verdict: 가능, account: 지급수수료 }
citations:
  - { id: 소득세법-33-1-14, 위계: 법률 }
  - { id: 소득세법-39, 위계: 법률 }
  - { id: 소득세법시행령-62, 위계: 시행령 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> 영구 라이선스와 연간 선결제는 카테고리·금액만으로 구분이 안 돼 한 장의 되묻기로 합쳤습니다. PR #25 E-042가 보류인 것도 같은 이유(무형자산 해석)입니다.

```yaml
# rules/cards/R-080_국외공급_증빙예외.yaml
id: R-080
version: 1
gate: G5
priority: 500
effective_period: { start: 2025-01-01, end: null }
match:
  category: [해외SaaS]
  amount_min: 30001
attributes:
  적격증빙_의무: false
  가산세_대상: false
  부가세_매입세액공제: false
reason: "국외에서 공급받은 재화·용역은 적격증빙 수취 대상이 아니어서 증빙불비 가산세가 없습니다. 다만 부가가치세 매입세액은 공제되지 않습니다."
citations:
  - { id: 소득세법시행규칙-95의3-4, 위계: 시행규칙 }
  - { id: 소득세법-160의2, 위계: 법률 }
  - { id: 부가가치세법-39, 위계: 법률 }
review: { by: 미검수-초안, date: 2026-09-14 }
```
> **v2에서 `amount_min: 30001` 을 넣었습니다.** PR #25 E-012(3만원 이하)는 증빙 수취 의무 자체가 없어 `가산세_대상` 속성이 **아예 붙지 않아야** 한다고 봅니다(시행령 §208의2①1). v1은 금액과 무관하게 `false`를 붙여 미달이었습니다.

---

## 3. 카테고리 추가 요청 (PM 승인 필요) — 6종

분리 기준은 업종 세분화가 아니라 **G2에서 다르게 처리되는지**입니다.

| 신설 | 지금 어디로 가나 | 갈라야 하는 이유 |
|---|---|---|
| `임차료` | 기타 | 면적 안분이 걸리는 유일한 항목인데 카드를 못 붙인다 |
| `전자기기` | 온라인쇼핑 | 품목 불명(막힘 1층)이 된다. 갈라두면 되묻기 1회로 끝나고 G4 자산 match 도 좁아진다 |
| `전문가수수료` | 기타 | 항상 가능인데 확인필요로 나간다 |
| `보험` | 금융 | 사업 보험은 가능, 본인 보장성은 불가 |
| `배송` | 기타 | 항상 가능. 계정과목(운반비)이 따로다 |
| `수리비` | 기타 | **PR #25 E-044가 지금 여기서 막힌다.** 시행령 §67③1로 자산화하지 않고 당해 경비인데 `기타` 안전망이 확인필요로 내보낸다 |

승인되면 **파일 4개**를 같이 고쳐야 합니다. enum 한 줄만 넣으면 카드는 로딩되지만 어떤 거래에도 그 카테고리가 안 붙어 영원히 매칭되지 않습니다.

1. `rules/categories.yaml` — 목록에 6줄
2. `tools/validate_rules.py` 의 `CATEGORY_META` — 6항목. **기존 `금융` 메타 예시에서 "보험" 제거**
3. `rules/keyword_rules.yaml` — 신규 11룰. **기존 `priority: 720, "보험|은행|증권|카드사용료|연회비" → 금융` 에서 `보험|` 제거 필수**
4. `docs/categories.md` — `python tools/validate_rules.py --emit-categories` 로 재생성

```yaml
# rules/categories.yaml 에 추가
  # T4 에서 추가 (PM 승인 대기). 담당 A(사무·인프라) 룰카드 전제.
  - 임차료
  - 전자기기
  - 전문가수수료
  - 보험
  - 배송
  - 수리비
```

```python
# tools/validate_rules.py CATEGORY_META 에 추가
    "임차료": (["위워크", "패스트파이브"], "혼재", "자택 겸용이면 면적 안분 대상"),
    "전자기기": (["애플스토어", "하이마트"], "혼재", "100만원 초과면 비품(자산)"),
    "전문가수수료": (["세무사사무소", "법무사"], "업무용 가능", "원천징수 대상 여부는 별도 축"),
    "보험": (["삼성화재", "DB손해보험"], "혼재", "사업 보험과 본인 보장성 보험이 갈린다"),
    "배송": (["CJ대한통운", "우체국택배"], "업무용 가능", "계정과목은 운반비"),
    "수리비": (["컴퓨터수리센터", "AS센터"], "업무용 가능", "자산별 600만원 미만은 당해 경비"),
```

```yaml
# rules/keyword_rules.yaml 에 추가
  - { priority: 780, match: "위워크|WEWORK|패스트파이브|FASTFIVE|스파크플러스|SPARKPLUS", category: 임차료 }
  - { priority: 700, match: "공유오피스|관리사무소|임대관리", category: 임차료 }
  - { priority: 780, match: "애플스토어|APPLE\\s*STORE|삼성전자판매|베스트샵", category: 전자기기 }
  - { priority: 700, match: "하이마트|전자랜드|컴퓨존", category: 전자기기 }
  - { priority: 700, match: "세무사|회계사|법무사|변호사|노무사|법률사무소|특허법인", category: 전문가수수료 }
  - { priority: 760, match: "삼성화재|현대해상|DB손해보험|KB손해보험|메리츠화재|한화손해보험", category: 보험 }
  - { priority: 730, match: "손해보험|화재보험|보험료", category: 보험 }
  - { priority: 760, match: "CJ대한통운|한진택배|롯데택배|로젠택배|우체국택배", category: 배송 }
  - { priority: 700, match: "택배|퀵서비스", category: 배송 }
  - { priority: 750, match: "수리센터|AS센터|서비스센터|수리", category: 수리비 }
  - { priority: 800, match: "컴퓨터\\s*수리|노트북\\s*수리", category: 수리비, note: "전자기기 룰보다 먼저 걸려야 한다" }
```

**⚠️ 국민건강보험공단·국민연금공단은 `금융` 에 그대로 둬야 합니다.** PR #25 E-019·E-020이 `금융` 카테고리를 전제로 기대값을 잡았고, R-020·R-021이 그 위에서 상호 키워드로 판정합니다. `보험` 으로 옮기면 두 케이스가 깨집니다.

**반론에 대한 답.** `docs/keyword_rules_report.md` 의 338건 코퍼스에 이 6종 해당 건은 0건입니다. 다만 그 코퍼스는 학생 개인 카드라 편의점·카페·음식점이 53%를 차지합니다. 페르소나 1(사업자등록한 1인 사업자)의 카드내역에는 사무실 임차료·세무사 수수료가 당연히 들어오고, 수리비는 PR #25가 이미 케이스로 만들어 뒀습니다.

---

## 4. 스키마·설계 문제 8건 (팀)

1. **⭐ 차단형 G2가 `가능`을 확정하면 뒤의 속성형 관문이 판정을 못 낮춥니다.** 미응답 되묻기가 남아 있어도 `가능`으로 나갑니다. v1에서 공용 휴대폰 회선(E-038)과 연간 구독(E-043)이 전액 경비로 나가는 **치명 오탐**이 여기서 났습니다.
   지금은 카드 쪽에서 우회했습니다 — 통신은 G2를 확인필요로 낮추고(R-041), 기간 미확인 구독은 G4에 있던 판단을 G2로 올렸습니다(R-029). 하지만 우회이지 해결이 아닙니다. **"미응답 되묻기가 남아 있으면 판정을 확인필요로 강등"이라는 엔진 규칙**이 맞는 자리라고 봅니다. 논의 부탁드립니다.
2. **사업자 컨텍스트 필터가 카드에 없습니다.** `RuleMatch`는 category/keyword/amount/industry뿐입니다. 설계 문서의 `requires`(직원 유무·사업장 형태·기장의무)가 구현에 없어서 R-042·R-044를 되묻기로 우회했습니다.
3. **숫자 입력 되묻기가 불가능합니다.** `question.options`가 문자열 목록이라 안분율을 못 받습니다(R-071).
4. **업종 프로파일이 없어 `industry` 를 하드코딩했습니다.** R-038·R-039에 `industry: ["940909"]` 를 박았습니다. E-010(음식점 사업자의 클라우드 결제)을 막으려면 지금은 이 방법뿐인데, 업종이 늘면 카드가 업종 수만큼 늘어납니다. CONTEXT R-031 예시의 `verdict_by_profile` 이 이 자리인데 **로더가 그 키를 읽지 않습니다.**
5. **CONTEXT R-031 예시의 `category: [서버_클라우드]` 는 `categories.yaml` 에 없습니다.** 그대로 쓰면 검증 실패입니다.
6. **상각방법 기본값이 어긋납니다.** CONTEXT §G4는 "무신고 시 유형자산 정률법", R-051 예시는 `정액법`.
7. **`attributes` 충돌 검사 때문에 자산 카드를 늘리기 어렵습니다.** 조건 없는 R-051이 100만원 초과 거래 전부와 겹쳐서, 다른 자산 카드는 같은 키에 같은 값만 쓸 수 있습니다.
8. **되묻기 어휘에 표준이 없습니다.** v1에서 제가 `업무목적`으로 쓴 값이 PR #25에서는 `업무출장`이라 매칭이 안 됐습니다. `fact_type` 과 그 값의 어휘를 한 파일에 모아야 카드와 평가셋이 어긋나지 않습니다. 지금은 평가셋 쪽에 맞췄습니다.
   - 기존 어휘(PR #25): `용도` = 업무미팅 / 업무출장 / 개인 · `전용여부` = 전용 / 공용
   - 제가 새로 쓴 것: `용도` = **업무용** / **공용** 추가 · `사업장형태` = 별도사무실 / 자택겸용 / 주거전용 · `이용기간` = 1개월 / 1년 / 1년초과 · `보험종류` · `지출성격` · `결제유형` · `안분율`
   - `범위` 표기도 다릅니다 — 평가셋은 `merchant`, CONTEXT 카드 예시는 `merchant_norm`. 카드는 평가셋에 맞춰 `merchant` 로 통일했습니다.

---

## 5. 세무사 확인 질문 (9/18 상담)

1. 자택 겸용 사무실의 수도광열·월세 안분이 시행령 §61①1 후단 "주택 관련 경비"로 부인되는지. **R-042·R-044·R-071의 전제이고, PR #25 E-036이 같은 이유로 보류입니다.**
2. 업무 전용이 아닌 공용 휴대폰 회선의 실무상 인정 범위(E-038).
3. 사업자 본인 직무 교육비·도서 구입비에 업무 무관 항목이 섞였을 때의 실무 처리. **PR #25 E-007이 "본인 교육비를 직접 지목한 호가 없다"는 이유로 보류입니다.**
4. 해외 SaaS 결제가 카드전표만 있을 때 시행규칙 §95의3 4호로 증빙 의무가 면제되는지.
5. 100만원 초과 소프트웨어 영구 라이선스의 내용연수와 상각방법(E-042 보류).
6. 소액자산 즉시상각 기준금액 100만원의 예외(사업 개시·확장 취득, 대량보유) 범위. **E-045(맥북 350만원)가 시행령 §67⑦4 개인용 컴퓨터 특례와 충돌해 보류입니다.**
7. 1인 사업자의 보험료 중 필요경비가 되는 범위(사업장 화재·배상책임 vs 본인 보장성).

---

## 6. 근거 표기 원칙

- 시행령 §55 각 호의 호 번호는 원문 미확인이라 §55①11의3(PR #25에서 확인된 것)만 씁니다. 나머지 1차 근거는 §27①입니다.
- 유튜브·블로그 출처는 `citations`에 한 건도 넣지 않았습니다.
- `review.by`는 전부 `미검수-초안`입니다. 검수 후 `외부자문`으로 교체해야 로딩 게이트를 통과합니다.

---

## 7. PR #25 평가셋 50건 대조 (2026-09-14)

아직 `rules/cards/` 에 커밋되지 않은 초안이라, 이 문서의 ```yaml 블록에서 카드를 읽어 `eval/cases/E-*.yaml` 에 거는 스크립트를 따로 써서 돌렸습니다. 채점 규칙은 `eval/README.md` 를 그대로 옮겼습니다.
카드가 `rules/cards/` 에 들어가면 팀 하네스로 같은 수치가 재현됩니다:

```
EVAL_RULES_DIR=<카드 경로>/rules backend/gradlew -p backend test --tests com.ktc4.pusan4.eval.EvalHarnessTest
```

**이게 제가 v1에서 "없다"고 적었던 독립 라벨링입니다.** 기대값을 쓴 사람이 다르고 조문에서 뽑았습니다. 제 평가셋 34건은 자기채점이라 통과 33건이 나왔지만 아무 의미가 없었고, 같은 카드가 이쪽에서는 **치명 3건**으로 떨어졌습니다.

### 7-1. v1 → v2

| | 일치 | 미달 | 치명 | 보류 |
|---|---:|---:|---:|---:|
| v1 (카드 26장) | 13 | 29 | **3** | 5 |
| v2 (카드 30장) | 23 | 22 | **0** | 5 |

남은 미달 22건은 전부 B·C 담당(과태료·조세·음식점·카페·편의점·미용·차량·기부금·접대비)이라 제 카드가 없는 게 정상입니다. 단 하나 E-044(수리비)만 A 소관인데 `기타` 로 분류돼 막혀 있고, 카테고리 신설로 풉니다(§3).

### 7-2. 치명 3건과 고친 내용

| 케이스 | v1 결과 | 기대 | 원인과 조치 |
|---|---|---|---|
| E-010 음식점 사업자의 클라우드 | 가능 | 확인필요 | R-038이 업종 무관 `가능`. → `industry: ["940909"]` 한정 |
| E-038 공용 휴대폰 회선 | 가능 | 확인필요 | R-041이 G2에서 가능 확정, G3 되묻기 미응답인데 강등 안 됨. → R-041을 `확인필요`로 |
| E-043 연간 구독 24만원 | 가능 | 확인필요 | 기간 판단이 G4에 있어 G2의 `가능`을 못 낮춤. → R-029로 G2에 올림 |

뒤의 둘이 **같은 구조적 문제**이고 §4-1입니다. 카드로 우회했지만 엔진 규칙이 필요한 자리입니다.

### 7-3. 치명은 아니지만 고친 것 4건

- **E-041** 100만원 이하 비품의 근거로 시행령 §67④를 요구하는데, v1은 그 조문을 100만원 **초과** 카드(R-052)에만 갖고 있었습니다. → R-050 신설. 경계의 양쪽 모두 §67④가 근거입니다.
- **E-012** 3만원 이하 결제는 증빙 수취 의무 자체가 없어 `가산세_대상` 속성이 **붙지 않아야** 합니다. v1은 금액과 무관하게 `false`를 붙였습니다. → R-080에 `amount_min: 30001`.
- **E-019 / E-020** 국민연금은 불가, 지역가입자 건강보험료는 가능 — 둘 다 되묻기 없이 확정 판정입니다. → R-020·R-021 신설. **v1에서 "알려진 미커버"로 남겼던 본인 건강보험료가 여기서 풀렸습니다.**
- **E-033** 응답 값이 `업무출장`인데 제 선택지는 `업무목적`이라 매칭이 안 됐습니다. → 어휘를 평가셋에 맞췄습니다(§4-8).

### 7-4. 보류 5건과 제 카드

| 케이스 | 제 카드 | 사유 |
|---|---|---|
| E-007 본인 교육비 | R-030 `가능` | 본인 교육비를 지목한 호가 없음 → §5-3 |
| E-036 자택 겸 작업실 전기 | R-042 `확인필요` | 시행령 §61①1 후단 해석 → §5-1 |
| E-042 SW 영구 라이선스 150만 | R-029 `확인필요` | 무형자산 해석 → §5-5 |
| E-045 맥북 350만 | R-032 `가능` + R-052 자산 | 개인용 컴퓨터 즉시상각 특례 충돌 → §5-6 |
| E-028 카페 혼자 작업 | 미매칭 | B 담당 |

제 카드는 보류 4건에서 `확인필요` 아니면 자산 처리로 내보내므로, 조문 해석이 어느 쪽으로 결론나도 오탐이 나지 않습니다. E-030(교육 `가능`)만 해석에 걸리는데, 세무사 답변이 "불가" 쪽이면 R-030을 되묻기로 바꿔야 합니다.

### 7-5. 실거래 5건

`카드이용내역_20260806_20260906.xls` 판정대상 5건: 구글클라우드코리아 12,100원만 `가능`(R-038), 나머지 4건은 PG_미상이라 R-028로 `확인필요`. 표본이 5건이라 결론은 못 냅니다. `docs/keyword_rules_report.md` 가 쓴 338건 원본은 gitignore된 `data/` 에 있어 접근이 안 됩니다.

### 7-6. 실측 분포로 본 A 파트 기여도

거래 원본은 없지만 `docs/keyword_rules_report.md` 에 338건의 카테고리별 건수가 있습니다.

| 카테고리 | 건수 | 결과 |
|---|---:|---|
| 여비교통 | 33 | 되묻기(R-049) |
| 통신 | 6 | 되묻기(R-041→R-070) |
| 해외SaaS | 5 | **확정 가능**(R-038) |
| 구독서비스 | 5 | 되묻기(R-040) |
| 생활용품 | 2 | 되묻기(R-036) |
| 온라인쇼핑 | 2 | 확인필요(R-037) |
| **A 소계** | **53** | 전체 338건의 15.7% |
| PG 블록 | 19 | R-028이 받음 |

확정 판정으로 나가는 건 5건(해외SaaS)뿐이고 나머지는 되묻기입니다. v1에서 통신 6건을 확정 `가능`으로 셌는데, E-038 때문에 되묻기로 내렸습니다.

**다만 이 코퍼스는 학생 개인 카드**라 편의점·카페·음식점이 53%입니다. 페르소나 1의 분포와 달라서 15.7%를 A 파트의 최종 기여도로 읽으면 안 됩니다.

---

## 8. 평가셋 기여

**제가 따로 만든 평가셋 34건은 폐기합니다.** PR #25의 포맷이 낫고(조문 근거 필수, `근거조문_제외`, 치명 기준 명시, JUnit 하네스) 케이스도 겹칩니다. 겹치지 않는 것만 그 포맷으로 옮겼습니다.

- **지금 올리는 8건 (E-051~E-058)** — 기존 카테고리만 씁니다. 아래 §8-1 목록.
  도서, 광고, 생활용품(업무용/개인), 사무용품 100만원 경계 바로 위, 국내 거래 증빙(해외 예외가 안 새는지), 통신 개인 전용 회선, 온라인쇼핑 함정.
- **카테고리 승인 후 올릴 9건** — 임차료·전자기기·전문가수수료·보험·배송·수리비가 필요합니다. 제 작업 폴더에 두고 승인 후 올립니다. 지금 넣으면 `merchant_category` 가 enum 밖이라 검증에 걸립니다.

PR #25에 남길 의견은 §4-1(엔진 규칙)·§4-8(어휘 표준)·E-044(수리비 카테고리) 세 건입니다.

### 8-1. 이번에 올리는 평가 케이스 8건

| id | 관문 | 무엇을 보는가 |
|---|---|---|
| E-051 | G2 | 기술 서적 — 도서 카테고리 |
| E-052 | G2 | 검색 광고 집행 |
| E-053 | G2 | 생활용품점, 업무용 응답 |
| E-054 | G2 | 생활용품점, 개인 응답 — 사무용품으로 흡수되면 자동 통과 (치명) |
| E-055 | G4 | 1,000,001원 — 100만원 경계 바로 위 자산화 (치명, E-041과 한 쌍) |
| E-056 | G5 | 국내 거래 3만원 초과 — 해외 증빙 예외가 새지 않는지 (E-011·E-012 대조군) |
| E-057 | G3 | 개인 전용 회선 — 불가 (치명, E-037·E-038에 이은 세 번째 분기) |
| E-058 | 엣지 | 종합몰 고액 결제, 비고에 "노트북 구입" — 비고에 끌려가지 않는지 |

**⚠️ 8건 모두 제가 라벨러입니다.** `eval/README.md` 가 적은 한계("라벨러 1명")가 이 8건에도 그대로 적용됩니다. 두 번째 라벨러가 필요합니다.
