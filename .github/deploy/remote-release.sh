#!/usr/bin/env bash
# Runs on the Cafe24 server.
# Usage: remote-release.sh <app-dir-under-home> <release-name> <php-bin> [web-root-under-home]
set -euo pipefail

APP_ROOT="$HOME/$1"
RELEASE="$2"
PHP_BIN="$3"
WEB_ROOT="$HOME/${4:-www}"
KEEP_RELEASES=5

RELEASES="$APP_ROOT/releases"
SHARED="$APP_ROOT/shared"
INCOMING="$APP_ROOT/incoming"
TARGET="$RELEASES/$RELEASE"

if [ ! -f "$SHARED/.env" ]; then
  echo "ERROR: $SHARED/.env 가 없습니다. 서버에 운영용 .env 를 먼저 만들어 주세요." >&2
  exit 1
fi
if [ ! -d "$WEB_ROOT" ]; then
  echo "ERROR: 웹 루트 $WEB_ROOT 가 없습니다." >&2
  exit 1
fi

mkdir -p "$TARGET" \
  "$SHARED/storage/app/private" "$SHARED/storage/app/public" \
  "$SHARED/storage/framework/cache/data" "$SHARED/storage/framework/sessions" \
  "$SHARED/storage/framework/views" "$SHARED/storage/logs"

tar -xzf "$INCOMING/release.tar.gz" -C "$TARGET"
ln -sfn "$SHARED/.env" "$TARGET/.env"
rm -rf "$TARGET/storage"
ln -sfn "$SHARED/storage" "$TARGET/storage"

cd "$TARGET"
"$PHP_BIN" artisan config:cache --no-ansi
"$PHP_BIN" artisan route:cache --no-ansi

# Migrations are reviewed and applied manually before publishing; never run them here.
if "$PHP_BIN" artisan migrate:status --no-ansi | grep -q 'Pending'; then
  echo "ERROR: 운영 DB에 적용되지 않은 migration 이 있습니다. SQL 검토 후 먼저 적용한 뒤 다시 배포하세요." >&2
  "$PHP_BIN" artisan migrate:status --no-ansi | grep 'Pending' >&2
  rm -rf "$TARGET"
  exit 1
fi

# The web root itself cannot be replaced on Cafe24, so only the entry files and built assets are copied into it.
NEW_ASSETS="$TARGET/public/app"
mkdir -p "$WEB_ROOT/app"
cp -R "$NEW_ASSETS/." "$WEB_ROOT/app/"
cp "$TARGET/public/.htaccess" "$WEB_ROOT/.htaccess"
for file in robots.txt favicon.ico; do
  [ -f "$TARGET/public/$file" ] && cp "$TARGET/public/$file" "$WEB_ROOT/$file"
done
if [ -f "$WEB_ROOT/index.html" ]; then
  mv "$WEB_ROOT/index.html" "$WEB_ROOT/index.html.bak-$(date +%Y%m%d%H%M%S)"
fi

sed "s#__RELEASE_PATH__#$TARGET#" "$INCOMING/www-index.php" > "$WEB_ROOT/index.php.next"
mv -f "$WEB_ROOT/index.php.next" "$WEB_ROOT/index.php"

ln -sfn "$TARGET" "$APP_ROOT/current.next"
mv -Tf "$APP_ROOT/current.next" "$APP_ROOT/current"

# Remove built assets that the new release no longer references.
(cd "$WEB_ROOT/app" && find . -type f) | while read -r asset; do
  [ -e "$NEW_ASSETS/$asset" ] || rm -f "$WEB_ROOT/app/$asset"
done

ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
rm -f "$INCOMING/release.tar.gz"

echo "배포 완료: $RELEASE"
