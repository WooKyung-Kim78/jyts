---
description: JYTS MariaDB, Laravel migration 및 데이터 모델 규칙
applyTo: "backend/database/**,backend/app/Models/**"
---

# Database 규칙 (MariaDB + Laravel)

## 기본 원칙

- MariaDB(InnoDB, `utf8mb4`)를 사용한다.
- schema는 Laravel migration으로만 관리한다.
- 기본키는 UUID를 사용한다(Eloquent `HasUuids`).
- MariaDB 버전에 따라 UUID 저장 타입을 결정한다. 10.7 이상은 native `UUID`, 미만은 `CHAR(36)` (확인 필요).
- 관계는 foreign key로 표현한다. 기본 삭제 동작은 `restrict`다.
- 핵심 업무 데이터를 하나의 거대한 JSON document로 저장하지 않는다.
- 장비 종류별 가변 사양에만 JSON column 사용을 검토한다.
- 날짜만 필요한 값은 `date`를 사용한다.
- 시간이 필요한 값은 `datetime`을 사용하고 UTC로 저장한다. `timestamp` 타입의 2038년 제한을 피한다.
- 화면 표시 시간대는 확인 필요(기본 가정: Asia/Seoul).

주요 업무 table에는 다음 column을 둔다.

- `id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

복구가 필요한 업무 table에는 `deleted_at`을 둔다(Eloquent `SoftDeletes`).

기본 삭제 방식은 soft delete다.

## 핵심 테이블

- `users`
- `organizations`
- `equipment`
- `equipment_components`
- `inspection_templates`
- `inspections`
- `service_requests`
- `attachments`
- `audit_logs`

`users.role`은 `ADMIN`/`USER`, `active`는 재직 상태를 나타낸다. 로그인 키 `username`은 5자 영문, lowercase 정규화, case-insensitive unique로 저장한다. `email`은 nullable이다. 장비 담당자는 nullable `equipment.assigned_user_id` FK로 저장하며 user row hard delete는 허용하지 않는다.

Earlier migrations created a `sites` table. It is legacy and has no active API or UI; retain it until its data is checked and a separate approved drop migration is planned.

## Migration

- 기존에 적용된 migration을 수정하지 않는다.
- 모든 schema 변경은 새 migration으로 작성한다.
- migration에는 table뿐 아니라 constraint와 index를 함께 검토한다.
- 가능한 경우 `down()`을 구현한다.
- destructive migration의 데이터 손실 위험을 명시한다.
- 운영 schema를 수동으로 변경하고 migration을 생략하지 않는다.

## 단일 운영 database

개발용 database를 두지 않는다. 운영 MariaDB 하나만 사용하며, 모든 변경은 운영 데이터에 즉시 반영된다.

- 로컬 개발환경은 Cafe24 운영 MariaDB endpoint에 직접 연결할 수 있다(사용자 승인, Cafe24 외부 접속 허용 및 최소 권한 계정 필요). SSH tunnel은 필수가 아니다.
- 원격 DB 연결 수립이 약 450ms로 느리므로 `APP_ENV=local`에서는 PDO persistent 연결을 기본 사용한다(`DB_PERSISTENT`로 덮어쓰기 가능). 운영(`APP_ENV=production`)에서는 기본 비활성이다.
- 별도 로컬 개발 DB는 사용하지 않는다. 로컬 앱은 Cafe24 운영 MariaDB에 직접 연결한다.
- 적용 전 `php artisan migrate --pretend`로 실행될 SQL을 확인하고 검토한다.
- 비파괴 migration은 SQL 검토 후 사용자가 요청한 기능 변경의 일부로 로컬에서 `php artisan migrate --force`를 바로 실행해 운영 DB에 적용한다.
- destructive migration은 백업과 데이터 영향 확인 후 별도 승인을 받아야 적용한다.
- 다음 명령은 운영 database에 실행하지 않는다.
  - `migrate:fresh`
  - `migrate:refresh`
  - `migrate:reset`
  - `db:wipe`
  - `db:seed`
- phpMyAdmin 등으로 schema를 직접 변경하지 않는다.
- 임의의 업무 데이터 생성/수정/삭제 SQL은 실행하지 않는다. 업무 데이터 변경은 사용자 요청을 확인하고 애플리케이션 기능 또는 명시적으로 승인된 작업으로 수행한다.

## Constraint

다음을 검토한다.

- `NOT NULL`
- `UNIQUE`
- `CHECK`
- foreign key
- default value
- unique index (MariaDB는 partial index가 없으므로 조건부 고유성은 generated column으로 구현)
- 검색 index
- 상태 전환 validation

업무 규칙을 frontend validation에만 의존하지 않는다. Laravel FormRequest와 database constraint로 함께 검증한다.

## 권한

MariaDB에는 Row Level Security가 없다. 모든 권한 검사는 Laravel에서 시행한다(`backend` 지침).

- 애플리케이션 DB 계정에는 필요한 권한만 부여한다(호스팅 제약으로 불가능하면 기록).
- 브라우저가 전달한 `userId` 또는 `role`을 신뢰하지 않는다.

## 감사 로그

다음 주요 변경은 감사 로그 기록을 검토한다.

- 고객사 변경
- 장비 및 부품 변경
- 점검 생성, 수정 및 완료
- A/S 접수, 상태 변경 및 완료
- 사용자 역할 변경
- 데이터 이관

감사 로그에는 token, secret, 전화번호 전체 및 파일 원문을 저장하지 않는다.

일반 사용자는 감사 로그를 수정하거나 삭제할 수 없어야 한다. 감사 로그 수정/삭제 API를 만들지 않는다.

## JSON

`equipment.specification`과 점검 schema에 JSON column을 사용할 수 있다.

MariaDB의 JSON은 `LONGTEXT` + `JSON_VALID` check이므로 구조 검증은 Laravel에서 한다.

JSON 데이터에는 schema version을 포함한다.

JSON 사용이 필요한 이유를 명시한다.

검색이나 관계가 중요한 데이터를 JSON에만 저장하지 않는다.
