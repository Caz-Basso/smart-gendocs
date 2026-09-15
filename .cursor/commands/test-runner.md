---
name: /test-runner
id: test-runner
category: Quality
description: Roda Pest via Sail e devolve resumo compacto (VERDE/VERMELHO). Nunca edita código.
---

Adaptado de [worthly-api/test-runner](https://github.com/beerandcodeteam/worthly-api/blob/main/.claude/commands/test-runner.md).

**Somente execução e reporte** — não edite arquivos, não corrija falhas, não faça commit.

## Invocação

| Comando | Escopo |
| --- | --- |
| `/test-runner` | Suite completa |
| `/test-runner BunAudit` | `--filter=BunAudit` |
| `/test-runner tests/Unit/BunAuditCheckTest.php` | Arquivo específico |

Use o texto após o comando como filtro ou caminho de teste. Sem argumento = suite completa.

## Processo

Delegue ao subagent **`test-runner`** (Task tool, `readonly: true`) passando o escopo acima.

Se a Task tool não estiver disponível, execute você mesmo seguindo `.cursor/agents/test-runner.md`:

1. Verifique Sail: `vendor/bin/sail ps 2>/dev/null | grep -q Up`
2. Rode **somente** via Sail:

   ```bash
   vendor/bin/sail artisan test --compact
   vendor/bin/sail artisan test --compact --filter=<filtro>
   vendor/bin/sail artisan test --compact tests/Unit/ExampleTest.php
   ```

3. Priorize escopo mínimo quando o usuário passou filtro ou arquivo.

## Formato da resposta (obrigatório)

### VERDE

Uma linha:

```
VERDE: <N> testes, <M> assertions, <T>s
```

### VERMELHO

No máximo 20 linhas, falhas agrupadas por arquivo:

```
VERMELHO: <total> falhas
tests/Feature/CheckpointScanCommandTest.php (2 falhas):
  - it runs checkpoint scan:42 — Expected 0, got 1
  - it writes report file:67 — FileNotFoundException
```

### ERRO

```
ERRO: Sail não está rodando. Suba com 'vendor/bin/sail up -d'.
```

ou `ERRO: <causa em uma linha>` para falha de infra (DB, Docker, timeout).

## Restrições

- Apenas `vendor/bin/sail artisan test ...` — nunca `php`, `pest`, `phpunit` ou `artisan` no host.
- Não rode `composer test` (type-coverage, PHPStan, etc.) — isso é pipeline CI, não este comando.
- Nunca devolva output bruto do Pest — sempre resuma.
- Nunca sugira patches nem altere código.
