---
description: JYTS Laravel API, 인증, 권한 및 서버 구현 규칙
applyTo: "backend/**/*.php"
---

# Backend 규칙 (Laravel)

## 구조

- API route는 `routes/api.php`에 둔다. 경로 prefix는 `/api`다.
- Controller는 얇게 유지하고 업무 로직은 service 또는 action class에 둔다.
- 입력 검증은 FormRequest로 한다.
- 응답은 API Resource로 필요한 field만 반환한다.
- 사용자 메시지는 한국어로 작성한다.

## 인증

- Laravel Sanctum SPA 인증(세션 쿠키)을 사용한다.
- 공개 회원가입 route를 만들지 않는다.
- 로그인 route에 rate limit을 적용한다.
- 로그인 성공 시 `session()->regenerate()`, 로그아웃 시 `invalidate()`와 `regenerateToken()`을 호출한다.
- 업무 API는 `auth:sanctum`과 활성 사용자 확인 middleware를 모두 거친다.

## 권한

MariaDB에는 Row Level Security가 없으므로 모든 권한은 Laravel에서 시행한다.

- 모든 controller action에서 Policy(`$this->authorize()` 또는 `Gate`)를 명시적으로 호출한다.
- 기본은 거부다. 허용 조건이 명확한 경우에만 허용한다.
- 역할과 활성 여부는 요청 값이 아니라 인증된 `users` record에서 읽는다.
- 직원 등록·수정·퇴사·복원은 User Policy에서 ADMIN 여부를 검사한다. 허용 role은 `ADMIN`과 `USER`뿐이다.
- 인증과 직원 API는 email 대신 5자 영문 username을 사용한다. 서버에서 username을 lowercase로 정규화한 뒤 case-insensitive unique를 검증하며 email은 nullable이다. `wkkim97@gmail.com` 기존 계정 username은 `admin`으로 유지한다.
- 퇴사 처리와 role 변경은 `auth_version`을 증가시켜 기존 세션을 무효화한다.
- 장비 담당자로 새 지정할 직원은 active 여부를 서버에서 검증한다. 이미 지정된 직원이 퇴사한 경우 담당자 연결은 유지할 수 있다.
- route parameter의 record가 현재 사용자가 접근 가능한 대상인지 확인한다(IDOR 방지).
- 사용자 자신의 역할과 활성 상태는 변경할 수 없다.

## 데이터 접근

- Eloquent 또는 query builder의 parameter binding을 사용한다.
- 사용자 입력을 SQL 문자열에 직접 넣지 않는다(`DB::raw`, `whereRaw` 포함).
- 정렬 및 필터 column은 허용 목록으로 검증한다.
- Model에는 `$fillable`을 명시한다. `$guarded = []`를 사용하지 않는다.
- `role`, `active`, `created_by` 등 보호 field는 일반 입력으로 mass assignment하지 않는다.
- N+1 query를 피한다.

## 오류와 로그

- 운영에서 stack trace와 내부 오류를 응답에 포함하지 않는다(`APP_DEBUG=false`).
- API 오류는 일관된 JSON 형식으로 반환한다.
- 로그에 password, token, 세션 ID, 개인정보 전체를 기록하지 않는다.

## 파일

- 업무 파일은 `storage/app/private`에 저장한다.
- 저장 파일명은 서버에서 생성한다.
- MIME type, 확장자, 크기를 서버에서 검증한다.
- 다운로드는 Policy 확인 후 controller에서 stream한다.

## 배포

- 웹에서는 Laravel `public/`만 노출한다. `.env`, `storage/`, `vendor/`는 웹 root 밖에 둔다.
- `.env`는 서버에서만 관리하고 Git에 commit하지 않는다.
- 배포 후 `php artisan config:cache`, `route:cache`를 실행한다.
