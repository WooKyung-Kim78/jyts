---
description: JYTS React, TypeScript, UI 및 폼 구현 규칙
applyTo: "src/**/*.{ts,tsx,css}"
---

# Frontend 규칙

## 기본 기술

- React
- TypeScript strict mode
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- date-fns

## 프로젝트 구조

기능별 구조를 사용한다.

```text
src/
  components/
  features/
    auth/
    dashboard/
    organizations/
    equipment/
    inspections/
    service-requests/
    administration/
  lib/
    api/
    schemas/
  types/
```

각 feature에는 필요한 경우 다음 디렉터리를 둔다.

```text
api/
components/
hooks/
pages/
schemas/
types/
```

기존 저장소 구조가 있으면 기존 구조를 우선한다.

## TypeScript

- strict mode를 유지한다.
- 불필요한 `any`를 사용하지 않는다.
- 필요하면 `unknown`과 type narrowing을 사용한다.
- nullable과 optional을 구분한다.
- status 값은 명확한 union type으로 표현한다.
- type assertion과 non-null assertion을 최소화한다.
- API 응답은 신뢰하지 않고 Zod schema로 검증한다.

## 데이터 접근

Frontend는 database에 직접 접속하지 않는다. 모든 데이터는 Laravel API(`/api`)를 통해 접근한다.

API client는 공통 모듈에서 관리한다.

```text
src/lib/api/
  client.ts
```

- 같은 도메인 요청에 세션 쿠키를 포함한다(`credentials: 'include'`).
- 상태 변경 요청에는 CSRF token(`X-XSRF-TOKEN`)을 보낸다.
- API 호출을 UI component 안에 직접 작성하지 않는다.
- 기능별 `api/` 계층과 TanStack Query hook에서 처리한다.
- API 오류를 무시하지 않는다. 401은 로그인 화면, 403은 권한 없음으로 처리한다.
- 서버 내부 오류를 사용자에게 그대로 표시하지 않는다.

## 폼과 검증

- React Hook Form과 Zod를 사용한다.
- 클라이언트 입력을 신뢰하지 않는다.

다음 항목을 검증한다.

- 필수값
- 문자열 길이
- 숫자 범위
- 날짜 형식
- 날짜 순서
- 수량
- 비용
- UUID
- 허용된 상태
- 허용된 상태 전환
- 장비별 specification
- 파일 형식과 크기

사용자에게 JSON 원문을 입력하게 하지 않는다.

## UI와 접근성

- 사용자 화면은 한국어로 작성한다.
- 모바일과 데스크톱을 모두 지원한다.
- 모바일에서 점검과 A/S 처리를 완료할 수 있어야 한다.
- 상태는 색상과 텍스트를 함께 표시한다.
- 색상만으로 의미를 전달하지 않는다.
- 입력 필드에는 명시적인 label을 제공한다.
- 키보드 사용과 focus 상태를 고려한다.
- loading, empty, error 상태를 구현한다.
- 페이지 데이터를 처음 불러오는 동안(캐시 없는 query fetch 또는 route 전환) `AppLayout`의 `PageLoadingOverlay`가 전체 화면을 덮고 기존 화면을 blur 처리하며, 로딩이 끝나면 자동으로 사라진다. 백그라운드 refetch와 저장(mutation)에는 표시하지 않는다.
- 저장 성공과 실패를 명확히 표시한다.
- 미저장 변경사항이 있으면 화면 이탈 전에 경고한다.
- 삭제 또는 비활성화 전에 확인한다.
- 위험한 작업은 일반 저장 버튼과 구분한다.

## 금지사항

- `dangerouslySetInnerHTML`을 기본적으로 사용하지 않는다.
- secret을 frontend 코드나 `VITE_` 환경 변수에 두지 않는다.
- client-side role 검사만으로 권한을 구현하지 않는다.
- 사용자 입력을 query column 이름으로 직접 사용하지 않는다.
- 사용자에게 내부 오류 또는 credential을 노출하지 않는다.
