#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${TARGET_DIR:-$HOME/OpportunityOS/opportunityos}"
BACKUP_DIR="${TARGET_DIR}-backup-production-$(date +%Y%m%d-%H%M%S)"
[[ -d "$TARGET_DIR" ]] || { echo "Ana proje bulunamadı: $TARGET_DIR"; exit 1; }
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' "$TARGET_DIR/" "$BACKUP_DIR/"
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.env.local' --exclude='.env.production' "$SOURCE_DIR/" "$TARGET_DIR/"
cd "$TARGET_DIR"
pnpm install --frozen-lockfile
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm production:verify
echo "Kurulum tamamlandı. Yedek: $BACKUP_DIR"
echo "Sıradaki migration: supabase/migrations/006_production_hardening.sql"
