# Historico de precificacao e limites

Data do registro: 2026-06-03

Este documento registra as premissas usadas para discutir os planos do Cognora. Ele existe para manter historico de produto e evitar que decisoes de preco e limites fiquem apenas em conversa.

## Contexto

O Cognora usa uma estrategia de entrada por plano gratuito, conversao para Pro e upgrade para Premium.

Objetivo comercial:

- Free apresenta valor real, mas com limite claro.
- Pro deve ser barato o suficiente para converter usuarios, mas limitado para nao virar prejuizo.
- Premium deve ser o plano natural para usuario intensivo.

## Custos considerados

Valores usados como referencia nesta data:

- Frontend na Vercel Pro: cerca de US$20/mes.
- Backend no Render Starter: cerca de US$7/mes.
- Banco Neon: pode iniciar no Free, mas um cenario pago inicial pode ficar perto de US$15/mes.
- IA: custo variavel por uso, dependente do provedor/modelo e da quantidade de tokens de entrada/saida.
- Cambio usado na conta rapida: US$1 ~= R$5,10.

Fontes de referencia:

- https://vercel.com/pricing
- https://render.com/pricing
- https://neon.com/pricing
- https://ai.google.dev/gemini-api/docs/pricing

## Conta rapida de break-even

Cenario barato, sem Neon pago:

```text
Vercel US$20 + Render US$7 = US$27
US$27 * R$5,10 = R$137,70
R$137,70 / R$9,90 = 13,9 usuarios Pro
```

Resultado: aproximadamente 14 usuarios Pro apenas para cobrir essa base, sem contar IA.

Cenario mais realista, com Neon pago:

```text
Vercel US$20 + Render US$7 + Neon US$15 = US$42
US$42 * R$5,10 = R$214,20
R$214,20 / R$9,90 = 21,6 usuarios Pro
```

Resultado: aproximadamente 22 usuarios Pro apenas para cobrir infraestrutura, sem contar IA.

## Impacto do custo de IA no Pro

Preco Pro discutido: R$9,90/mes.

| Custo medio de IA por usuario/mes | Margem bruta aproximada | Usuarios Pro para cobrir R$214 |
|-----------------------------------|--------------------------|--------------------------------|
| R$2,00 | R$7,90 | 28 |
| R$4,00 | R$5,90 | 37 |
| R$6,00 | R$3,90 | 55 |
| R$8,00 | R$1,90 | 113 |

Conclusao: com Pro a R$9,90, o plano precisa ter limites fortes. Usuarios intensivos devem ser direcionados para Premium.

## Principio de limite

O Cognora deve seguir a logica de SaaS modernos como Notion, Obsidian Sync, Dropbox e similares:

- Armazenamento e barato e mais previsivel.
- Processamento de IA e caro e pode explodir a margem.
- Portanto, PDFs devem ter limite de quantidade, tamanho e paginas.
- IA deve ter limite mensal de acoes.
- Nunca vender "ilimitado" de forma literal, porque cria risco infinito.

## Planos decididos

Tabela final implementada:

| Recurso | Free | Pro | Premium |
|---------|------|-----|---------|
| Materias | 3 | 10 | 30 |
| PDFs por materia | 1 | 2 | 5 |
| PDFs ativos | 3 | 20 | 100 |
| Upload por PDF | 5 MB | 25 MB | 50 MB |
| Resumos/mes | 5 | 30 | 100 |
| Geracoes de questoes/mes | 5 | 30 | 100 |
| Geracoes de flashcards/mes | 5 | 30 | 100 |
| Competicoes ativas | 1 | 5 | 20 |

## Free

Limites do Free:

- Ate 3 materias.
- Ate 1 PDF por materia.
- Ate 3 PDFs ativos no total.
- Upload maximo de 5 MB por PDF.
- Ate 5 resumos por mes.
- Ate 5 geracoes de questoes por mes.
- Ate 5 geracoes de flashcards por mes.
- Ate 1 competicao ativa.
- Cada PDF pode gerar 1 resumo.
- Cada PDF pode gerar questoes 1 vez.
- Cada PDF pode gerar flashcards 1 vez.

Racional:

- O usuario consegue testar o fluxo completo.
- O sistema mostra valor sem liberar volume alto de IA.
- A regra "1 geracao por tipo de conteudo por arquivo" e facil de entender.
- O Free cria pressao natural para upgrade sem parecer inutil.

## Pro

Preco inicial: R$9,90/mes.

Limites do Pro:

- Ate 10 materias.
- Ate 2 PDFs por materia.
- Ate 20 PDFs ativos.
- Upload maximo de 25 MB por PDF.
- Ate 30 resumos por mes.
- Ate 30 geracoes de questoes por mes.
- Ate 30 geracoes de flashcards por mes.
- Ate 5 competicoes ativas.
- Sem limite por PDF para resumos, questoes e flashcards; controla apenas limite mensal.

Racional:

- O Pro precisa parecer muito melhor que o Free, mas ainda controlar custo de IA.
- 20 PDFs ativos da liberdade de organizacao sem liberar processamento infinito.
- 30 usos mensais por tipo cria um teto claro de custo.
- Sem limite por PDF evita frustrar usuario pagante que precisa reprocessar material.
- Usuario intensivo deve perceber valor em subir para Premium.

## Premium

Premium substitui a ideia antiga de "Ilimitado". O alias legado `unlimited` pode existir internamente em registros antigos, mas deve ser normalizado como Premium e nao exposto no frontend ou APIs publicas.

Limites iniciais:

- Ate 30 materias.
- Ate 5 PDFs por materia.
- Ate 100 PDFs ativos.
- Upload maximo de 50 MB por PDF.
- Ate 100 resumos por mes.
- Ate 100 geracoes de questoes por mes.
- Ate 100 geracoes de flashcards por mes.
- Ate 20 competicoes ativas.
- Sem limite por PDF para resumos, questoes e flashcards; controla apenas limite mensal.

Racional:

- "Ilimitado" cria risco financeiro e expectativa dificil de sustentar.
- Premium deve ser alto o suficiente para uso pesado, mas ainda mensuravel e bloqueavel.
- Os limites podem ser aumentados depois com dados reais de custo e uso.

## Contabilizacao de IA

Cada chamada funcional de IA consome 1 uso mensal do tipo correspondente:

| Acao | Contador |
|------|----------|
| Gerar resumo | `summaries_used_month` |
| Gerar questoes | `questions_used_month` |
| Gerar flashcards | `flashcards_used_month` |

Racional:

- Simples de explicar para usuario.
- Simples de implementar.
- Evita que um tipo de recurso consuma todo o limite de outro.
- No Free, tambem existe bloqueio de 1 geracao por tipo em cada PDF para evitar abuso/reprocessamento.
- No Pro e Premium, nao ha bloqueio por PDF; o usuario pagante fica limitado apenas pelo uso mensal.

## Uso que deve ser monitorado

Criar ou manter uma estrutura mensal de uso por usuario, por exemplo `user_usage`.

Campos recomendados:

- `user_id`
- `month_reference`
- `pdf_count`
- `pdf_storage_mb`
- `summaries_used_month`
- `questions_used_month`
- `flashcards_used_month`
- `competitions_created`

Objetivo:

- Medir uso real por plano.
- Descobrir se 200 acoes IA/mes no Pro e muito ou pouco.
- Calcular margem real por usuario.
- Ajustar limites depois de 2 ou 3 meses com dados concretos.

## Regras de revisao

Revisar este documento quando acontecer qualquer um destes eventos:

- Mudanca de preco do Pro ou Premium.
- Mudanca de provedor/modelo de IA.
- Aumento relevante no custo medio por geracao.
- Entrada de muitos usuarios ativos no Free.
- Reclamos recorrentes sobre limites.
- Mudanca de infraestrutura em Vercel, Render, Neon ou storage.
- Dados reais indicarem que algum limite esta alto ou baixo demais.
