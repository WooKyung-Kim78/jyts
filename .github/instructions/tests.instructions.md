---
description: JYTS 테스트, 검증 및 완료 기준
applyTo: "**/*.{test,spec}.{ts,tsx},tests/**,backend/tests/**,backend/phpunit.xml,playwright.config.*,vitest.config.*"
---

# 테스트 규칙

사용 도구:

- Vitest
- React Testing Library
- Playwright
- PHPUnit (Laravel, `backend/tests`)

운영 MariaDB가 유일한 database이다. 자동 테스트는 절대 운영 database에 접속하지 않는다.

- Laravel 테스트는 `phpunit.xml`에서 SQLite in-memory(`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`)만 사용한다.
- `RefreshDatabase` 등 DB를 초기화하는 테스트가 MariaDB에서 실행되지 않도록 테스트 시작 시 connection을 검사하고 아니면 중단한다.
- 운영 서버에서 `php artisan test`를 실행하지 않는다.
- SQLite와 MariaDB의 차이(JSON, check constraint, collation)로 검증할 수 없는 부분은 `미검증`으로 보고한다.
- Frontend 단위 테스트와 e2e는 실제 API 서버에 접속하지 않는다.
- 운영 database에 테스트 계정이나 테스트 데이터를 만들지 않는다.

변경된 동작에 대한 테스트를 추가한다.

버그 수정에는 회귀 테스트를 추가한다.

## 필수 권한 테스트

- 미로그인 사용자의 업무 접근 실패
- 비활성 사용자의 업무 접근 실패
- ADMIN의 고객사 생성 성공
- USER의 직원 관리 실패
- USER의 장비 등록 및 수정 성공
- USER의 점검 등록 거부 (점검 권한 규칙 확정 시)
- 퇴사 직원의 로그인 및 업무 접근 실패
- ADMIN의 직원 등록, 퇴사 처리 및 복원 성공
- 비활성 직원의 신규 장비 담당자 지정 실패
- 퇴사 담당자가 이미 지정된 장비의 연결 보존
- role 위조를 통한 접근 실패
- 다른 record ID를 사용한 권한 우회 실패
- 다른 장비의 첨부파일 접근 실패

## 필수 장비 테스트

- 항온항습기 등록 성공
- UPS 등록 성공
- 자동소화기 등록 성공
- 음성통보기 등록 성공
- 허용되지 않은 category 저장 실패
- 고객사 주소·담당자·연락처 입력 검증
- 중복 장비 코드 저장 실패
- 잘못된 specification 저장 실패
- soft delete 장비가 기본 목록에서 제외

## 필수 A/S 테스트

- A/S 접수 성공
- 담당자 지정 성공
- 처리 중 상태 변경 성공
- 조치 내용 없이 완료 실패
- 완료일이 접수일보다 빠르면 실패
- 음수 비용 저장 실패
- 허용되지 않은 상태 전환 실패

## 필수 파일 테스트

- 허용된 이미지 업로드 성공
- 파일 크기 초과 거부
- 허용되지 않은 형식 거부
- 권한 없는 다운로드 거부
- 다른 장비 경로 접근 거부

## 검증 명령

먼저 `package.json`의 실제 script를 확인한다.

지원되는 경우 실행한다.

```bash
pnpm lint
pnpm typecheck
pnpm exec vitest run <변경한 기능의 테스트 파일>
pnpm build
pnpm test:e2e
```

Frontend 전체 테스트(`pnpm test`, 인자 없는 `vitest run`)는 실행하지 않는다. 변경한 기능의 테스트 파일만 단위별로 실행하고, 나머지는 `미실행`으로 보고한다.

위 목록을 매번 모두 실행하지 않는다. `최소 검증 → 실패 시 범위 확대 → 필요한 경우 최종 전체 검증` 순서를 따른다.

- 변경 범위와 관련된 최소 테스트(파일 또는 `--filter`)를 먼저 실행한다.
- 실패하거나 영향 범위가 넓을 때만 검증 범위를 넓힌다.
- 성공한 테스트는 관련 코드가 다시 바뀌지 않는 한 반복하지 않는다.
- build, Backend 전체 test 등 오래 걸리는 명령은 반복하지 않고 더 빠른 대안(파일 단위 test, typecheck, 편집기 진단)을 우선한다.
- 로그는 오류가 있을 때만 확인하고, 전체를 읽지 말고 필요한 오류 패턴(`FAIL`, `Error`, `Tests:`, `error TS` 등)만 검색한다.

Backend(`backend/`)는 `composer.json`의 script를 확인한 후 로컬에서만 실행한다.

```bash
php artisan test
```

실제로 실행하지 않은 테스트를 실행했다고 말하지 않는다.

각 결과는 다음 중 하나로 보고한다.

- 통과
- 실패
- 미실행
- 미검증

실패가 있으면 오류, 영향 범위 및 남은 문제를 설명한다.