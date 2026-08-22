#!/usr/bin/env bash
set -e

IS_MAIN_PUSH=false

if [ -t 0 ]; then
  IS_MAIN_PUSH=true
else
  while read -r local_ref local_oid remote_ref remote_oid; do
    if [[ "$remote_ref" == "refs/heads/main" || "$remote_ref" == "main" || "$local_ref" == "refs/heads/main" ]]; then
      IS_MAIN_PUSH=true
      break
    fi
  done
fi

if [ "$IS_MAIN_PUSH" = true ]; then
  echo "🔍 [Pre-Push Hook] Verifying test suites, linting, and production build before push to main..."
  
  if bun run test:all && bun run build; then
    echo "✅ [Pre-Push Hook] All tests, lint checks, and production build passed cleanly! Proceeding with push."
    exit 0
  else
    echo "❌ [Pre-Push Hook] Validation or build failed! Push to main aborted."
    exit 1
  fi
else
  echo "ℹ️ [Pre-Push Hook] Push is not targeting main branch. Skipping pre-push test enforcement."
  exit 0
fi
