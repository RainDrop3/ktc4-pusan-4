"""비서 도구. 백엔드 공개 API를 사용자 권한으로 읽는 얇은 래퍼이고, 도구 안에서는 LLM을 쓰지 않는다.

UUID는 턴 단위 별칭(g1 질문 그룹, t1 거래, c1 분류 그룹)으로 바꿔 모델에 준다. 모델은 긴 ID를 옮겨 적다 자주 틀린다.
응답은 필요한 필드만 골라 넘긴다. 수입·이름·이메일은 모델로 보내지 않는다(QR-7).
"""

from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError

import yaml

LIST_LIMIT = 20
SHOWN_TRANSACTIONS = 5
PAGE_SIZE = 100
MAX_PAGES = 10
STATUTE_CHARS = 600
WEEKDAYS = "월화수목금토일"
VERDICTS = {"가능": "AVAILABLE", "불가": "UNAVAILABLE", "확인 필요": "NEEDS_REVIEW"}
HELP: dict[str, str] = yaml.safe_load(Path(__file__).with_name("kb.yaml").read_text(encoding="utf-8"))


class Reject(Exception):
    """도구가 요청을 거절한다. 예외가 아니라 결과로 돌려줘서 모델이 사유를 보고 고쳐 부르게 한다."""

    def __init__(self, error: str, message: str, **extra):
        super().__init__(error)
        self.result = {"error": error, "message": message, **extra}


def nullable(t: str, desc: str, enum: list | None = None) -> dict:
    d = {"type": [t, "null"], "description": desc}
    if enum:
        d["enum"] = enum + [None]
    return d


def schema(props: dict) -> dict:
    # strict 는 모든 속성이 required 이고 추가 속성이 없어야 한다. 선택 인자는 null 을 허용해서 표현한다.
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


TOOL_DEFS: dict[str, tuple[str, dict]] = {
    "get_status": ("지금 업로드의 진행 상황과 다음 할 일을 가져온다.", {}),
    "list_questions": (
        "답하지 않은 질문 그룹과 각 그룹의 지난번 답(previous)을 가져온다. presumed_personal 이 true 면 소명 대기다.",
        {"merchant": nullable("string", "가맹점 이름 일부"), "date": nullable("string", "승인일 YYYY-MM-DD")},
    ),
    "find_transactions": (
        ("거래를 조건으로 찾는다. 건수(count)와 합계(sum)는 잘린 목록이 아니라 전체 기준으로 도구가 계산한다. "
         "around 에 거래 ref 를 주면 다른 조건은 무시하고 그 거래와 같은 날의 거래를 준다."),
        {
            "month": nullable("integer", "월 (1~12)"),
            "category": nullable("string", "카테고리. 예: 카페, 통신, 차량"),
            "merchant": nullable("string", "가맹점 이름 일부"),
            "verdict": nullable("string", "판정", list(VERDICTS)),
            "around": nullable("string", "거래 ref. 예: t3"),
        },
    ),
    "get_judgment": (
        "거래 하나의 판정 상세, 이 판정을 만든 답, 근거 조문 원문을 가져온다.",
        {"transaction": {"type": "string", "description": "거래 ref. 예: t6"}},
    ),
    "get_summary": (
        "판정별·계정별 합계와 남은 질문·미분류 집계를 가져온다.",
        {"scope": nullable("string", "batch=지금 업로드, year=귀속연도 전체. null 이면 지금 업로드", ["batch", "year"])},
    ),
    "list_unclassified": (
        "분류 확인을 기다리는 가맹점 그룹과 후보 카테고리(suggested)를 가져온다.",
        {"merchant": nullable("string", "가맹점 이름 일부")},
    ),
    "get_help": ("사용법·용어·서비스가 하지 않는 일 도움말을 가져온다.", {"topic": {"type": "string", "enum": list(HELP)}}),
}


def tool_specs(names: list[str], strict: bool) -> list[dict]:
    out = []
    for name in names:
        desc, props = TOOL_DEFS[name]
        fn = {"name": name, "description": desc, "parameters": schema(props)}
        if strict:
            fn["strict"] = True
        out.append({"type": "function", "function": fn})
    return out


def day(iso: str) -> str:
    # 요일을 붙여 둔다. 사용자는 "토요일 스타벅스"처럼 요일로 말한다.
    return f"{iso}({WEEKDAYS[date.fromisoformat(iso).weekday()]})"


def pick(d: dict | None, *keys: str) -> dict | None:
    return None if d is None else {k: d.get(k) for k in keys}


def matches(text: str, t: dict) -> bool:
    return text.lower() in f"{t.get('merchantNorm') or ''} {t.get('merchantRaw') or ''}".lower()


class Turn:
    """대화 한 턴의 도구 실행. 별칭표, 근거 확인 기록, 받은 조문, 제안 카드를 턴이 끝날 때까지 들고 있는다."""

    def __init__(self, backend, context: dict, user_texts: list[str], tools: list[str]):
        self.be = backend
        self.batch = context.get("batchId")
        self.year = context.get("year")
        self.user_texts = user_texts
        self.tools = tools
        self.refs: dict[str, dict] = {}
        self._keys: dict[tuple[str, str], str] = {}
        self.tier_a: dict[str, str] = {}  # 지난번 답을 근거로 쓸 수 있는 그룹 ref → 그 값
        self.citations: list[str] = []
        self.proposals: list[dict] = []
        tid = context.get("transactionId")
        self.viewing = self._ref("t", tid, {"id": tid}) if tid else None

    def run(self, name: str, args: dict) -> dict:
        if name not in self.tools:
            return {"error": "UNKNOWN_TOOL", "message": f"이 화면에서 쓸 수 있는 도구: {', '.join(self.tools)}"}
        props = TOOL_DEFS[name][1]
        try:
            # strict 를 끈 모델은 인자를 빼거나 더 보낼 수 있다. 정의된 인자만 넘긴다.
            return getattr(self, name)(**{k: args.get(k) for k in props})
        except Reject as e:
            return e.result
        except HTTPError as e:
            return {"error": "BACKEND_ERROR", "status": e.code, "message": "백엔드가 요청을 거절했습니다. 다시 부르지 말고 사용자에게 알리세요."}
        except (URLError, TimeoutError):
            return {"error": "BACKEND_UNAVAILABLE", "message": "백엔드에 연결하지 못했습니다. 잠시 뒤 다시 시도하도록 안내하세요."}

    def _ref(self, prefix: str, key: str, obj: dict) -> str:
        ref = self._keys.get((prefix, key))
        if ref is None:
            ref = f"{prefix}{sum(p == prefix for p, _ in self._keys) + 1}"
            self._keys[(prefix, key)] = ref
        self.refs[ref] = obj
        return ref

    def _get(self, ref: str | None, prefix: str, what: str) -> dict:
        if not ref or not ref.startswith(prefix) or ref not in self.refs:
            raise Reject("UNKNOWN_REF", f"{ref} 는 이 턴에 받은 {what} ref 가 아닙니다. 조회 도구로 먼저 찾으세요.")
        return self.refs[ref]

    def _txn(self, t: dict) -> dict:
        # 거래 목록은 id, 질문·분류 그룹 안의 거래는 transactionId 로 거래를 가리킨다.
        tid = t.get("transactionId") or t["id"]
        ref = self._ref("t", tid, {**t, "id": tid})
        return {"ref": ref, "date": day(t["approvedAt"]), "merchant": t["merchantRaw"],
                "category": t.get("merchantCategory"), "amount": t["amount"]}

    def _pages(self, path: str, **params) -> tuple[list[dict], dict]:
        """전부 읽어 온다. 마지막 응답도 돌려줘서 집계(unresolved)와 잘림(hasNext)을 보게 한다."""
        items: list[dict] = []
        for page in range(MAX_PAGES):
            res = self.be.get(path, page=page, size=PAGE_SIZE, **params)
            items += res["items"]
            if not res["page"].get("hasNext"):
                break
        # shortcut: 1,000건(100 × 10쪽)까지만 읽는다. 넘는 사용자가 생기면 백엔드에 검색·합계 필터를 추가한다.
        return items, res

    # ── 조회 도구 ────────────────────────────────────────────────
    def get_status(self) -> dict:
        p = self.be.get("/progress", batchId=self.batch)
        return {
            "batch": pick(p.get("batch"), "label", "transactionCount"),
            "context": pick(p.get("context"), "bookkeeping", "hasEmployee"),
            "classification": pick(p.get("classification"), "pendingCount", "pendingAmount"),
            "run": pick(p.get("run"), "status"),
            "questions": pick(p.get("questions"), "pendingCount", "pendingAmount", "fillableFromPrevious"),
            "next": pick(p.get("next"), "step", "route", "label"),
        }

    def list_questions(self, merchant: str | None, date: str | None) -> dict:
        groups, res = self._pages("/questions", batchId=self.batch, status="PENDING", grouped="true")
        try:
            suggestions = self.be.get("/questions/suggestions", batchId=self.batch)["items"]
            prev_of = {(s["groupKey"], s["factType"]): s for s in suggestions}
        except (HTTPError, URLError):
            prev_of = None  # 지난번 답이 없어도 질문 목록과 말로 답하기는 된다
        rows = [g for g in groups
                if (not merchant or any(matches(merchant, t) for t in g["transactions"]))
                and (not date or any(t["approvedAt"] == date for t in g["transactions"]))]
        out = []
        for g in rows[:LIST_LIMIT]:
            ref = self._ref("g", f"{g['groupKey']}|{g['factType']}", g)
            s = (prev_of or {}).get((g["groupKey"], g["factType"]))
            prev = s and {k: v for k, v in pick(s, "tier", "value", "sourceLabel", "conflict", "history",
                                                "historyCounts", "reason").items() if v not in (None, False)}
            if s and s.get("tier") == "A" and not s.get("conflict") and s.get("value") in g["options"]:
                self.tier_a[ref] = s["value"]
            out.append({
                "ref": ref, "merchant": g["transactions"][0]["merchantNorm"], "fact_type": g["factType"],
                "question": g["questionText"], "options": g["options"],
                # 대기 그룹의 bulkAnswerable=false 는 소명 대기 거래의 질문이 섞였다는 뜻이다(api.md 3.9).
                "presumed_personal": not g["bulkAnswerable"],
                "count": g["count"], "total_amount": g["totalAmount"],
                "transactions": [self._txn(t) for t in g["transactions"][:SHOWN_TRANSACTIONS]],
                "previous": prev,
            })
        result = {"unresolved": res["unresolved"], "total_groups": len(rows), "groups": out}
        if prev_of is None:
            result["previous_unavailable"] = True
        return result

    def find_transactions(self, month, category, merchant, verdict, around) -> dict:
        if around:
            base = self.be.get(f"/transactions/{self._get(around, 't', '거래')['id']}")
            items, res = self._pages("/transactions", batchId=base["batchId"])
            rows = [x for x in items if x["approvedAt"] == base["approvedAt"]]
        else:
            month = int(month) if month else None
            # 월은 여러 카드사 업로드에 걸치므로 연·월로 찾는다. 연도를 모르면 지금 업로드에서 월로 거른다.
            scope = {"year": self.year, "month": month} if month and self.year else {"batchId": self.batch}
            items, res = self._pages("/transactions", status="JUDGEABLE", verdict=VERDICTS.get(verdict), **scope)
            rows = [x for x in items
                    if (not month or int(x["approvedAt"][5:7]) == month)
                    and (not category or category in (x.get("merchantCategory") or ""))
                    and (not merchant or matches(merchant, x))]
        out = {"count": len(rows), "sum": sum(x["amount"] for x in rows), "items": [self._txn(x) for x in rows[:LIST_LIMIT]]}
        if res["page"].get("hasNext"):
            out["truncated"] = "거래가 많아 앞의 1,000건만 셌습니다"
        return out

    def get_judgment(self, transaction: str) -> dict:
        tid = self._get(transaction, "t", "거래")["id"]
        items = self.be.get("/judgments", transactionId=tid)["items"]
        if not items:
            raise Reject("NO_JUDGMENT", "이 거래는 아직 판정이 없습니다.")
        j = items[0]
        answered = self.be.get("/questions", transactionId=tid, status="ANSWERED")["items"]
        citations = []
        for c in j.get("citations") or []:
            s = self.be.get(f"/statutes/{c['statuteVersionId']}")
            self.citations.append(s["title"])
            citations.append({"title": s["title"], "hierarchy": s["hierarchy"], "body": s["body"][:STATUTE_CHARS]})
        tx = j["transaction"]
        return {
            "transaction": {"date": day(tx["approvedAt"]), "merchant": tx["merchantRaw"],
                            "category": tx["merchantCategory"], "amount": tx["amount"]},
            "verdict": j["verdict"]["label"], "out_of_scope": j["outOfScope"],
            "account": j.get("account"), "final_amount": j.get("finalAmount"),
            "rule_card": j.get("ruleCardId"), "explanation": j.get("explanation"),
            "answers": [{"question": q["questionText"], "answer": (q.get("answer") or {}).get("value")} for q in answered],
            "citations": citations,
        }

    def get_summary(self, scope: str | None) -> dict:
        by_year = scope == "year" or not self.batch
        s = self.be.get("/judgments/summary", **({"year": self.year} if by_year else {"batchId": self.batch}))
        # shortcut: 질문·분류 조회에 연도 필터가 없어 연도 범위의 미해소는 사용자 전체 업로드 기준이다. 연도 필터가 생기면 바꾼다.
        batch = None if by_year else self.batch
        questions = self.be.get("/questions", batchId=batch, size=1)
        reviews = self.be.get("/classification-reviews", batchId=batch, size=1)
        label = {v: k for k, v in VERDICTS.items()}
        return {
            "scope": "year" if by_year else "batch", "total_count": s["totalCount"],
            "by_verdict": {label[k]: v for k, v in s["byVerdict"].items()},
            "by_account": s["byAccount"][:LIST_LIMIT],
            "unresolved_questions": questions["unresolved"], "unclassified": reviews["unresolved"],
        }

    def list_unclassified(self, merchant: str | None) -> dict:
        groups, res = self._pages("/classification-reviews", batchId=self.batch, status="PENDING", grouped="true")
        rows = [g for g in groups if not merchant or any(matches(merchant, t) for t in g["transactions"])]
        return {"unresolved": res["unresolved"], "total_groups": len(rows), "groups": [
            {"ref": self._ref("c", g["groupKey"], g), "merchant": g["merchantNorm"], "count": g["count"],
             "total_amount": g["totalAmount"], "suggested": g["suggestedCategories"],
             "transactions": [self._txn(t) for t in g["transactions"][:SHOWN_TRANSACTIONS]]}
            for g in rows[:LIST_LIMIT]]}

    def get_help(self, topic: str) -> dict:
        if topic not in HELP:
            raise Reject("UNKNOWN_TOPIC", "없는 주제입니다.", topics=list(HELP))
        return {"topic": topic, "text": HELP[topic]}
