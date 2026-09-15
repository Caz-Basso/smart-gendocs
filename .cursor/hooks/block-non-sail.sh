#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
cmd=$(echo "$input" | jq -r '.command // empty')
[[ -z "$cmd" ]] && exit 0

# já usa sail → libera
echo "$cmd" | grep -qE '(^|[[:space:];&|])(\./)?vendor/bin/sail([[:space:]]|$)|(^|[[:space:];&|])sail([[:space:]]|$)' && exit 0

# libera git/gh, ralph e cursor agent no host
if echo "$cmd" | grep -qE '(^|[[:space:];&|])(git[[:space:]]+(add|commit|status|diff|log|push|pull|fetch|merge|rebase|checkout|branch|stash|restore|reset|show|rev-parse)|gh[[:space:]]+(pr|issue|repo|api)|(\./)?ralph\.sh|agent[[:space:]])'; then
  exit 0
fi

# bloqueia php/composer/bun/npm/pest/phpunit/artisan e binários Laravel direto no host
if echo "$cmd" | grep -qE '(^|[[:space:];&|])(php|composer|bun|npm|pest|phpunit|artisan)([[:space:]]|$)'; then
  blocked=1
elif echo "$cmd" | grep -qE '(^|[[:space:];&|])(\./)?vendor/bin/(pint|rector|phpstan|pest|phpunit)([[:space:]]|$)'; then
  blocked=1
elif echo "$cmd" | grep -qE '(^|[[:space:];&|])(\./)?bin/(pint|rector|phpstan)([[:space:]]|$)'; then
  blocked=1
fi

if [[ "${blocked:-0}" -eq 1 ]]; then
  cat >&2 <<EOF
Bloqueado: este projeto roda dentro do Sail.

  Tentativa: $cmd

  Use vendor/bin/sail. Exemplos:
    vendor/bin/sail artisan ...
    vendor/bin/sail composer ...
    vendor/bin/sail bin pint --dirty
    vendor/bin/sail bun run dev
    vendor/bin/sail artisan test
EOF
  exit 2
fi

exit 0
