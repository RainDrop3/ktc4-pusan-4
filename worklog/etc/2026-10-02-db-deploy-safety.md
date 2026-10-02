# 배포 중 DB 위험 정리와 SQL 트랜잭션 적용

- 브랜치: chore/db-deploy-safety
- 커밋: 36b5e4e..a03a6cf (2개)
- 주요파일: deploy/deploy.sh, db/README.md, docs/deployment.md

## 한 일

- `deploy.sh`가 Flyway 뒤에 적용하는 `db/schema.sql`·`db/rag.sql`을 `psql -1`로 한 트랜잭션에 묶었다. 중간에 실패하면 일부만 적용된 채 남던 것을 통째로 취소한다.
- `db/README.md`에 마이그레이션 호환 규칙을 추가했다. 새 컬럼은 nullable 또는 `DEFAULT`, 삭제·이름 변경은 배포를 나눠서, 적용된 `V*.sql`은 수정 금지. `V4`가 첫 규칙을 어긴 형태라는 점도 적었다.
- `docs/deployment.md` 4절에 마이그레이션 실패 시 서비스가 멈추고 롤백으로 복구한다는 점, postgres 컨테이너가 다시 만들어지는 변경 세 가지와 재시작으로 해결되지 않는 경우(메이저 버전, 빈 볼륨에서만 적용되는 설정, `down -v`)를 정리했다.
- GitHub `release` ruleset에 삭제 금지, `backend`·`ai`·`web` 필수 체크, 새 push 시 승인 무효화를 추가했다. 레포 설정이라 커밋에는 없다.

## 왜 이렇게 했나

- 멘토 피드백 대응이다. postgres가 새로 뜨는 경우를 체크할 것, DDL은 실패 시 롤백, 앱 롤백 시 스키마는 되돌리지 않고 구·신 코드가 모두 호환될 것.
- Flyway 마이그레이션은 PostgreSQL 트랜잭션 DDL로 이미 실패 시 취소되므로, 보호가 없던 Flyway 밖 SQL만 고쳤다.
- 이전 이미지로 롤백할 때 Spring Boot 3.5의 Flyway는 DB의 더 새 마이그레이션을 무시하므로, 롤백을 막는 건 `ddl-auto: validate`가 잡는 컬럼 삭제·이름 변경이다. 규칙을 거기에 맞췄다.
- 배포 스크립트가 stdin으로 SQL을 넣으므로 그 방식에서 `-1`이 먹는지 psql 17 컨테이너로 확인했다. 실제 두 파일도 V1~V5 적용 후 `-1`로 두 번 실행해 통과했다.

## 남은 것 · 아는 문제

- DB 재시작 변경은 문서와 리뷰로만 막는다. 평소 배포에서 postgres를 아예 건드리지 않도록 `deploy.sh`를 분리할지는 정하지 않았다(무중단 배포 전제).
- `schema.sql`·`rag.sql`은 `IF NOT EXISTS`라 기존 테이블 구조를 바꿔도 운영에 반영되지 않는다. 지금은 README 방침대로 ALTER가 필요해질 때 Flyway로 옮긴다.
- `develop`에서만 `release`로 들어오게 하는 제한은 나중에 정한다.
- EC2 실배포에서는 아직 확인하지 않았다.
