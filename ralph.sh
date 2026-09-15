#!/usr/bin/env bash
#
# ralph.sh — orquestrador de fases para o Cursor Agent
#
# Lê docs/project-phases.md (fases ## Phase N), executa cada uma via
# `agent -p` (Cursor CLI) e valida com Sail quando configurado.
#
# Uso:
#   chmod +x ralph.sh
#   ./ralph.sh [opções] [caminho-do-arquivo]
#
# Exemplos:
#   ./ralph.sh
#   ./ralph.sh --engine cursor docs/project-phases.md
#   RALPH_VALIDATE=full ./ralph.sh
#   RALPH_VALIDATE=none ./ralph.sh
#   ./ralph.sh --quiet              # só status do Ralph; agent só no .log
#   ./ralph.sh --verbose            # repete saída do agent no terminal (padrão)
#   ./ralph.sh --status             # lista fases e progresso sem executar
#
# Pré-requisitos:
#   - Cursor Agent CLI (`agent`) instalado e autenticado (`agent login`)
#   - Docker + Sail (`vendor/bin/sail up -d`)
#   - jq no host (hooks e logs)
#   - Repositório git na raiz do projeto Laravel

set -euo pipefail

ENGINE="cursor"
INPUT_FILE=""
RALPH_VALIDATE="${RALPH_VALIDATE:-quick}"
RALPH_VERBOSE="${RALPH_VERBOSE:-0}"
RALPH_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --engine)
      ENGINE="$2"
      shift 2
      ;;
    --engine=*)
      ENGINE="${1#*=}"
      shift
      ;;
    --validate)
      RALPH_VALIDATE="$2"
      shift 2
      ;;
    --validate=*)
      RALPH_VALIDATE="${1#*=}"
      shift
      ;;
    --quiet|-q)
      RALPH_VERBOSE=0
      shift
      ;;
    --verbose|-v)
      RALPH_VERBOSE=1
      shift
      ;;
    --yes|-y)
      RALPH_YES=true
      shift
      ;;
    --status)
      SHOW_STATUS_ONLY=true
      shift
      ;;
    *)
      INPUT_FILE="$1"
      shift
      ;;
  esac
done

SHOW_STATUS_ONLY="${SHOW_STATUS_ONLY:-false}"

INPUT_FILE="${INPUT_FILE:-docs/project-phases.md}"

if [[ "$ENGINE" != "cursor" && "$ENGINE" != "claude" && "$ENGINE" != "codex" ]]; then
  echo "Engine inválida: $ENGINE. Use 'cursor', 'claude' ou 'codex'."
  exit 1
fi

if [[ "$RALPH_VALIDATE" != "none" && "$RALPH_VALIDATE" != "quick" && "$RALPH_VALIDATE" != "full" ]]; then
  echo "RALPH_VALIDATE inválido: $RALPH_VALIDATE. Use none, quick ou full."
  exit 1
fi

PHASES_DIR=".phases"
LOG_DIR=".phases/logs"
PROMPT_DIR=".phases/prompts"
MANIFEST="$PHASES_DIR/manifest.txt"
PROGRESS_FILE="$PHASES_DIR/.progress"
MAX_RETRIES=2

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"; }
fail()    { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"; }
step()    { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC}   → $1"; }

print_banner() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e " ${BLUE}Ralph${NC} — orquestrador de fases (Cursor Agent)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "  Plano:      ${INPUT_FILE}"
  echo -e "  Engine:     ${ENGINE}"
  echo -e "  Validação:  ${RALPH_VALIDATE}"
  echo -e "  Console:    $([ "$RALPH_VERBOSE" = "1" ] && echo "verbose (saída do agent no terminal)" || echo "quiet (spinner + logs em .phases/logs/)")"
  echo -e "  Logs:       ${LOG_DIR}/"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

print_progress_bar() {
  local current=$1
  local total=$2
  local width=30
  local filled=$((current * width / total))
  local empty=$((width - filled))
  local bar
  bar=$(printf '%*s' "$filled" '' | tr ' ' '█')
  local spaces
  spaces=$(printf '%*s' "$empty" '')
  echo -e "  ${BLUE}[${bar}${spaces}]${NC} ${current}/${total}"
}

spinner_wait() {
  local pid=$1
  local message=$2
  local frames=('|' '/' '-' '\\')
  local i=0

  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${BLUE}[$(date '+%H:%M:%S')]${NC} %s %s " "${frames[$i]}" "$message"
    i=$(((i + 1) % 4))
    sleep 0.2
  done
  printf "\r\033[K"
}

confirm() {
  local prompt=$1
  if $RALPH_YES; then
    return 0
  fi
  read -p "$prompt" -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Nn]$ ]]
}

show_status() {
  if [ ! -f "$INPUT_FILE" ] && [ ! -f "$MANIFEST" ]; then
    fail "Arquivo não encontrado: $INPUT_FILE"
    exit 1
  fi

  local -a phase_files=()
  local -a phase_titles=()

  if [ -f "$MANIFEST" ]; then
    while IFS="|" read -r file title; do
      phase_files+=("$file")
      phase_titles+=("$title")
    done < "$MANIFEST"
  else
    while IFS= read -r line || [ -n "$line" ]; do
      if [[ "$line" =~ ^##[[:space:]]+(Phase[[:space:]]+[0-9]+[^#]*) ]]; then
        local raw_title="${BASH_REMATCH[1]}"
        raw_title="$(echo "$raw_title" | sed 's/[[:space:]]*$//')"
        phase_titles+=("$raw_title")
        phase_files+=("")
      fi
    done < "$INPUT_FILE"
  fi

  local total=${#phase_titles[@]}
  if [ "$total" -eq 0 ]; then
    fail "Nenhuma fase ## Phase N encontrada em $INPUT_FILE"
    exit 1
  fi

  local done_count=0

  echo ""
  log "Status do plano ($INPUT_FILE)"
  echo ""

  local num=0
  for title in "${phase_titles[@]}"; do
    num=$((num + 1))
    local file="${phase_files[$((num - 1))]:-}"
    if [ -n "$file" ] && is_phase_done "$file"; then
      done_count=$((done_count + 1))
      echo -e "  ${GREEN}✓${NC} [$num/$total] $title"
    else
      echo -e "  ${YELLOW}○${NC} [$num/$total] $title"
    fi
  done

  echo ""
  print_progress_bar "$done_count" "$total"
  echo ""

  if [ -d "$LOG_DIR" ]; then
    log "Logs recentes:"
    ls -1t "$LOG_DIR"/*.log 2>/dev/null | head -5 | while read -r f; do
      echo "    $f"
    done || true
  fi
  echo ""
}

format_duration() {
  local total_seconds=$1
  local hours=$((total_seconds / 3600))
  local minutes=$(((total_seconds % 3600) / 60))
  local seconds=$((total_seconds % 60))

  if [ $hours -gt 0 ]; then
    printf "%dh %dm %ds" $hours $minutes $seconds
  elif [ $minutes -gt 0 ]; then
    printf "%dm %ds" $minutes $seconds
  else
    printf "%ds" $seconds
  fi
}

preflight_checks() {
  if [[ "$ENGINE" == "cursor" ]]; then
    if ! command -v agent &> /dev/null; then
      fail "Cursor Agent CLI não encontrado. Instale/atualize: https://cursor.com/docs/agent/cli"
      exit 1
    fi
  elif [[ "$ENGINE" == "codex" ]]; then
    if ! command -v codex &> /dev/null; then
      fail "codex CLI não encontrado. Instale com: npm install -g @openai/codex"
      exit 1
    fi
  elif [[ "$ENGINE" == "claude" ]]; then
    if ! command -v claude &> /dev/null; then
      fail "Claude Code CLI não encontrado. Instale com: npm install -g @anthropic-ai/claude-code"
      exit 1
    fi
  fi

  if [ ! -f "$INPUT_FILE" ]; then
    fail "Arquivo não encontrado: $INPUT_FILE"
    echo "  Copie o exemplo: cp docs/project-phases.example.md docs/project-phases.md"
    exit 1
  fi

  if [ ! -f "artisan" ]; then
    warn "Não parece ser a raiz de um projeto Laravel (artisan não encontrado)"
    read -p "Continuar mesmo assim? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
  fi

  if ! git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    fail "Requer um repositório git."
    exit 1
  fi

  if [[ "$RALPH_VALIDATE" != "none" ]] && ! vendor/bin/sail ps 2>/dev/null | grep -q "Up"; then
    warn "Sail não está Up — validação ${RALPH_VALIDATE} será pulada por fase"
  fi

  success "Pre-checks OK (engine: $ENGINE, validate: $RALPH_VALIDATE)"
}

split_phases() {
  log "Quebrando $INPUT_FILE em fases..."

  rm -rf "$PHASES_DIR"
  mkdir -p "$PHASES_DIR" "$LOG_DIR" "$PROMPT_DIR"
  > "$MANIFEST"

  local current_file=""
  local phase_count=0

  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^##[[:space:]]+(Phase[[:space:]]+[0-9]+[^#]*) ]]; then
      phase_count=$((phase_count + 1))

      local raw_title="${BASH_REMATCH[1]}"
      raw_title="$(echo "$raw_title" | sed 's/[[:space:]]*$//')"

      local slug
      slug=$(echo "$raw_title" \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's/phase[[:space:]]*/phase-/' \
        | sed 's/[^a-z0-9-]/-/g' \
        | sed 's/--*/-/g' \
        | sed 's/-$//' \
        | sed 's/^-//')
      slug=$(echo "$slug" | sed -E 's/phase-([0-9])$/phase-0\1/' | sed -E 's/phase-([0-9])-/phase-0\1-/')

      current_file="$PHASES_DIR/${slug}.md"
      echo "$line" > "$current_file"
      echo "${slug}.md|${raw_title}" >> "$MANIFEST"
      continue
    fi

    if [ -n "$current_file" ]; then
      echo "$line" >> "$current_file"
    fi
  done < "$INPUT_FILE"

  if [ "$phase_count" -eq 0 ]; then
    fail "Nenhuma fase encontrada. Use cabeçalhos ## Phase 1 — Título em $INPUT_FILE"
    exit 1
  fi

  success "$phase_count fases extraídas"
}

build_prompt_file() {
  local phase_file="$1"
  local prompt_file="$PROMPT_DIR/${phase_file%.md}.txt"

  cat > "$prompt_file" <<PROMPT
Você é um desenvolvedor Laravel sênior trabalhando neste repositório.

## Stack do projeto
- Laravel 13, PHP 8.5
- Inertia v3 + React 19, Tailwind CSS v4, Vite (Bun)
- Pest PHP 5 (Feature, Unit, Browser com Playwright)
- Laravel Sail (Docker): PostgreSQL, Redis, Mailpit
- Laravel PAO: saída JSON compacta quando o Agent está ativo

## Arquivos de referência (leia antes de codar)
- AGENTS.md e CLAUDE.md — convenções obrigatórias do projeto
- README.md — Sail, hooks Cursor, PAO e comandos de teste
- docs/project-phases.md — plano completo (se existir)

## Sua tarefa agora
Implemente COMPLETAMENTE a fase descrita abaixo.

Para cada item:
1. Implemente o código completo (sem TODOs ou placeholders)
2. Crie ou atualize os testes listados
3. Execute testes via Sail e corrija falhas antes de seguir
4. Só passe ao próximo item quando os testes relacionados passarem

## Regras obrigatórias
- LEIA AGENTS.md e CLAUDE.md antes de começar
- Todos os comandos PHP, Composer, Artisan e Bun do projeto: **./vendor/bin/sail** (nunca php/composer/bun no host)
- Hooks em .cursor/hooks.json bloqueiam tooling PHP fora do Sail
- Use Actions, Form Requests e convenções existentes nos arquivos irmãos
- Após mudar rotas/controllers: gere Wayfinder se o projeto usar (\`vendor/bin/sail artisan wayfinder:generate\` quando aplicável)
- Frontend: páginas em resources/js/pages; use Wayfinder para URLs tipadas
- Ao concluir a fase, rode no mínimo: \`vendor/bin/sail artisan test --compact\` nos testes que você criou ou alterou

## Fase a implementar
$(cat "$PHASES_DIR/$phase_file")
PROMPT

  echo "$prompt_file"
}

build_retry_prompt_file() {
  local phase_file="$1"
  local test_output="$2"
  local prompt_file="$PROMPT_DIR/${phase_file%.md}-retry.txt"

  cat > "$prompt_file" <<PROMPT
Os testes ou a validação falharam após a implementação anterior. Corrija os erros.

Saída relevante:
\`\`\`
$test_output
\`\`\`

Corrija o código para que os testes passem. Use apenas ./vendor/bin/sail para comandos do projeto.
PROMPT

  echo "$prompt_file"
}

export_ralph_context() {
  export RALPH_ENGINE="$ENGINE"
  export RALPH_PHASE_TITLE="${RALPH_PHASE_TITLE:-}"
  export RALPH_PHASE_NUM="${RALPH_PHASE_NUM:-}"
  export RALPH_PHASE_TOTAL="${RALPH_PHASE_TOTAL:-}"
  export RALPH_PHASE_ATTEMPT="${RALPH_PHASE_ATTEMPT:-1}"
  export RALPH_PHASE_MAX_ATTEMPTS="$((MAX_RETRIES + 1))"
}

run_engine() {
  local prompt_file="$1"
  local log_file="$2"
  local engine_pid
  local engine_status=0

  export_ralph_context

  step "Agent ($ENGINE) — tentativa ${RALPH_PHASE_ATTEMPT}/${RALPH_PHASE_MAX_ATTEMPTS}"
  step "Log: $log_file"

  if [[ "$RALPH_VERBOSE" == "1" ]]; then
    echo "  ─────────────────────────────────────────────────"
  fi

  if [[ "$ENGINE" == "cursor" ]]; then
    if [[ "$RALPH_VERBOSE" == "1" ]]; then
      agent -p --force --trust --workspace "$(pwd)" "$(cat "$prompt_file")" 2>&1 | tee "$log_file"
      engine_status=${PIPESTATUS[0]}
    else
      agent -p --force --trust --workspace "$(pwd)" "$(cat "$prompt_file")" > "$log_file" 2>&1 &
      engine_pid=$!
      spinner_wait "$engine_pid" "Fase ${RALPH_PHASE_NUM}/${RALPH_PHASE_TOTAL}: ${RALPH_PHASE_TITLE}…"
      wait "$engine_pid" || engine_status=$?
    fi
  elif [[ "$ENGINE" == "codex" ]]; then
    if [[ "$RALPH_VERBOSE" == "1" ]]; then
      cat "$prompt_file" | codex exec --sandbox danger-full-access - 2>&1 | tee "$log_file"
      engine_status=${PIPESTATUS[0]}
    else
      cat "$prompt_file" | codex exec --sandbox danger-full-access - > "$log_file" 2>&1 &
      engine_pid=$!
      spinner_wait "$engine_pid" "Fase ${RALPH_PHASE_NUM}/${RALPH_PHASE_TOTAL}: ${RALPH_PHASE_TITLE}…"
      wait "$engine_pid" || engine_status=$?
    fi
  elif [[ "$ENGINE" == "claude" ]]; then
    if [[ "$RALPH_VERBOSE" == "1" ]]; then
      env -u CLAUDECODE claude --dangerously-skip-permissions -p "$(cat "$prompt_file")" --output-format text --verbose 2>&1 | tee "$log_file"
      engine_status=${PIPESTATUS[0]}
    else
      env -u CLAUDECODE claude --dangerously-skip-permissions -p "$(cat "$prompt_file")" --output-format text --verbose > "$log_file" 2>&1 &
      engine_pid=$!
      spinner_wait "$engine_pid" "Fase ${RALPH_PHASE_NUM}/${RALPH_PHASE_TOTAL}: ${RALPH_PHASE_TITLE}…"
      wait "$engine_pid" || engine_status=$?
    fi
  fi

  if [[ "$RALPH_VERBOSE" == "1" ]]; then
    echo "  ─────────────────────────────────────────────────"
  fi

  if [ "$engine_status" -ne 0 ]; then
    warn "Agent encerrou com código $engine_status (últimas linhas do log):"
    tail -8 "$log_file" 2>/dev/null | sed 's/^/    /' || true
    return "$engine_status"
  fi

  success "Agent concluiu o turno"
  return 0
}

validate_phase() {
  local log_file="$1"

  if [[ "$RALPH_VALIDATE" == "none" ]]; then
    return 0
  fi

  if ! vendor/bin/sail ps 2>/dev/null | grep -q "Up"; then
    warn "Sail offline — validação ${RALPH_VALIDATE} ignorada"
    return 0
  fi

  step "Validação pós-fase (${RALPH_VALIDATE})"

  local validate_status=0

  case "$RALPH_VALIDATE" in
    full)
      if [[ "$RALPH_VERBOSE" == "1" ]]; then
        vendor/bin/sail composer test 2>&1 | tee -a "$log_file"
        validate_status=${PIPESTATUS[0]}
      else
        vendor/bin/sail composer test >> "$log_file" 2>&1
        validate_status=$?
        if [ "$validate_status" -eq 0 ]; then
          success "composer test — OK"
        else
          fail "composer test — falhou (veja $log_file)"
        fi
      fi
      ;;
    quick)
      if [[ "$RALPH_VERBOSE" == "1" ]]; then
        vendor/bin/sail artisan test --compact 2>&1 | tee -a "$log_file"
        validate_status=${PIPESTATUS[0]}
      else
        vendor/bin/sail artisan test --compact >> "$log_file" 2>&1
        validate_status=$?
        if [ "$validate_status" -eq 0 ]; then
          success "artisan test --compact — OK"
        else
          fail "artisan test — falhou (veja $log_file)"
        fi
      fi
      ;;
  esac

  return "$validate_status"
}

run_phase() {
  local phase_file="$1"
  local phase_title="$2"
  local phase_num="$3"
  local total_phases="$4"
  local log_file="$LOG_DIR/${phase_file%.md}.log"
  local phase_start
  phase_start=$(date +%s)

  export RALPH_PHASE_TITLE="$phase_title"
  export RALPH_PHASE_NUM="$phase_num"
  export RALPH_PHASE_TOTAL="$total_phases"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Fase $phase_num/$total_phases — $phase_title"
  print_progress_bar "$((phase_num - 1))" "$total_phases"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local attempt=0
  local phase_success=false

  while [ $attempt -le $MAX_RETRIES ]; do
    attempt=$((attempt + 1))
    export RALPH_PHASE_ATTEMPT="$attempt"

    if [ $attempt -gt 1 ]; then
      warn "Tentativa $attempt/$((MAX_RETRIES + 1))..."
    fi

    local prompt_file
    if [ $attempt -eq 1 ]; then
      step "Gerando prompt"
      prompt_file=$(build_prompt_file "$phase_file")
    else
      local test_output
      test_output=$(tail -50 "$log_file" 2>/dev/null || echo "Sem output disponível")
      prompt_file=$(build_retry_prompt_file "$phase_file" "$test_output")
    fi

    if run_engine "$prompt_file" "$log_file"; then
      if validate_phase "$log_file"; then
        phase_success=true
        break
      else
        fail "Validação ${RALPH_VALIDATE} falhou"
      fi
    else
      fail "$ENGINE retornou erro"
    fi
  done

  local phase_end
  phase_end=$(date +%s)
  local phase_duration=$((phase_end - phase_start))

  if $phase_success; then
    success "$phase_title — COMPLETA ($(format_duration $phase_duration))"

    if git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
      git add -A
      git commit -m "feat: $phase_title" --allow-empty
      log "Commit criado no git"
    fi

    echo "$phase_file" >> "$PROGRESS_FILE"
    return 0
  else
    fail "$phase_title — FALHOU após $((MAX_RETRIES + 1)) tentativas ($(format_duration $phase_duration))"
    fail "Log disponível em: $log_file"
    return 1
  fi
}

is_phase_done() {
  local phase_file="$1"
  [ -f "$PROGRESS_FILE" ] && grep -qF "$phase_file" "$PROGRESS_FILE"
}

main() {
  if $SHOW_STATUS_ONLY; then
    show_status
    exit 0
  fi

  preflight_checks
  split_phases
  print_banner

  local total_phases
  total_phases=$(wc -l < "$MANIFEST")

  log "$total_phases fases para implementar"
  echo ""

  local num=0
  while IFS="|" read -r file title; do
    num=$((num + 1))
    if is_phase_done "$file"; then
      echo -e "  ${GREEN}✓${NC} [$num/$total_phases] $title (já completada)"
    else
      echo -e "  ${YELLOW}○${NC} [$num/$total_phases] $title"
    fi
  done < "$MANIFEST"

  echo ""
  confirm "Iniciar implementação? (Y/n) " || exit 0

  local start_time
  start_time=$(date +%s)
  log "Início: $(date '+%d/%m/%Y %H:%M:%S')"

  local current=0
  local failed_phases=()
  local skipped_phases=()
  local completed_phases=()

  while IFS="|" read -r file title; do
    current=$((current + 1))

    if is_phase_done "$file"; then
      log "Pulando $title (já completada)"
      skipped_phases+=("$title")
      continue
    fi

    if run_phase "$file" "$title" "$current" "$total_phases"; then
      completed_phases+=("$title")
    else
      failed_phases+=("$title")
      echo ""
      warn "Fase falhou: $title"
      confirm "Continuar para a próxima fase? (Y/n) " || break
    fi
  done < "$MANIFEST"

  local end_time
  end_time=$(date +%s)
  local total_duration=$((end_time - start_time))

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "RELATÓRIO FINAL (engine: $ENGINE)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ ${#completed_phases[@]} -gt 0 ]; then
    echo ""
    success "Completadas (${#completed_phases[@]}):"
    for phase in "${completed_phases[@]}"; do
      echo -e "    ${GREEN}$phase${NC}"
    done
  fi

  if [ ${#skipped_phases[@]} -gt 0 ]; then
    echo ""
    log "Puladas (${#skipped_phases[@]}):"
    for phase in "${skipped_phases[@]}"; do
      echo -e "    $phase"
    done
  fi

  if [ ${#failed_phases[@]} -gt 0 ]; then
    echo ""
    fail "Falharam (${#failed_phases[@]}):"
    for phase in "${failed_phases[@]}"; do
      echo -e "    ${RED}$phase${NC}"
    done
    echo ""
    fail "Verifique os logs em $LOG_DIR/"
  fi

  echo ""
  log "Início: $(date -d @$start_time '+%d/%m/%Y %H:%M:%S' 2>/dev/null || date -r "$start_time" '+%d/%m/%Y %H:%M:%S' 2>/dev/null || echo "?")"
  log "Fim:    $(date -d @$end_time '+%d/%m/%Y %H:%M:%S' 2>/dev/null || date -r "$end_time" '+%d/%m/%Y %H:%M:%S' 2>/dev/null || echo "?")"
  log "Duração total: $(format_duration $total_duration)"
  echo ""
}

main
