# Bugs Tecnicos

Este documento registra bugs tecnicos que nao devem ser misturados com decisoes de produto ou escopo de sprint.

## BUG-001 - Investigar timeout dos testes pytest com TestClient

Status: aberto

Prioridade: alta

Contexto:

Durante a Sprint 5, testes de integracao com `pytest` e `TestClient` ficaram presos ate bater timeout, mesmo executando um unico teste focado de `StudySession`.

Comandos que travaram:

```bash
PYTHONPYCACHEPREFIX=/tmp/cognora-pycache .venv/bin/python -m pytest tests/integration/test_entities_routes.py -q
timeout 60s .venv/bin/python -m pytest tests/integration/test_entities_routes.py::TestStudySessions::test_concluir_sessao_cria_progresso_da_materia -q
```

Sintoma:

```text
pytest coleta o teste, imprime o arquivo, mas nao conclui nem retorna erro de assert antes do timeout.
```

Hipoteses a investigar:

- Startup/lifespan do app bloqueando durante `TestClient`.
- `dependency_overrides` usando sessao de banco diferente ou fixture pendurada.
- SQLite em memoria com `StaticPool` e lock entre fixtures.
- Evento assincrono ou middleware mantendo a requisicao aberta.
- Commit/flush extra dentro da rota generica de entidades.
- Interacao entre `TestClient`, lifespan e cleanup de observabilidade.

Validacoes que passaram fora do `TestClient`:

- `py_compile` do backend.
- Transicao direta de `SubjectProgress` com banco em memoria.
- `npm run typecheck`.
- `npm run lint`.
- `vite build` em `/tmp`.

Criterio de aceite:

- Rodar teste unico de integracao com `TestClient` sem timeout.
- Rodar `backend/tests/integration/test_entities_routes.py` sem travar.
- Identificar causa raiz.
- Se necessario, ajustar fixture, startup, override de banco ou middleware.
- Manter o bug separado de produto, XP, revisoes e dashboard.

