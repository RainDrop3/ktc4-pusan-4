"""비서 도구. 가짜 백엔드로 LLM 없이 돈다."""

import json
from urllib.error import HTTPError

import pytest

from assistant import tools
from assistant.tools import TOOL_DEFS, Turn, tool_specs
from eval.assistant_fake import BATCH, YEAR, FakeBackend

ALL = list(TOOL_DEFS)


def turn(fake=None, user="", **context) -> Turn:
    return Turn(fake or FakeBackend(), {"batchId": BATCH, "year": YEAR, **context}, [user], ALL)


def failing(fake: FakeBackend, failed_path: str, code: int) -> FakeBackend:
    orig = fake.get

    def get(path, **params):
        if path == failed_path:
            raise HTTPError(path, code, "", None, None)  # type: ignore[arg-type]
        return orig(path, **params)

    fake.get = get
    return fake


def test_strict_스키마_규칙을_지킨다():
    for spec in tool_specs(ALL, strict=True):
        params = spec["function"]["parameters"]
        assert spec["function"]["strict"] is True
        assert params["additionalProperties"] is False
        assert params["required"] == list(params["properties"])
    assert "strict" not in tool_specs(ALL, strict=False)[0]["function"]


def test_목록이_잘려도_건수와_합계는_전체_기준이다(monkeypatch):
    fake = FakeBackend()
    fake.transactions += [[f"x{i:03}", "2026-09-01", "메가커피", "메가커피", "카페", 1000, "NEEDS_REVIEW"] for i in range(130)]

    out = turn(fake).find_transactions(9, "카페", None, None, None)

    assert out["count"] == 135
    assert out["sum"] == 40800 + 130000
    assert len(out["items"]) == tools.LIST_LIMIT
    assert [c[1]["page"] for c in fake.calls if c[0] == "/transactions"] == [0, 1]   # 100건씩 두 쪽


def test_around_는_같은_날_거래를_준다():
    t = turn()
    ref = t.find_transactions(None, None, "전포", None, None)["items"][0]["ref"]

    out = t.find_transactions(None, None, None, None, ref)

    assert sorted(x["merchant"] for x in out["items"]) == ["스타벅스 전포점", "한국전력공사"]
    assert all(x["date"] == "2026-09-16(수)" for x in out["items"])


def test_진행_상황에_수입_이메일이_새지_않는다():
    fake = FakeBackend()
    fake.progress["context"] |= {"email": "me@example.com", "annualIncome": 48000000, "name": "홍길동"}

    out = json.dumps(turn(fake).run("get_status", {}), ensure_ascii=False)

    assert "example.com" not in out and "48000000" not in out and "홍길동" not in out
    assert "복식부기" in out


def test_질문_목록은_소명_대기와_지난번_답_A등급을_표시한다():
    t = turn()
    groups = {g["merchant"] + g["transactions"][0]["date"]: g for g in t.list_questions(None, None)["groups"]}

    saturday = groups["스타벅스2026-09-12(토)"]
    assert saturday["presumed_personal"] is True
    skt, kepco = groups["SK텔레콤2026-09-15(화)"], groups["한국전력2026-09-16(수)"]
    assert t.tier_a == {skt["ref"]: "전용", groups["노션2026-09-03(목)"]["ref"]: "업무 전용"}
    assert kepco["previous"]["conflict"] is True     # 충돌이면 A등급이어도 근거가 못 된다


def test_지난번_답_조회가_실패해도_질문_목록은_준다():
    out = turn(failing(FakeBackend(), "/questions/suggestions", 404)).list_questions(None, None)

    assert out["previous_unavailable"] is True and out["total_groups"] == 9


def test_판정_상세는_조문을_기록하고_원문을_준다():
    t = turn()
    ref = t.find_transactions(None, None, "SK에너지", None, None)["items"][0]["ref"]

    out = t.get_judgment(ref)

    assert out["verdict"] == "불가"
    assert out["citations"][0]["body"].startswith("가사")
    assert t.citations == ["소득세법 제33조 제1항 제5호"]


def test_보고_있는_거래는_t1_으로_시작한다():
    t = turn(transactionId="tx08")
    assert t.viewing == "t1"
    assert t.get_judgment("t1")["verdict"] == "불가"


@pytest.mark.parametrize(("name", "args", "error"), [
    ("get_judgment", {"transaction": "t99"}, "UNKNOWN_REF"),
    ("get_judgment", {"transaction": "g1"}, "UNKNOWN_REF"),
    ("get_help", {"topic": "없는주제"}, "UNKNOWN_TOPIC"),
    ("propose_magic", {}, "UNKNOWN_TOOL"),
])
def test_잘못된_호출은_예외가_아니라_결과로_돌려준다(name, args, error):
    assert turn().run(name, args)["error"] == error


def test_백엔드_오류는_결과로_돌려준다():
    assert turn(failing(FakeBackend(), "/progress", 503)).run("get_status", {}) == {
        "error": "BACKEND_ERROR", "status": 503, "message": "백엔드가 요청을 거절했습니다. 다시 부르지 말고 사용자에게 알리세요."}


def test_요약은_판정을_한국어_라벨로_준다():
    out = turn().get_summary(None)
    assert out["scope"] == "batch"
    assert out["by_verdict"]["가능"] == {"count": 3, "finalAmount": 577600}
    assert out["unclassified"] == {"count": 2, "amount": 97000}


def test_미분류_그룹은_후보_카테고리를_준다():
    out = turn().list_unclassified(None)
    assert out["groups"][0]["ref"] == "c1"
    assert out["groups"][0]["suggested"] == ["해외SaaS", "온라인쇼핑", "기타"]
