#!/usr/bin/env bash
set -euo pipefail

[[ -f .cursor/.env ]] && set -a && source .cursor/.env && set +a

input=$(cat)
root=$(echo "$input" | jq -r '.workspace_roots[0] // empty')

if [[ -n "$root" && -d "$root" ]]; then
  cd "$root"
fi

webhook_url="${HARNESS_NOTIFY_WEBHOOK_URL:-}"
[[ -z "$webhook_url" ]] && exit 0

event=$(echo "$input" | jq -r '.hook_event_name // "Unknown"')
msg=$(echo "$input" | jq -r '.message // empty')
session=$(echo "$input" | jq -r '.conversation_id // .session_id // empty')
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")

if [[ -z "$msg" ]]; then
  if [[ -n "${RALPH_PHASE_TITLE:-}" ]]; then
    phase_num="${RALPH_PHASE_NUM:-?}"
    phase_total="${RALPH_PHASE_TOTAL:-?}"
    attempt="${RALPH_PHASE_ATTEMPT:-1}"
    max_attempts="${RALPH_PHASE_MAX_ATTEMPTS:-?}"
    engine="${RALPH_ENGINE:-cursor}"

    case "$event" in
      stop)
        msg="[ralph/${engine}] Fase ${phase_num}/${phase_total} finalizou turno — ${RALPH_PHASE_TITLE} (tentativa ${attempt}/${max_attempts})"
        ;;
      *)
        msg="[ralph/${engine}] ${event} — Fase ${phase_num}/${phase_total} ${RALPH_PHASE_TITLE}"
        ;;
    esac
  else
    msg="[cursor] ${event} em ${branch}"
  fi
fi

payload=$(jq -n \
  --arg event "$event" \
  --arg msg "$msg" \
  --arg session "$session" \
  --arg branch "$branch" \
  --arg cwd "$PWD" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg phase "${RALPH_PHASE_TITLE:-}" \
  --arg phase_num "${RALPH_PHASE_NUM:-}" \
  --arg phase_total "${RALPH_PHASE_TOTAL:-}" \
  --arg attempt "${RALPH_PHASE_ATTEMPT:-}" \
  '{event: $event, message: $msg, session_id: $session, branch: $branch, cwd: $cwd, ts: $ts, phase: $phase, phase_num: $phase_num, phase_total: $phase_total, attempt: $attempt}')

curl_args=(-sS -X POST -H "Content-Type: application/json" -d "$payload")

if [[ -n "${HARNESS_NOTIFY_PASSWORD:-}" ]]; then
  curl_args+=(-u "beerandcode:${HARNESS_NOTIFY_PASSWORD}")
fi

curl "${curl_args[@]}" "$webhook_url" >/dev/null 2>&1 || true

exit 0
