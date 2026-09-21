-- 적용: psql "$DATABASE_URL" -f db/rag.sql
--
-- schema.sql 과 달리 compose 의 initdb 에 마운트하지 않는다.
-- statute_version 을 FK 로 걸어서, initdb(= Flyway 보다 먼저 돈다) 단계에서는
-- 참조 대상이 아직 없어 CREATE TABLE 이 실패하고 컨테이너가 죽는다.
-- 순서는 1) Flyway  2) db/schema.sql  3) 이 파일  4) 적재·재색인.
--
-- 판정 경로는 이 테이블을 쓰지 않는다(RAG 는 규칙 후보 초안·보고서 생성 전용).
-- 백엔드에 JPA 엔티티가 없으므로 ddl-auto: validate 대상도 아니다.

CREATE TABLE IF NOT EXISTS legal_chunk (
    id                 bigserial    PRIMARY KEY,
    statute_version_id bigint       NOT NULL REFERENCES statute_version(id) ON DELETE CASCADE,
    statute_id         varchar(100) NOT NULL,
    doc_id             varchar(20)  NOT NULL,
    doc_type           varchar(30)  NOT NULL,
    hierarchy          varchar(30)  NOT NULL,
    -- 심판례·해석례 전용. 법령·행정규칙은 NULL.
    -- 검색은 기각된 주장(심판례 '주장'·'처분개요')을 제외한다.
    section            varchar(20),
    -- 임베딩 상한을 넘겨 한 섹션을 쪼갠 경우의 순번
    seq                int          NOT NULL DEFAULT 0,
    effective_from     date         NOT NULL,
    effective_to       date,
    is_superseded      boolean      NOT NULL DEFAULT false,
    body               text         NOT NULL,
    -- statute_version.body_hash 복사본. 증분 재색인은 이 값 비교로 판단한다
    source_hash        varchar(128) NOT NULL,
    embedding          vector(1536) NOT NULL,
    indexed_at         timestamptz  NOT NULL DEFAULT now(),
    -- 법령·행정규칙은 section 이 NULL 이라 기본 UNIQUE 로는 중복이 막히지 않는다
    UNIQUE NULLS NOT DISTINCT (statute_version_id, section, seq)
);

CREATE INDEX IF NOT EXISTS legal_chunk_embedding_idx
    ON legal_chunk USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS legal_chunk_body_bigm_idx
    ON legal_chunk USING gin (body gin_bigm_ops);

CREATE INDEX IF NOT EXISTS legal_chunk_filter_idx
    ON legal_chunk (doc_type, section, is_superseded);
