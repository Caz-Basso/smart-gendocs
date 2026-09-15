#!/usr/bin/env bash
# Adapted from beerandcodeteam/worthly-api pint-and-test for Cursor afterFileEdit + Sail.
set -euo pipefail

input=$(cat)

# Cursor afterFileEdit uses file_path; Claude Code hooks use tool_input.file_path
file=$(echo "$input" | jq -r '.file_path // .tool_input.file_path // empty')
root=$(echo "$input" | jq -r '.workspace_roots[0] // empty')

if [[ -n "$file" && "$file" != /* && -n "$root" ]]; then
  file="$root/$file"
fi

[[ -n "$file" ]] || exit 0
[[ "$file" == *.php ]] || exit 0

case "$file" in
  */vendor/*|*/node_modules/*|*/bootstrap/cache/*|*/storage/framework/*|*/tests/Stubs/*)
    exit 0
    ;;
esac

if [[ -n "$root" && -f "$root/composer.json" ]]; then
  cd "$root"
elif [[ -f composer.json ]]; then
  :
else
  exit 0
fi

if ! vendor/bin/sail ps 2>/dev/null | grep -q "Up"; then
  echo "Sail offline — Pint/testes não executados (vendor/bin/sail up -d)." >&2
  exit 0
fi

container_path="${file#"$PWD"/}"
container_path="${container_path#/}"

vendor/bin/sail bin pint "$container_path" --format agent >&2 || true

if [[ "$container_path" == tests/* && "$container_path" != tests/Pest.php ]]; then
  echo "→ Rodando $container_path" >&2
  if ! vendor/bin/sail artisan test --compact "$container_path" >&2; then
    echo "↑ Teste falhou — corrija antes de prosseguir." >&2
    exit 2
  fi
fi

exit 0
