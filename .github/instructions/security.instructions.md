---
description: JYTS 인증, 권한, 개인정보, 비밀정보 및 Storage 보안 규칙
applyTo: "**"
---

# 보안 및 개인정보 보호

## 인증

- Laravel Sanctum SPA 인증(같은 도메인, 세션 쿠키)을 사용한다.
- 비밀번호는 Laravel `Hash`(bcrypt 또는 argon2id)로만 저장한다. 평문이나 복호화 가능한 형태로 저장하지 않는다.
- 공개 회원가입을 만들지 않는다. 계정은 ADMIN이 생성한다.
- 비밀번호는 8자 이상 128자 이하다. ADMIN이 직원 등록 시 임시 비밀번호를 정하고, 사용자는 `/account/password`(API `PUT /api/user/password`)에서 현재 비밀번호를 확인한 뒤 본인 비밀번호를 변경한다. 변경 요청에는 시도 횟수 제한을 적용하고, 변경 후 현재 세션은 재생성하며 다른 기기의 세션은 해제된다.
- 로그인에 시도 횟수 제한(rate limit)을 적용한다.
- 로그인 성공 시 session을 재생성하고, 로그아웃 시 session을 무효화한다.
- 로그인 실패 메시지는 계정 존재 여부를 드러내지 않는다.
- session cookie는 `HttpOnly`, `Secure`, `SameSite=Lax` 이상으로 설정한다.
- 상태 변경 요청은 CSRF token을 검증한다.
- 운영은 HTTPS로만 제공한다.
- 로그인하지 않은 사용자는 업무 데이터에 접근할 수 없어야 한다.
- 비활성 사용자는 인증 상태여도 업무 접근을 차단한다.
- 역할 변경 또는 퇴사 처리 전 발급된 세션은 auth version 검증으로 업무 접근을 차단한다.

## 역할

지원하는 역할:

- `ADMIN`
- `USER`

권한은 다음 계층에서 시행한다.

1. Laravel 인증 middleware (`auth:sanctum`)
2. 활성 사용자 확인 middleware
3. Laravel Policy / Gate (모든 action에서 명시적으로 호출)
4. database constraint

역할과 활성 여부는 항상 서버의 `users` table에서 읽는다.

- 직원 전체 목록 조회, 등록, 역할 변경, 퇴사 처리 및 복원은 ADMIN만 할 수 있다.
- 로그인 아이디는 5자 영문 username으로 저장하고 입력 시 소문자 정규화한다. username은 case-insensitive unique여야 한다. email은 선택값이며 로그인 키가 아니다.
- `wkkim97@gmail.com` 기존 계정의 username은 `admin`으로 유지한다.
- USER는 일반 업무를 수행할 수 있으나 직원 관리와 마스터 관리 권한은 없다.
- 퇴사 직원 row는 삭제하지 않는다. 활성 상태를 끄고 auth version을 증가시킨다. 복원 시 활성화하고 auth version도 증가시킨다.
- 장비 담당자 선택 목록에는 활성 직원의 ID와 이름만 반환한다. 직원 email은 직원 관리 권한이 있는 화면 외에 불필요하게 노출하지 않는다.
- 본인 계정 퇴사, 본인 ADMIN 권한 제거, 마지막 활성 ADMIN 퇴사는 거부한다.

버튼이나 메뉴를 숨기는 것은 UX 처리일 뿐 실제 권한 통제가 아니다.

## Secret

Frontend에는 secret을 두지 않는다. `VITE_` 환경 변수는 빌드 결과에 포함되므로 공개 가능한 값만 넣는다.

다음 값은 서버 `backend/.env`에만 두고 Git에 commit하지 않는다.

- `APP_KEY`
- database 사용자명과 password
- 외부 API secret
- 관리자 credential

운영 서버는 `APP_ENV=production`, `APP_DEBUG=false`로 설정한다.

`.env`, `storage/`, `vendor/` 등 Laravel 내부 파일은 웹에서 직접 접근할 수 없어야 한다.

비밀정보를 다음 위치에 기록하지 않는다.

- source code
- migration
- test fixture
- console log
- error message
- 문서 예제
- GitHub issue
- Pull Request

## 개인정보

다음을 개인정보 또는 민감정보로 취급한다.

- 고객사 담당자명
- 전화번호
- 사업장 주소
- 장비 제조번호
- 명판 사진
- 현장 사진
- A/S 요청자 정보

규칙:

- 실제 개인정보를 seed나 test data에 사용하지 않는다.
- 실제 고객 Excel 및 사진을 Git에 commit하지 않는다.
- 운영 database export를 개발환경에서 사용하지 않는다.
- 로그에 개인정보 전체를 기록하지 않는다.
- API 응답에 불필요한 개인정보를 포함하지 않는다.
- 목록의 전화번호 마스킹을 검토한다.

## 단일 운영 database

개발용 database를 두지 않는다. 로컬 개발 환경도 운영 MariaDB에 접속하므로 다음을 지킨다.

- 사용자가 허용한 Cafe24 MariaDB endpoint로 로컬에서 직접 접속할 수 있으며, SSH tunnel은 필수가 아니다.
- 직접 접속은 Cafe24에서 외부 접속을 허용하고 방화벽/계정 권한을 설정한 경우에만 가능하다. 암호화 연결이 지원되면 TLS를 사용한다.
- 직접 연결 테스트는 `SELECT 1` 등 데이터와 schema를 변경하지 않는 쿼리만 실행한다.
- 별도 개발 DB는 사용하지 않으며, local 앱은 같은 Cafe24 운영 MariaDB를 사용한다.
- 비파괴 schema migration은 SQL을 검토한 뒤 로컬에서 운영 DB에 바로 적용할 수 있다. destructive migration은 백업과 별도 승인이 필요하다.
- 개발 중 실제 고객 데이터를 생성, 수정, 삭제하지 않는다.
- 개발 확인은 가능한 한 최소 권한(`USER`) 계정으로 한다.
- 운영 database에 테스트 데이터나 테스트 계정을 만들지 않는다.
- 자동 테스트는 운영 database에 접속하지 않는다(`tests` 지침).
- 운영 데이터를 export하여 로컬 파일, 테스트 fixture 또는 Git에 저장하지 않는다.
- 운영 서버에 테스트 파일을 업로드하지 않는다.
- database password, SSH credential 및 `APP_KEY`는 운영 credential로 취급한다.
- credential 유출이 의심되면 즉시 교체한다.

## 파일 저장

- 업무 파일은 웹 root 밖 private disk(`storage/app/private`)에 저장한다.
- 업무 파일을 public URL로 직접 제공하지 않는다. 권한 확인 후 controller가 전달한다.
- 업로드와 다운로드 권한을 각각 검증한다.

검증 항목:

- MIME type
- 파일 크기
- 허용 확장자
- 대상 업무 record 접근 권한
- storage path
- 파일명

파일명에 고객명이나 전화번호를 넣지 않는다.

사용자가 전달한 storage path를 그대로 신뢰하지 않는다.

권장 경로:

```text
equipment/{equipmentId}/{generatedFileName}
inspections/{inspectionId}/{generatedFileName}
service-requests/{serviceRequestId}/{generatedFileName}
```

## 보안 검토 항목

- 인증 우회
- 권한 상승
- IDOR
- XSS
- CSRF
- SQL Injection
- REST query manipulation
- Storage path manipulation (path traversal)
- Mass assignment
- Open redirect
- secret 노출
- 개인정보 노출
- 누락된 Policy 호출
- 무단 파일 접근
- Session fixation
- Brute force login