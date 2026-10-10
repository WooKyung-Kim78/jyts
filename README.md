# JYTS 장비 이력 관리 시스템

JYTS가 고객사 서버실에 납품·유지보수하는 장비(항온항습기, UPS, 소방장비, 음성통보기 등)의 정보, 정기점검, A/S 이력을 관리하는 한국어 웹 애플리케이션입니다.

- **Frontend**: React + TypeScript + Vite (저장소 루트)
- **Backend**: Laravel API + Sanctum 세션 인증 (`backend/`)
- **Database**: Cafe24 MariaDB (운영 DB 하나만 사용, 개발용 DB 없음)
- **자동 테스트**: Vitest(Frontend), PHPUnit + SQLite in-memory(Backend) — 운영 DB에 접속하지 않습니다.

> ⚠️ 로컬 개발 환경도 **운영 MariaDB에 직접 연결**합니다. 화면에서 데이터를 만들거나 수정하면 실제 운영 데이터가 바뀝니다. 테스트용 데이터나 실제 고객정보를 함부로 만들거나 지우지 마세요.

---

## 목차

1. [폴더 구조](#1-폴더-구조)
2. [처음 한 번만: 프로그램 설치](#2-처음-한-번만-프로그램-설치)
3. [처음 한 번만: 프로젝트 준비](#3-처음-한-번만-프로젝트-준비)
4. [매일: VS Code에서 실행하기](#4-매일-vs-code에서-실행하기)
5. [끄기와 다시 켜기](#5-끄기와-다시-켜기)
6. [테스트와 검사](#6-테스트와-검사)
7. [배포용 빌드](#7-배포용-빌드)
8. [자동 배포 (publish 브랜치)](#8-자동-배포-publish-브랜치)
9. [자주 생기는 문제](#9-자주-생기는-문제)
10. [보안 주의사항](#10-보안-주의사항)

---

## 1. 폴더 구조

```text
jyts/
├─ src/                  React 화면 코드
│  ├─ features/          기능별 코드 (auth, equipment, inspections, employees ...)
│  └─ components/        공통 UI, 레이아웃
├─ tests/e2e/            Playwright e2e 테스트
├─ backend/              Laravel API 서버
│  ├─ app/               Controller, Model, Policy, Request ...
│  ├─ database/migrations/  DB 구조 변경 이력
│  ├─ routes/api.php     API 경로
│  └─ tests/             PHPUnit 테스트
├─ .github/              Copilot 작업 지침 (코딩 규칙)
└─ package.json          Frontend 실행 명령(scripts)
```

---

## 2. 처음 한 번만: 프로그램 설치

Windows 기준입니다. **PowerShell**(시작 메뉴 → "PowerShell")에서 실행하세요.

| 프로그램 | 버전 | 설치 방법 |
|---|---|---|
| VS Code | 최신 | https://code.visualstudio.com 에서 설치 |
| Git | 최신 | `winget install Git.Git` |
| Node.js | 22.12 이상 | `winget install OpenJS.NodeJS.LTS` |
| pnpm | 10.x | Node 설치 후 `corepack enable` |
| PHP | 8.4 | `winget install PHP.PHP.8.4` |
| Composer | 2.x | https://getcomposer.org/download/ 의 Windows Installer |

설치 후 **PowerShell을 새로 열고** 아래 명령으로 버전이 나오는지 확인합니다.

```powershell
git --version
node --version      # v22.12 이상
pnpm --version      # 10.x
php --version       # PHP 8.4.x
composer --version
```

### PHP 확장 켜기 (php.ini)

1. php.ini 위치 확인:
   ```powershell
   php --ini
   ```
   `Loaded Configuration File:` 뒤에 나오는 경로의 파일을 메모장이나 VS Code로 엽니다.
   (파일이 없으면 같은 폴더의 `php.ini-development`를 복사해 `php.ini`로 이름을 바꿉니다.)
2. 아래 줄의 맨 앞 `;`를 지워서 켭니다.
   ```ini
   extension=curl
   extension=fileinfo
   extension=intl
   extension=mbstring
   extension=openssl
   extension=pdo_mysql
   extension=pdo_sqlite
   extension=sqlite3
   extension=zip
   zend_extension=opcache
   ```
3. `[opcache]` 구역에서 아래 값을 설정합니다. (로컬 API 속도가 크게 좋아집니다.)
   ```ini
   opcache.enable=1
   opcache.enable_cli=1
   opcache.memory_consumption=128
   opcache.interned_strings_buffer=16
   opcache.max_accelerated_files=20000
   opcache.revalidate_freq=0
   ```
4. 확인:
   ```powershell
   php -m
   ```
   목록에 `pdo_mysql`, `pdo_sqlite`, `Zend OPcache` 등이 보이면 성공입니다.

### VS Code 확장 (권장)

VS Code 왼쪽의 확장(Extensions, `Ctrl+Shift+X`)에서 검색해 설치합니다.

- **ESLint** — 코드 규칙 검사
- **Tailwind CSS IntelliSense** — 스타일 클래스 자동완성
- **PHP Intelephense** — PHP 자동완성
- **GitHub Copilot / Copilot Chat** — `.github/` 지침을 따라 작업

---

## 3. 처음 한 번만: 프로젝트 준비

### 3-1. 소스 받기와 VS Code로 열기

```powershell
cd C:\Temp
git clone https://github.com/WooKyung-Kim78/jyts.git
code jyts
```

VS Code가 열리면 메뉴 **Terminal → New Terminal** (단축키 `` Ctrl+` ``)로 터미널을 엽니다.
터미널의 현재 위치가 `C:\Temp\jyts` 인지 확인하세요.

### 3-2. Frontend 패키지 설치

```powershell
pnpm install
```

### 3-3. Backend 패키지 설치

```powershell
cd backend
composer install
```

### 3-4. Backend 환경 설정 파일(.env) 만들기

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

VS Code에서 `backend/.env`를 열고 DB 접속 정보를 입력합니다. **값은 관리자에게 따로 받으세요.**

```ini
DB_CONNECTION=mariadb
DB_HOST=<관리자에게 받은 DB 주소>
DB_PORT=<포트>
DB_DATABASE=<DB 이름>
DB_USERNAME=<DB 사용자>
DB_PASSWORD=<DB 비밀번호>
```

> `.env`에는 비밀번호가 들어 있으므로 **절대 Git에 올리지 않습니다.** (`.gitignore`로 제외되어 있습니다.)
> Cafe24 DB에 외부 접속이 허용되어 있어야 직접 연결할 수 있습니다. 허용되지 않은 경우 SSH 터널을 사용합니다:
> `ssh -N -L 3307:localhost:3306 <ssh-user>@wkkim97b.mycafe24.com` 후 `DB_HOST=127.0.0.1`, `DB_PORT=3307`.

### 3-5. DB 연결 확인 (읽기 전용)

```powershell
php artisan tinker --execute="DB::select('select 1'); echo 'DB 연결 성공';"
```

`DB 연결 성공`이 나오면 됩니다. 실패하면 [9. 자주 생기는 문제](#9-자주-생기는-문제)를 보세요.

> DB 구조(migration)는 이미 운영 DB에 적용되어 있습니다. **`php artisan migrate`를 함부로 실행하지 마세요.**
> 새 migration을 적용할 때는 먼저 `php artisan migrate --pretend`로 SQL을 확인한 뒤 적용합니다.
> `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe`, `db:seed`는 운영 DB에 절대 실행하지 않습니다.

### 3-6. (필요할 때만) 관리자 계정 만들기

로그인 아이디는 **영문 5자**입니다. 계정은 관리자 화면(직원 관리)에서 만들 수 있으므로 보통은 필요 없습니다.

```powershell
php artisan app:create-admin <아이디5자> "<이름>" --email=<이메일(선택)>
```

비밀번호는 명령 실행 중에 입력합니다(영문+숫자+특수문자, 8자 이상).

---

## 4. 매일: VS Code에서 실행하기

API 서버와 화면 서버, **두 개의 터미널**을 띄워 둡니다.

### 터미널 1 — API 서버 (Laravel)

VS Code에서 `` Ctrl+` `` 로 터미널을 열고:

```powershell
cd C:\Temp\jyts
pnpm api:dev
```

`Server running on [http://127.0.0.1:8000]` 이 보이면 성공입니다. **이 터미널은 닫지 말고 그대로 둡니다.**

### 터미널 2 — 화면 서버 (Vite)

터미널 패널 오른쪽 위의 **`+` 버튼**으로 새 터미널을 열고:

```powershell
cd C:\Temp\jyts
pnpm dev
```

`Local: http://localhost:5173/` 이 보이면 성공입니다.

### 브라우저로 접속

브라우저에서 **http://localhost:5173** 을 열고, 받은 아이디(영문 5자)와 비밀번호로 로그인합니다.

- 화면 코드(`src/`)를 고치면 브라우저가 **자동으로** 바뀝니다.
- API 코드(`backend/`)를 고치면 다음 요청부터 바로 반영됩니다.
- `backend/.env` 또는 `php.ini`를 고쳤을 때는 **API 서버를 다시 켜야** 합니다.

> 터미널 2개가 헷갈리면 터미널 패널 오른쪽 목록에서 이름(`node`, `php` 등)을 보고 구분하세요.

---

## 5. 끄기와 다시 켜기

| 하고 싶은 일 | 방법 |
|---|---|
| 서버 끄기 | 해당 터미널을 클릭하고 **`Ctrl + C`** |
| 다시 켜기 | 같은 터미널에서 `pnpm api:dev` 또는 `pnpm dev` |
| 터미널을 못 찾을 때 (8000 포트 강제 종료) | `Get-NetTCPConnection -LocalPort 8000 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |

---

## 6. 테스트와 검사

변경한 기능과 관련된 것만 실행합니다. **Frontend 전체 테스트(`pnpm test`)는 오래 걸리므로 실행하지 않습니다.**

```powershell
# 코드 규칙 / 타입 검사
pnpm lint
pnpm typecheck

# Frontend: 바꾼 기능의 테스트 파일만
pnpm exec vitest run src/features/inspections/inspection-form.test.tsx

# Backend: 바꾼 기능의 테스트 클래스만 (SQLite 메모리 DB 사용, 운영 DB 접속 안 함)
cd backend
php artisan test --filter=InspectionTest
```

---

## 7. 배포용 빌드

```powershell
pnpm build
```

빌드 결과는 `backend/public/app/`에 만들어지고, Laravel이 같은 도메인에서 화면과 `/api`를 함께 제공합니다.
운영 서버에서는 `.env`를 `APP_ENV=production`, `APP_DEBUG=false`로 두고 배포 후 아래를 실행합니다.

```bash
php artisan config:cache
php artisan route:cache
```

보통은 직접 빌드하지 않고 아래 자동 배포를 사용합니다.

---

## 8. 자동 배포 (publish 브랜치)

`publish` 브랜치에 코드가 들어가면(merge 또는 push) GitHub Actions(`.github/workflows/publish.yml`)가 자동으로 실행됩니다.

```text
main ──(Pull Request merge)──▶ publish ──▶ GitHub Actions
  1) Frontend lint + build
  2) Backend 테스트 (SQLite, 운영 DB 접속 없음)
  3) 운영용 PHP 패키지 설치 후 압축
  4) SSH로 Cafe24에 업로드 → ~/jyts/releases/<시각-커밋> 에 풀기
  5) config/route 캐시, 미적용 migration 검사
  6) ~/www 에 진입 파일(index.php, .htaccess)과 화면 빌드(app/) 복사
  7) index.php 가 새 버전을 가리키도록 교체 (최근 5개 버전 보관)
```

어느 단계든 6) 이전에 실패하면 서버의 현재 버전은 바뀌지 않습니다.

서버 폴더 구조 (`~/www`는 Cafe24가 정한 웹 루트라 바꾸지 않습니다):

```text
~/www/                     웹에 공개되는 폴더 (배포가 아래 파일만 관리)
  index.php                Laravel 진입 파일 (현재 버전 경로를 가리킴)
  .htaccess                주소 재작성 규칙
  app/                     화면 빌드 파일 (JS, CSS)
~/jyts/                    웹에서 접근할 수 없는 폴더
  releases/<버전>/        Laravel 코드 (vendor 포함)
  current → releases/<최신>
  shared/.env              운영 설정 (비밀번호 포함)
  shared/storage/          업로드 파일, 세션, 로그
```

`.env`, `vendor`, 업로드 파일은 모두 `~/www` 밖에 있어 웹으로 직접 열 수 없습니다.

### 8-1. 처음 한 번: 서버 준비 (Cafe24 SSH)

```bash
mkdir -p ~/jyts/shared ~/jyts/releases ~/jyts/incoming
vi ~/jyts/shared/.env        # 운영용 .env 작성 (아래 항목 참고)
chmod 600 ~/jyts/shared/.env
```

첫 배포 때 `~/www/index.html`이 있으면 `index.html.bak-<시각>`으로 이름이 바뀝니다(`index.php`가 먼저 열리도록). `~/www`의 다른 파일은 건드리지 않습니다.

운영용 `.env` 주요 값 (`backend/.env.example`을 복사해 수정):

```ini
APP_ENV=production
APP_DEBUG=false
APP_KEY=<로컬에서 php artisan key:generate --show 로 만든 값>
APP_URL=https://wkkim97b.mycafe24.com
LOG_LEVEL=warning
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=<DB 이름>
DB_USERNAME=<DB 사용자>
DB_PASSWORD=<DB 비밀번호>
DB_PERSISTENT=false
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=wkkim97b.mycafe24.com
```

> 이미 운영 중인 `APP_KEY`가 있다면 그 값을 그대로 쓰세요. 바꾸면 기존 로그인 세션이 모두 끊깁니다.

### 8-2. 처음 한 번: GitHub에 비밀값 등록

내 PC(PowerShell)에서 서버 식별값(known_hosts)을 클립보드로 복사합니다:

```powershell
ssh-keyscan -p 22 wkkim97b.mycafe24.com 2>$null | Set-Clipboard
```

`DEPLOY_KNOWN_HOSTS`에 그대로 붙여넣습니다. 보통 `wkkim97b.mycafe24.com ssh-rsa ...`, `... ecdsa-sha2-nistp256 ...`, `... ssh-ed25519 ...` 처럼 **서버 주소로 시작하는 줄 2~3개**입니다.
`#`으로 시작하는 줄만 있거나 비어 있으면 잘못 복사된 것입니다.

> `DEPLOY_HOST`는 위 명령에 쓴 주소와 **글자까지 똑같아야** 합니다(`https://`, `www.`, IP 주소, 앞뒤 공백 없이).

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**

| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` | `wkkim97b.mycafe24.com` |
| `DEPLOY_USER` | Cafe24 SSH 아이디 |
| `DEPLOY_PASSWORD` | Cafe24 SSH 비밀번호 |
| `DEPLOY_KNOWN_HOSTS` | 위 `ssh-keyscan` 출력 전체 |
| `DEPLOY_PORT` | (선택) SSH 포트, 기본 22 |

(선택) **Variables** 탭: `DEPLOY_APP_DIR`(기본 `jyts`), `DEPLOY_PHP_BIN`(기본 `/usr/local/php84/bin/php`), `DEPLOY_WEB_ROOT`(기본 `www`)

> 비밀번호는 GitHub Secret에만 넣고 다른 곳(채팅, 문서, 저장소)에 올리지 마세요.
> Cafe24 SSH 비밀번호를 바꾸면 `DEPLOY_PASSWORD`도 같이 바꿔야 배포됩니다.

### 8-3. 배포하기

1. DB 구조 변경(migration)이 있다면 **먼저** 로컬에서 `php artisan migrate --pretend`로 SQL을 검토하고 적용합니다.
   적용하지 않은 migration이 남아 있으면 자동 배포가 일부러 실패합니다(서버는 바뀌지 않음).
2. GitHub에서 **Pull requests → New pull request**, base: `publish` ← compare: `main` → **Create** → **Merge**.
   (또는 터미널에서 `git push origin main:publish`)
3. GitHub → **Actions** 탭에서 "Publish to Cafe24" 진행 상황을 확인합니다. 초록색 체크면 배포 완료입니다.
4. Actions 탭의 **Run workflow** 버튼으로 다시 배포할 수도 있습니다.
5. 브라우저에서 https://wkkim97b.mycafe24.com 이 열리고 로그인되는지 확인합니다.

### 8-4. 문제가 생겨 이전 버전으로 되돌리기

GitHub → **Actions** → "Publish to Cafe24" 목록에서 **정상이었던 이전 실행**을 열고 **Re-run all jobs**를 누릅니다.
그 커밋으로 다시 빌드·배포되며 `~/www/index.php`와 화면 파일도 함께 되돌아갑니다.

---

## 9. 자주 생기는 문제

| 증상 | 원인과 해결 |
|---|---|
| `pnpm` 실행 시 "스크립트를 실행할 수 없습니다" | PowerShell 실행 정책 문제. `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 실행 후 터미널 재시작 |
| `pnpm`/`php`/`composer`를 찾을 수 없음 | 설치 후 VS Code와 터미널을 **완전히 닫았다가** 다시 열기 |
| 화면에 "로그인이 필요합니다"만 반복 | 터미널 1(API 서버)이 꺼져 있음. `pnpm api:dev` 실행 |
| `419` 세션 만료 오류 | 브라우저 새로고침(F5) 후 다시 시도 |
| `Address already in use` / 포트 사용 중 | 이미 서버가 켜져 있음. [5. 끄기와 다시 켜기](#5-끄기와-다시-켜기)의 강제 종료 명령 사용 |
| DB 연결 실패 (`SQLSTATE[HY000] [2002]`) | `backend/.env`의 DB 주소·포트 확인, Cafe24 외부 접속 허용 여부 확인 |
| DB 연결 실패 (`could not find driver`) | php.ini에서 `extension=pdo_mysql` 켜기 |
| API가 많이 느림 | php.ini의 opcache 설정 확인(2장), API 서버 재시작. 로컬은 원격 DB를 쓰므로 운영보다 느린 것이 정상입니다 |
| HTTPS 인증서 오류 (`composer install` 등) | 회사/프록시 환경 인증서 문제. Windows 인증서를 PEM으로 내보내 php.ini의 `curl.cainfo`, `openssl.cafile`에 지정 |
| 코드를 고쳤는데 API에 반영이 안 됨 | php.ini의 `opcache.revalidate_freq=0` 확인 후 API 서버 재시작 |

---

## 10. 보안 주의사항

- `backend/.env`, 비밀번호, `APP_KEY`, DB 정보는 **Git, 채팅, 문서에 올리지 않습니다.**
- 실제 고객 Excel, 사진, 운영 DB 내보내기 파일을 저장소에 넣지 않습니다.
- 개발 중 확인은 가능하면 **USER 권한 계정**으로 합니다.
- 업무 규칙과 코딩 규칙은 `.github/copilot-instructions.md`와 `.github/instructions/*.md`에 있습니다.
