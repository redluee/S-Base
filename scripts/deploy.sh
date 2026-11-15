#!/usr/bin/env bash
# Production deploy. The new version is installed and built next to the running
# one; the database, the served build and the service are only touched once the
# build has passed, and everything is rolled back if the service does not come
# up healthy.
#
# Usage: deploy.sh [commit] [--force]
set -euo pipefail

REPO_PATH="${SBASE_REPO_PATH:-$HOME/Development/S-Base}"
BUN_BIN="${BUN_BIN:-$HOME/.bun/bin/bun}"
RESTART_CMD="${SBASE_RESTART_CMD:-systemctl --user restart sbase.service}"
FRONTEND_URL="${SBASE_FRONTEND_URL:-http://127.0.0.1:3000/}"
BACKEND_URL="${SBASE_BACKEND_URL:-http://127.0.0.1:3001/api/auth/me}"
HEALTH_TIMEOUT="${SBASE_HEALTH_TIMEOUT:-60}"
STAGING_DIR=".next_build"
LOG_DIR="deploy-logs"
KEEP_LOGS=20
PREVIOUS=""

step() {
  echo
  echo "==> $*"
}

abort() {
  echo
  echo "✗ $*" >&2
  exit 1
}

http_status() {
  curl -s -o /dev/null -m 5 -w '%{http_code}' "$1" || true
}

is_healthy() {
  local frontend backend
  frontend=$(http_status "$FRONTEND_URL")
  backend=$(http_status "$BACKEND_URL")
  [[ "$frontend" =~ ^[23] ]] && [[ "$backend" =~ ^[234] ]]
}

wait_healthy() {
  local i
  for ((i = 0; i < HEALTH_TIMEOUT; i++)); do
    if is_healthy; then
      return 0
    fi
    sleep 1
  done
  return 1
}

restore_code() {
  echo "Restoring the code to ${PREVIOUS:0:7}..."
  rm -rf "frontend/$STAGING_DIR"
  git reset --hard --quiet "$PREVIOUS"
  "$BUN_BIN" install --frozen-lockfile || echo "⚠ Could not reinstall the previous dependencies."
}

backup_database() {
  if [ ! -f sbase.db ]; then
    echo "No sbase.db yet, nothing to back up."
    return 0
  fi
  rm -f sbase.db.backup.3
  [ -f sbase.db.backup.2 ] && mv sbase.db.backup.2 sbase.db.backup.3
  [ -f sbase.db.backup.1 ] && mv sbase.db.backup.1 sbase.db.backup.2
  "$BUN_BIN" -e '
    const { Database } = require("bun:sqlite");
    const db = new Database("sbase.db", { readonly: true });
    db.exec("VACUUM INTO \"sbase.db.backup.1\"");
    db.close();
  '
  echo "Database backed up to sbase.db.backup.1"
}

swap_build() {
  if [ -d frontend/.next/static ]; then
    mkdir -p "frontend/$STAGING_DIR/static"
    cp -rn frontend/.next/static/* "frontend/$STAGING_DIR/static/" 2>/dev/null || true
  fi
  rm -rf frontend/.next_old
  if [ -d frontend/.next ]; then
    mv frontend/.next frontend/.next_old
  fi
  mv "frontend/$STAGING_DIR" frontend/.next
}

rollback_release() {
  step "Rolling back to ${PREVIOUS:0:7}"
  rm -rf frontend/.next
  if [ -d frontend/.next_old ]; then
    mv frontend/.next_old frontend/.next
  fi
  restore_code
  $RESTART_CMD || true
  if wait_healthy; then
    abort "The new version did not come up healthy. Rolled back to ${PREVIOUS:0:7}, which is serving again. Applied migrations were kept; the pre-deploy database is in sbase.db.backup.1."
  fi
  abort "The new version did not come up healthy and the rollback to ${PREVIOUS:0:7} is not healthy either. Check 'journalctl --user -u sbase.service'."
}

deploy() {
  local force=false target_ref="origin/main" arg target
  for arg in "$@"; do
    case "$arg" in
      --force) force=true ;;
      *) target_ref="$arg" ;;
    esac
  done

  echo "S-Base production deployment, $(date '+%Y-%m-%d %H:%M:%S')"

  step "Fetching origin/main"
  git fetch --quiet origin main
  PREVIOUS=$(git rev-parse HEAD)
  target=$(git rev-parse --verify --quiet "${target_ref}^{commit}") || abort "Unknown commit: $target_ref"
  git merge-base --is-ancestor "$target" origin/main || abort "${target:0:7} is not on origin/main."
  echo "Running:  ${PREVIOUS:0:7}"
  echo "Target:   ${target:0:7}"

  if [ "$force" = false ] && git merge-base --is-ancestor "$target" "$PREVIOUS"; then
    echo "✓ Already deployed, nothing to do."
    return 0
  fi

  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    git status --short --untracked-files=no
    abort "Tracked files have local changes on the server. Nothing was changed; restore them with 'git checkout -- <file>' and deploy again."
  fi

  step "Backing up the database"
  backup_database

  step "Updating the code and installing dependencies"
  git merge --ff-only --quiet "$target"
  if ! "$BUN_BIN" install --frozen-lockfile; then
    restore_code
    abort "Installing dependencies failed. Production still runs ${PREVIOUS:0:7}."
  fi

  step "Building into frontend/$STAGING_DIR"
  rm -rf "frontend/$STAGING_DIR"
  if ! NEXT_DIST_DIR="$STAGING_DIR" "$BUN_BIN" run build; then
    restore_code
    abort "The build failed. Production still runs ${PREVIOUS:0:7}; the database was not migrated."
  fi

  step "Running database migrations"
  if ! "$BUN_BIN" run db:migrate; then
    restore_code
    abort "Migrations failed. Production still runs ${PREVIOUS:0:7}; the pre-deploy database is in sbase.db.backup.1."
  fi

  step "Switching to the new build and restarting"
  swap_build
  if ! $RESTART_CMD || ! wait_healthy; then
    rollback_release
  fi
  rm -rf frontend/.next_old

  echo
  echo "✓ Deployed ${target:0:7} and the service is healthy."
}

main() {
  local log
  cd "$REPO_PATH"
  mkdir -p "$LOG_DIR"
  log="$LOG_DIR/deploy-$(date '+%Y%m%d-%H%M%S').log"
  find "$LOG_DIR" -name 'deploy-*.log' -type f | sort -r | tail -n +"$KEEP_LOGS" | xargs -r rm -f
  deploy "$@" 2>&1 | tee "$log"
}

main "$@"
exit
