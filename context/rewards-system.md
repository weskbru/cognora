# Sistema de Recompensas (XP e Gamificacao)

## Onde fica o codigo

- Logica principal: `frontend/src/hooks/useRewards.jsx`
- Provider: `frontend/src/context/RewardsContext.jsx`
- Componentes visuais: `frontend/src/components/competitions/rewards/`

---

## XP por acao

| Acao | XP |
|------|-----|
| Resposta correta | +10 XP |
| Resposta errada | +2 XP |
| Resumo gerado | +30 XP |
| Documento enviado | +20 XP |
| Login diario | +15 XP |
| Bonus de streak | +5 XP x numero_de_dias |

---

## Niveis de progressao (10 niveis)

| # | Nome | XP minimo | XP maximo |
|---|------|-----------|-----------|
| 1 | Iniciante | 0 | 100 |
| 2 | Estudante | 100 | 250 |
| 3 | Dedicado | 250 | 500 |
| 4 | Aplicado | 500 | 900 |
| 5 | Avancado | 900 | 1.500 |
| 6 | Expert | 1.500 | 2.500 |
| 7 | Mestre | 2.500 | 4.000 |
| 8 | Genio | 4.000 | 6.000 |
| 9 | Lendario | 6.000 | 10.000 |
| 10 | Supremo | 10.000 | infinito |

---

## Sistema de Streak

Streak = numero de dias consecutivos que o usuario fez login.

Como funciona:
- Primeiro acesso do dia: verifica `last_active_date` no `UserProgress`
- Se acessou ontem: incrementa `streak_days` + 1
- Se nao acessou ontem: reseta `streak_days` para 1
- Bonus de XP = 5 XP x `streak_days` (capped em 7 dias = max 35 XP bonus)
- Exibido visualmente no `StreakBadge` (icone de fogo + numero)

---

## Historico de XP

Campo `xp_history` no `UserProgress` e um array de ganhos:

```json
[
  { "date": "2024-01-15", "amount": 10, "reason": "correct_answer" },
  { "date": "2024-01-15", "amount": 30, "reason": "summary_generated" },
  { "date": "2024-01-14", "amount": 15, "reason": "daily_login" }
]
```

Exibido na pagina de Perfil como lista ou grafico de evolucao.

---

## Como usar o sistema de recompensas

O `useRewards` hook e acessado via context:

```jsx
import { useRewardsContext } from '@/context/RewardsContext'

const { addXP, userProgress, currentLevel } = useRewardsContext()

// Dar XP ao usuario
addXP(10, 'correct_answer')
addXP(30, 'summary_generated')
addXP(20, 'document_uploaded')
```

### Funcoes disponiveis no hook

| Funcao | Parametros | O que faz |
|--------|-----------|-----------|
| `addXP(amount, reason)` | amount: number, reason: string | Adiciona XP, verifica level up, salva historico, mostra popup |
| `checkDailyLogin()` | — | Verifica se e primeiro acesso do dia e da bonus de login |
| `currentLevel` | — (estado) | Objeto do nivel atual { name, minXP, maxXP } |
| `userProgress` | — (estado) | Objeto completo do UserProgress do usuario |
| `showRewardPopup` | — (estado) | Boolean que controla visibilidade do RewardPopup |

---

## Level Up

Quando o usuario atinge o XP necessario para o proximo nivel:
1. `addXP` detecta que o XP total ultrapassou o threshold do nivel seguinte
2. Atualiza `level` no `UserProgress`
3. Exibe popup especial de level up via `RewardPopup`
4. Salva no banco de dados

---

## Componentes visuais

### RewardPopup
Aparece no canto da tela quando XP e ganho.
- Animacao de entrada/saida via Framer Motion
- Exibe +XP e motivo (ex: "Resposta Correta!")
- Some automaticamente apos ~2 segundos
- No level up: exibe mensagem especial

### XPProgressBar
Barra de progresso do nivel atual.
- Calcula porcentagem: `(xp - levelMinXP) / (levelMaxXP - levelMinXP) * 100`
- Exibe nivel atual e proximo
- Animacao suave ao ganhar XP

### StreakBadge
Badge compacto com icone de fogo.
- Numero de dias de streak
- Cor muda conforme streak aumenta (mais dias = cor mais intensa)
- Exibido na Sidebar e no Perfil
