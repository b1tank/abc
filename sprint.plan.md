# Sprint Plan — Challenge Modes (YOLO)

## Tasks (prioritized order)

1. [ ] **Refactor grid** — Extract `buildGrid(mode)` that builds letter cells (free/spell) or number cells (math). Mode-aware click handlers.
2. [ ] **Mode selector UI** — Add 🎈🔤🔢 buttons in `topbar-left`. Active mode persisted in settings. Mode switch rebuilds grid + clears canvas.
3. [ ] **Challenge engine** — `Challenge` object with `{ type, prompt, answer, progress, rewardEmoji }`. Correct/wrong handling. CSS shake animation for wrong answers.
4. [ ] **Spelling mode** — 100-word common word bank. Random word selection. Prompt display in topbar-center. Grid highlights target letters, pulses next expected. Balloon set = target letters + distractors.
5. [ ] **Math mode** — Random addition/subtraction within 10. Number balloons 0-9. Prompt `3 + 4 = ?` in topbar-center. Grid shows 0-10 number cells.
6. [ ] **Reward system** — Emoji pool (🍜🍫🧁🍰🍬🎂🍩🍪). Collect on challenge completion. Display in topbar-right. Streak bonus. Persist in localStorage.
7. [ ] **Final commit, push, deploy** — Single commit, push, deploy to both LAN and public.

## Hiccups & Notes

_(filled during sprint)_
