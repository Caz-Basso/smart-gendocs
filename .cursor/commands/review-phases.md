---
name: /review-phases
id: review-phases
category: Quality
description: Revisa o diff de uma fase contra AGENTS.md e delega security-auditor.
---

Adaptado de [worthly-api/review-phases](https://github.com/beerandcodeteam/worthly-api/blob/main/.claude/commands/review-phases.md).

**Modo somente leitura** — não edite arquivos, não corrija, não faça commit. Apenas reporte.

O usuário invoca `/review-phases <n>` (ex.: `/review-phases 2`). Use `<n>` como número da fase abaixo.

## 1. Contexto da fase

Leia a seção correspondente em `docs/project-phases.md` (ou `docs/project-phases.example.md` se o primeiro não existir). Busque o heading `## Phase <n>` ou `### Phase <n>.` para entender escopo esperado.

## 2. Localize o commit da fase

Execute em paralelo quando possível:

```bash
git log --oneline | grep -iE "(fase|phase)[[:space:]-]*<n>([^0-9]|$)" | head -5
git log --oneline | grep -iE "\(phase-<n>\)|phase <n>|Phase <n>" | head -5
```

Se nenhum commit for encontrado, informe e use como fallback o diff da branch atual contra `main` (ou `master`):

```bash
git merge-base main HEAD 2>/dev/null || git merge-base master HEAD
git diff --stat $(git merge-base main HEAD 2>/dev/null || git merge-base master HEAD)..HEAD
git diff --name-only $(git merge-base main HEAD 2>/dev/null || git merge-base master HEAD)..HEAD
```

## 3. Diff da fase

Para o commit mais recente que bater com a fase:

```bash
git show --stat <sha>
git show --name-only --format= <sha>
```

No fallback de branch, use `git diff --stat` e `git diff --name-only` do passo 2.

Liste todos os arquivos alterados — serão a entrada das revisões seguintes.

## 4. Revisão de convenção

Leia na íntegra `AGENTS.md` e `.cursor/rules/laravel-boost.mdc`.

Para **cada arquivo** do diff, verifique convenções do projeto:

- Actions em `app/Actions/` com `handle()`, Sail para PHP, Form Requests para validação
- Pest para testes, Pint/Rector/PHPStan conforme `composer test`
- Inertia pages em `resources/js/pages/`, Wayfinder para rotas no frontend
- `declare(strict_types=1)`, tipos explícitos, sem `env()` fora de `config/`

Formato de violação:

```
[V<N>] <arquivo>:<linha> — Regra: <citação curta> — Encontrado: <descrição>
```

Se não houver violações: `Sem violações de convenção.`

## 5. Revisão de segurança

Delegue ao subagent **`security-auditor`** (Task tool, `subagent_type` adequado, `readonly: true`) passando:

- Lista de arquivos alterados sob `routes/`, `app/Http/`, `app/Actions/`, `app/Models/`, `app/Checkpoint/`
- Contexto: "Revisão da Phase `<n>` — apenas arquivos listados"

Se nenhum arquivo nessas pastas foi alterado, pule a delegação e escreva:
`Nenhuma superfície HTTP/app sensível alterada nesta fase.`

## 6. Relatório final

Combine tudo em um único markdown com exatamente estas seções:

### Phase `<n>` — Resumo

- Commit(s) ou range analisado (`<sha>` ou `<base>..HEAD`)
- Arquivos alterados (contagem + lista curta se ≤ 15, senão agrupe por diretório)
- Escopo esperado (1–2 linhas de `docs/project-phases.md`)

### Convenção

Saída do passo 4.

### Segurança

Saída do subagent `security-auditor` (seções OK / ATENÇÃO).

---

**Restrições:** não use `vendor/bin/sail` exceto se o subagent precisar; este comando usa apenas git + leitura + Task. Não sugira patches nem aplique correções.
