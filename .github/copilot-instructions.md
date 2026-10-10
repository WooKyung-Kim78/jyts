# JYTS 장비 이력 관리 시스템

## 프로젝트 목적

JYTS가 고객사 서버실에 납품하고 유지보수하는 장비의 정보,
정기점검 및 A/S 이력을 관리하는 한국어 웹 애플리케이션이다.

관리 대상 장비:

- 항온항습기
- UPS
- 자동소화기
- 음성통보기
- 기타 장비

예상 사용자는 약 5명이다.

사용자 역할:

- ADMIN
- USER

직원 계정은 ADMIN이 등록하고 역할/재직 상태를 관리한다. 로그인 아이디는 5자 영문 username이며 입력은 소문자 정규화하고 대소문자를 구분하지 않는다. email은 선택 입력이며 로그인 키가 아니다. 기존 `wkkim97@gmail.com` 계정의 username은 `admin`이다. 지원 역할은 ADMIN과 USER이며, USER는 일반 업무 권한을 가진다.

데스크톱과 모바일 브라우저를 모두 지원한다.

## 기술 스택

Frontend (저장소 루트):

- React
- TypeScript strict mode
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- pnpm
- Vitest
- React Testing Library
- Playwright

Backend (`backend/`):

- PHP 8.4
- Laravel
- Laravel Sanctum (SPA 쿠키 세션 인증)
- MariaDB
- Composer
- PHPUnit

호스팅:

- Cafe24 웹호스팅(뉴아우토반 절약형), Linux, SSH 접속
- 도메인 `wkkim97b.mycafe24.com` (HTTPS)
- React 빌드 결과와 Laravel API를 같은 도메인에서 제공한다.
- API 경로는 `/api`이다.
- 배포는 `publish` 브랜치 push/merge 시 GitHub Actions(`.github/workflows/publish.yml`)가 build·Backend 테스트 후 SSH로 `~/jyts/releases/<release>`에 올리고 `~/jyts/current`를 교체한다. 웹 루트 `~/www`는 `~/jyts/current/public` symlink, 운영 `.env`와 `storage`는 `~/jyts/shared`에 둔다. 서버 PHP CLI는 `/usr/local/php84/bin/php`다.
- 자동 배포는 migration을 실행하지 않는다. 미적용 migration이 있으면 배포를 중단하므로 SQL 검토 후 먼저 적용한다. SSH 키 등 배포 비밀값은 GitHub Secrets에만 둔다.

Frontend는 database에 직접 접속하지 않는다. 모든 데이터 접근은 Laravel API를 통한다.

명시적인 요청 없이 다음 기술을 추가하지 않는다.

- Supabase, Firebase 등 외부 BaaS
- PostgreSQL, MongoDB
- Next.js, Express, NestJS 등 Node.js 서버
- Laravel 이외의 PHP framework
- Docker
- 별도 인증 서버 또는 자체 JWT 토큰 인증

## Database 운영 방식

개발용 database를 두지 않는다. 운영 MariaDB 하나만 사용한다.
로컬 개발환경은 사용자 허용에 따라 Cafe24 운영 MariaDB endpoint에 직접 연결할 수 있으며 SSH tunnel은 필수가 아니다.
자동 테스트는 운영 DB를 사용하지 않고 SQLite in-memory만 사용한다.
비파괴 migration은 SQL을 검토한 뒤 로컬에서 운영 MariaDB에 바로 적용한다. Destructive migration은 backup 확인과 별도 승인을 요구한다.
세부 규칙은 `security`, `database`, `tests` 지침을 따른다.

## 공통 원칙

- 기존 저장소를 조사한 후 변경한다.
- 기존 구조와 코딩 패턴을 우선한다.
- 현재 요청에 필요한 최소 범위만 구현한다.
- 관련 없는 대규모 리팩터링을 하지 않는다.
- 기존에 적용된 migration을 수정하지 않는다.
- 데이터베이스 변경은 새 migration으로 작성한다.
- 실제 고객정보를 seed나 테스트 데이터에 사용하지 않는다.
- 비밀정보를 source code에 하드코딩하지 않는다.
- 실제 실행하지 않은 테스트를 성공했다고 보고하지 않는다.
- 불명확한 업무 규칙은 `가정`, `확인 필요`, `구현 보류`로 표시한다.

## 장비 기능과 지침 동기화

- 새 장비 카테고리를 지원하거나 기존 장비 종류의 사양·마스터·점검 기능을 추가할 때는 관련 `.github/instructions/*.instructions.md`도 같은 작업에서 갱신한다.
- 새 카테고리는 코드값, 사용자 표시명, 허용 사양, 점검 마스터 및 입력 규칙을 확인한 뒤 `equipment-domain.instructions.md`와 `inspection.instructions.md`에 기록한다.
- 확인되지 않은 점검 기준, 단위, 측정 횟수 또는 결과 판정 규칙을 추측해 문서나 코드에 추가하지 않는다. 미확정 사항은 `확인 필요`로 표시한다.
- 지침의 변경이 필요한 기능을 구현할 때 지침 동기화를 작업 완료 기준과 테스트 계획에 포함한다.

## 업무 언어

- 사용자 화면과 메시지는 한국어로 작성한다.
- 코드와 데이터베이스 식별자는 영어로 작성한다.
- 날짜는 `YYYY-MM-DD`로 표시한다.
- 금액은 원화와 천 단위 구분기호를 사용한다.

## 구현 절차

1. 관련 파일과 현재 구현을 조사한다.
2. 영향을 받는 화면, 역할 및 데이터를 파악한다.
3. 변경 파일과 테스트 계획을 수립한다.
4. 화면, API, DB를 가능한 작은 수직 슬라이스로 나눠 구현한다.
5. 각 슬라이스 직후 해당 동작의 가장 좁은 테스트만 실행하고 실패를 해결한다.
6. 인증, 권한 및 개인정보 영향을 검토한다.
7. 변경 범위에 필요한 검증만 추가로 실행한다(예: 타입을 바꾼 경우 typecheck, 배포 결과물이 필요한 경우 build).
8. 실행 결과와 제한사항을 보고한다.

### 검증 효율 원칙

개발 속도와 효율성을 우선한다. 항상 `최소 검증 → 실패 시 범위 확대 → 필요한 경우 최종 전체 검증` 순서로 작업한다.

- 코드 변경 후 전체 build/test를 무조건 실행하지 않는다. 변경 범위와 관련된 최소 테스트만 먼저 수행한다.
- Frontend 전체 테스트(`pnpm test`, 인자 없는 `vitest run`)는 실행하지 않는다. 변경한 기능의 테스트 파일만 실행한다(예: `pnpm exec vitest run src/features/inspections/inspection-report.test.tsx`).
- Backend는 변경한 기능의 테스트만 `php artisan test --filter=<TestClass>`로 실행한다. 공통 미들웨어·인증·공통 응답 형식처럼 영향이 넓은 변경일 때만 전체 실행을 검토한다.
- 성공한 테스트를 불필요하게 반복하지 않는다. 그 뒤 관련 코드를 바꾼 경우에만 다시 실행한다.
- 시간이 오래 걸리는 명령(build, 전체 test, migrate preview 등)을 반복 실행하지 않고 더 빠른 대안(파일 단위 test, `get_errors`, typecheck)을 사용한다.
- 오류가 있을 때만 관련 로그를 확인한다. 대용량 로그 전체를 읽거나 분석하지 말고 필요한 오류 패턴(`FAIL`, `Error`, `Tests:` 등)만 검색한다.

## 결과 보고 형식

### 요청 이해

### 저장소 조사 결과

### 구현 계획

### 변경 파일

### 데이터베이스 변경

### 보안 및 권한

### 테스트 결과

### 수동 확인 방법

### 알려진 제한사항

### 다음 권장 작업