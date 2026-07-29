#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-$HOME/OpportunityOS/opportunityos}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${TARGET_DIR}-backup-${TIMESTAMP}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Hedef proje bulunamadı: $TARGET_DIR" >&2
  exit 1
fi

if [[ ! -f "$TARGET_DIR/package.json" ]]; then
  echo "Hedef klasör Next.js proje kökü değil: $TARGET_DIR" >&2
  exit 1
fi

echo "1/5 Yedek oluşturuluyor: $BACKUP_DIR"
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  "$TARGET_DIR/" "$BACKUP_DIR/"

echo "2/5 Yeni sürüm aktarılıyor"
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env.local' \
  --exclude='.DS_Store' \
  --exclude='*.pem' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

cd "$TARGET_DIR"
rm -rf certificates .DS_Store app/.DS_Store src/.DS_Store
rm -f tsconfig.tsbuildinfo package-lock.json

echo "3/5 Bağımlılıklar kuruluyor"
pnpm install --frozen-lockfile

echo "4/5 Kod doğrulanıyor"
pnpm lint
pnpm build

echo "5/5 Tamamlandı"
echo "Yedek: $BACKUP_DIR"
echo "Proje: $TARGET_DIR"
echo "Sonraki adım: Supabase SQL Editor'da supabase/migrations/004_catalog_sync_runs.sql dosyasını çalıştır."
