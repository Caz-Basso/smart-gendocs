#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
root=$(echo "$input" | jq -r '.workspace_roots[0] // empty')

if [[ -n "$root" && -d "$root" ]]; then
  cd "$root"
fi

mkdir -p .harness

ts=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")

echo "$input" | jq -c \
  --arg ts "$ts" \
  --arg branch "$branch" \
  '{ts: $ts, branch: $branch} + .' \
  >> .harness/events.jsonl

exit 0
