#!/usr/bin/env bash
set -euo pipefail
TARGET_DIR="${TARGET_DIR:-$HOME/OpportunityOS/opportunityos}"
BACKUP_DIR="${1:-}"
[[ -n "$BACKUP_DIR" && -d "$BACKUP_DIR" ]] || { echo "Kullanım: bash scripts/rollback-production.sh /yedek/yolu"; exit 1; }
rsync -a --delete --exclude='.git' --exclude='.env.local' --exclude='.env.production' "$BACKUP_DIR/" "$TARGET_DIR/"
echo "Kod geri alındı: $BACKUP_DIR"
