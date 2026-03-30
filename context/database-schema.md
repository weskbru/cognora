# Esquema do Banco de Dados

O banco de dados usa o sistema de entidades do Base44. Os schemas ficam em `database/entities/*.db`.

---

## Subject (Materia)

Agrupa documentos por tema de estudo.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | ID unico gerado pelo Base44 |
| name | string | Nome da materia |
| description | string | Descricao opcional |
| created_date | datetime | Data de criacao |

Relacionamentos:
- Um Subject tem muitos Documents
- Um Subject tem muitas Questions

---

## Document (Documento)

PDF enviado pelo usuario para processamento por IA.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | ID unico |
| name | string | Nome do arquivo |
| status | enum | pending / processing / completed / error |
| subject_id | string | FK para Subject |
| created_date | datetime | Data de envio |

Status:
- `pending` — na fila de processamento
- `processing` — sendo processado pela IA
- `completed` — questoes e resumo gerados
- `error` — falha no processamento

Relacionamentos:
- Pertence a um Subject
- Tem muitas Summaries

---

## Question (Questao)

Questao gerada pela IA a partir de um documento.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | ID unico |
| text | string | Enunciado da questao |
| type | enum | multiple_choice / true_false / essay |
| difficulty | enum | easy / medium / hard |
| subject_id | string | FK para Subject |
| created_date | datetime | Data de geracao |

Tipos:
- `multiple_choice` — alternativas A, B, C, D
- `true_false` — verdadeiro ou falso
- `essay` — dissertativa

Dificuldades:
- `easy` — facil
- `medium` — medio
- `hard` — dificil

Relacionamentos:
- Pertence a um Subject
- Usada em Competitions

---

## Summary (Resumo)

Resumo em texto gerado pela IA a partir de um documento.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | ID unico |
| content | string | Conteudo do resumo (pode ser Markdown) |
| document_id | string | FK para Document |
| created_date | datetime | Data de geracao |

Relacionamentos:
- Pertence a um Document

---

## Competition (Competicao)

Instancia de uma competicao entre usuarios.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | ID unico |
| title | string | Titulo da competicao |
| mode | enum | duel / time_attack / weekly_league |
| status | enum | waiting / active / finished |
| host_email | string | Email do criador |
| participants | array | Lista de emails dos participantes |
| question_count | number | Numero de questoes (5 ou 10) |
| time_limit_seconds | number | Limite de tempo em segundos |
| invite_code | string | Codigo para outros entrarem |
| created_date | datetime | Data de criacao |

Modos:
- `duel` — duelo 1v1
- `time_attack` — contra o relogio
- `weekly_league` — liga semanal

Status:
- `waiting` — aguardando participantes
- `active` — em andamento
- `finished` — encerrada

---

## UserProgress (Progresso do Usuario)

Registro de XP, nivel, streak e estatisticas do usuario.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | ID unico |
| user_email | string | Email do usuario (unico) |
| xp | number | XP total acumulado |
| level | number | Nivel atual (1-10) |
| streak_days | number | Dias consecutivos de login |
| last_active_date | date | Ultimo dia de acesso |
| total_questions_answered | number | Total de questoes respondidas |
| total_correct_answers | number | Total de acertos |
| total_summaries_generated | number | Total de resumos gerados |
| total_documents_uploaded | number | Total de documentos enviados |
| xp_history | array | Historico de ganhos de XP |

Campo `xp_history` (array de objetos):
```json
[
  {
    "date": "2024-01-15",
    "amount": 10,
    "reason": "correct_answer"
  }
]
```

Relacionamentos:
- Um registro por usuario (identificado por email)

---

## Como acessar as entidades no codigo

```jsx
import { Subject, Document, Question, Summary, Competition, UserProgress } from '@/api'

// Listar todos
const subjects = await Subject.list()

// Filtrar
const hardQuestions = await Question.filter({ difficulty: 'hard' })

// Criar
const newSubject = await Subject.create({ name: 'Matematica', description: '...' })

// Atualizar
await Document.update(id, { status: 'completed' })

// Deletar
await Subject.delete(id)
```
