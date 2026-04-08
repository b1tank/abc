## 🎈 ABC Balloon Game — Challenge Modes

### 🧠 One-Line Definition

> **An educational balloon-popping game that teaches spelling and math (within 10) through a unified challenge→pop→reward loop, designed for 4-5 year olds.**

### Top Principles
- **One mechanic**: popping balloons is the only input — spelling, math, and free play all use it
- **Gentle refactor**: reuse existing top bar, stats pad, and canvas — no new layout areas
- **Gentle failure**: wrong answers shake the balloon, never punish or subtract
- **Data-driven challenges**: word banks and math ranges are pure data, easy to add/swap
- **Reward dopamine**: completing a challenge triggers emoji celebration from favorites
- **Start simple**: no timers, no difficulty ramps — just pop, learn, collect

---

### 1. Existing Layout → Challenge Layout Mapping

The current layout has three stacked areas. Each area gains a new role per mode:

```
┌──────────────────────────────────────────────────┐
│ TOP BAR (existing)                               │
│ [Continue][Restart]  🎈 12  ⚙                   │
│                                                  │
│ Refactor: add mode picker + challenge prompt     │
│ [🎈][🔤][🔢] [Continue][Restart]  Spell: G·_·_·I·N  🎈12 🍫🧁🍬  ⚙ │
├──────────────────────────────────────────────────┤
│ STATS PAD (existing letter grid, always visible) │
│ A B C D E F G H I J K L M N O P Q R S T U V ... │
│                                                  │
│ Refactor: adapts content per mode                │
│ Free Play → letters A-Z (current, unchanged)     │
│ Spelling  → letters A-Z, target letters glow/pulse│
│ Math      → numbers 0-9 (grid becomes 10 cells)  │
├──────────────────────────────────────────────────┤
│ CANVAS (existing, unchanged in all modes)        │
│ Balloons float up, pop on click/tap/keyboard     │
└──────────────────────────────────────────────────┘
```

### 2. Top Bar Refactoring

Current: `[Continue][Restart] | 🎈 score | ⚙`

New layout:

| Slot | Content |
|------|---------|
| `topbar-left` | Mode buttons `🎈 🔤 🔢` + `[Continue][Restart]` |
| `topbar-center` | Challenge prompt (or score in free play) |
| `topbar-right` | Reward emojis (collected) + `⚙` settings |

- Mode buttons are small icon toggles — one is active (highlighted border)
- Challenge prompt: `Spell: G·A·_·_·N` or `2 + 3 = ?` — replaces score text when challenge active
- Score (`🎈 12`) moves to right side, before settings gear
- Reward emojis display inline: `🍫🧁🍬` — latest 5-8 collected, compact

### 3. Stats Pad Refactoring

The existing grid (`#letter-grid`) is already clickable and responsive. It adapts per mode:

| Mode | Grid content | Layout |
|------|-------------|--------|
| Free Play | 26 letter cells A-Z | `repeat(26, 1fr)` desktop / `repeat(13, 1fr)` mobile (unchanged) |
| Spelling | 26 letter cells A-Z | Same layout. Target word letters get **glowing border**. Non-relevant letters slightly dimmed. Completed letters get ✅ fill. |
| Math | 10+1 number cells 0-10 | `repeat(11, 1fr)` desktop / `repeat(6, 1fr)` mobile. Larger cells since fewer. |

Key behavior:
- Clicking a **grid cell** = same as typing that letter/number = same as popping that balloon on canvas
- In spelling mode, popping/clicking the **wrong** letter → cell shakes (CSS animation), no penalty
- In spelling mode, the **next expected letter** cell pulses gently (CSS animation)

### 4. Challenge Engine (shared abstraction)

| Component | Description |
|-----------|-------------|
| `Challenge` object | `{ type, prompt, answer, progress, rewardEmoji }` |
| `type` | `"spell"` or `"math"` |
| `prompt` | Display string for top bar: `"GAVIN"` or `"2 + 3"` |
| `answer` | Ordered array of correct inputs: `["G","A","V","I","N"]` or `["5"]` |
| `progress` | Index into `answer` — how far the player has gotten |
| `rewardEmoji` | Random pick from favorites, assigned at challenge creation |
| `generateBalloonSet()` | Returns which chars/numbers should appear as balloons |

Flow per challenge:
1. Challenge appears → prompt shown in top bar center, grid highlights targets
2. Player pops balloon or clicks grid cell
3. If correct: advance `progress`, fill in prompt letter, balloon respawns
4. If wrong: shake animation on balloon + grid cell, no state change
5. If complete (`progress === answer.length`): emoji reward, next challenge

### 5. Spelling Mode Details

| Feature | Spec |
|---------|------|
| Word source | Configurable word banks by category |
| Categories (MVP) | Family: `GAVIN, MOM, DAD` / Fruits: `APPLE, GRAPE, MANGO` / Planets: `SUN, MOON, MARS` |
| Balloon set | All unique letters in the target word + 3-5 random distractor letters |
| Grid behavior | All 26 cells stay. Target letters get glowing border. Next letter pulses. Completed letters get colored fill. |
| Prompt display | Top bar center: letters with dots, completed ones filled: `G·A·_·_·N` |
| Correct pop | Letter fills in prompt, grid cell marks complete, balloon respawns |
| Wrong pop | Balloon + grid cell shake (CSS `@keyframes shake`), stay on screen |
| Word complete | Burst animation, emoji flies to reward area, next word from bank |
| Max word length | 6 letters (age-appropriate for 4-5) |

### 6. Math Mode Details

| Feature | Spec |
|---------|------|
| Operations | Addition and subtraction only |
| Range | Operands 0-9, results 0-10 |
| Grid content | Numbers 0-10 replace letters (grid rebuilds with 11 cells) |
| Balloon set | Number balloons 0-9 float on canvas |
| Prompt display | Top bar center: `3 + 4 = ?` or `7 − 2 = ?` |
| Correct pop | Number fills in prompt → burst → emoji → next equation |
| Wrong pop | Balloon + grid cell shake, stay on screen |
| Generation | Random within range, ensuring non-negative subtraction results |

### 7. Reward System

| Feature | Spec |
|---------|------|
| Emoji pool | 🍜 🍫 🧁 🍰 🍬 🎂 🍩 🍪 (Gavin's favorites) |
| When awarded | Each completed spelling word or correct math answer |
| Display location | `topbar-right`, inline before ⚙ gear — compact emoji row |
| Overflow | Show latest 5-8 emojis. If more, show count: `🍫🧁🍬 +12` |
| Streak bonus | 3 correct in a row → bonus emoji burst (2 emojis at once) |
| Persistence | Rewards array persists in localStorage alongside score/stats |

### 8. Mode Selection UX

| Feature | Spec |
|---------|------|
| Location | `topbar-left`, before Continue/Restart buttons |
| Controls | Three small icon buttons: `🎈` (Free) · `🔤` (Spell) · `🔢` (Math) |
| Active state | Active button gets `border: 2px solid #ffb347` highlight |
| Default | Free Play `🎈` (preserves current behavior exactly) |
| Switching | Can switch anytime. Clears current challenge + canvas balloons. Keeps rewards + stats. Rebuilds grid for new mode. |
| Word bank picker | Settings dropdown gets category `<select>` when in spelling mode |

### 9. UI / UX Principles

| Principle | Description |
|-----------|-------------|
| Reuse existing layout | Top bar, stats pad, canvas — no new DOM areas added |
| Stats pad = input panel | Grid cells are clickable in ALL modes, same as typing or tapping balloons |
| Big, forgiving targets | Balloons and grid cells generous for small fingers |
| No punishment | Wrong answer = gentle shake. Never remove score, rewards, or progress |
| Visual progress | Spelling prompt fills in as letters popped; grid cells mark completion |
| Immediate feedback | Correct → instant burst + color. Wrong → instant shake |
| Parent-configurable | Word banks and categories in settings gear, not child-facing |
| Consistent mechanic | Pop interaction is the only input across all modes |

### 10. Platform / Scope

| Platform | Priority |
|----------|----------|
| Mobile browser (touch) | Primary — this is where Gavin plays |
| Desktop browser (keyboard) | Supported — keyboard typing works for letter/number input |
| PWA / installable | Supported (existing manifest.json) |
| Native app | ❌ Not planned |

### 11. Explicit Non-Goals

| Feature | Status |
|---------|--------|
| Timers / countdown pressure | ❌ |
| Difficulty progression / levels | ❌ |
| Leaderboards / competitive scoring | ❌ |
| Sound effects / voice prompts | ❌ (future maybe) |
| User accounts / cloud sync | ❌ |
| Sentence or paragraph spelling | ❌ |
| Multiplication / division | ❌ |
| Math beyond results of 10 | ❌ |
| In-app word bank editor UI | ❌ (edit via settings dropdown for now) |
| Achievement badges / leveling system | ❌ |
| New DOM layout areas | ❌ (reuse top bar + stats pad + canvas) |

---

### Implementation Plan (suggested order)

1. **Refactor grid** — extract grid building into mode-aware function (`buildGrid(mode)`)
2. **Mode selector UI** — 🎈 🔤 🔢 buttons in `topbar-left`, persist active mode
3. **Challenge engine** — `Challenge` object, progress tracking, correct/wrong handling, shake animation
4. **Spelling mode** — word banks, grid highlighting, prompt in top bar center
5. **Math mode** — equation generation, number grid + number balloons
6. **Reward system** — emoji collection in `topbar-right`, streak bonus
7. **Mixed mode** — alternate challenges from both pools
