# kopitype ☕

A Singlish typing test in the style of [monkeytype](https://monkeytype.com). Pick a
mode and a duration, type the prompt, get your wpm and accuracy. Dark, minimal, no
accounts, no leaderboard, no backend — just wpm lah.

Live modes:

- **words** — single Singlish tokens (`lah`, `shiok`, `kopi`, `laksa`, …)
- **quote** — full Singlish phrases (kopi orders, hawker orders, mrt gripes, army life)
- **uncensored** — gated Hokkien vulgarities, off by default, behind a one-tap "you asked for it ah" confirm

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript), statically exported (`output: "export"`) — no server, no API routes
- Corpora are static JSON shipped with the app; nothing is generated at runtime
- [Vitest](https://vitest.dev) for the wpm/accuracy math
- Deploys to Vercel automatically on push to `main`

## Run locally

```bash
npm install
npm run dev      # dev server at http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build -> static export in ./out
npm test         # unit tests for the wpm/accuracy math
```

To preview the exact static output Vercel serves:

```bash
npm run build
npx serve out    # or: python3 -m http.server -d out 8000
```

## How it works

The whole test lives on one page (`app/page.tsx` → `components/TypingTest.tsx`), a small
state machine: `idle → running → finished`.

- A hidden `<input>` captures typing. Its value **is** the current word's buffer, so it
  works with both physical keyboards and mobile soft keyboards (we read value changes,
  not keycodes). A space commits the word; backspace only erases within the current word.
- The timer starts on the first keystroke, not on load.
- `components/WordStream.tsx` renders per-character state: `pending` / `correct` /
  `incorrect` / `extra`, with a caret, and scrolls as you descend the lines.
- `lib/wpm.ts` holds the pure, unit-tested math: `wpm = (correct chars / 5) / minutes`,
  plus raw wpm and accuracy.
- On timeout the input freezes and `components/Stats.tsx` shows the result. `Tab`
  (anywhere) or the restart button starts a fresh test.

## Adding a new mode / corpus

This is deliberately a two-step change (say you want a "kopi" mode):

1. **Drop a JSON file** in `data/`:
   - a **words** corpus is a plain array of lowercase single tokens:
     ```json
     ["kopi", "teh", "milo", "kosong"]
     ```
   - a **quotes** corpus is an array of `{ "text": string, "source": string }`:
     ```json
     [{ "text": "kopi c kosong gau one cup dabao", "source": "kopi order" }]
     ```

2. **Register it** in the one `MODES` array in `lib/corpus.ts`:
   ```ts
   import kopi from "../data/kopi.json";

   export const MODES: ModeDef[] = [
     // ...existing modes...
     { id: "kopi", label: "kopi", type: "words", words: kopi as string[] },
   ];
   ```

That's it — it shows up in the mode bar automatically. Add `gated: true` to hide a mode
behind the "uncensored" toggle (that's how `vulgar.json` is wired). Word-mode tokens must
be single words (no spaces); put any multi-word terms in a quotes corpus instead.

### Corpus sizes (v1)

| File | Entries | Shape |
|---|---|---|
| `data/words.json` | ~240 | single lowercase tokens |
| `data/quotes.json` | 60 | `{ text, source }` phrases |
| `data/vulgar.json` | 40 | single tokens, gated |

The corpora are hand-written and meant to be human-readable (one entry per line) so they're
easy to vet and extend.

## Out of scope (v1)

Leaderboard, accounts, themes, multiplayer, live wpm graph, custom text, punctuation/numbers
toggles, i18n.
