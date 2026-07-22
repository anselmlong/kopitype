# kopitype ☕

A Singlish typing test in the style of [monkeytype](https://monkeytype.com). Pick a
mode and a duration, type the prompt, get your wpm and accuracy. Dark, minimal, no
accounts — just wpm lah. An optional **global leaderboard** (a small FastAPI +
SQLite backend) lets you post a nickname and score; the core test still runs fully
client-side without it.

Live modes:

- **words** — single Singlish tokens (`lah`, `shiok`, `kopi`, `laksa`, …)
- **sg life** — everyday Singapore (`paynow`, `paylah`, `bto`, `hdb`, `mlbb`, `paywave`, …)
- **quote** — full Singlish phrases (kopi orders, hawker orders, mrt gripes, army life)
- **mrt** — station names, attributed to their line (`ang mo kio` — north south line)
- **xmm** — 2000s texting style, vowels optional (`gd nite swt drms` — msn status)
- **uncensored** — gated Hokkien vulgarities, off by default, behind a one-tap "you asked for it ah" confirm
- **custom** — a fixed phrase you set yourself, shared as a link (see below)

The results screen shows a **pace-over-time graph** (running wpm per second, with an
× on every second that contained a wrong keystroke) and **the singlish you typed** —
each word from the run, with a hover tooltip giving its meaning and a click-through
to its dictionary entry (Wiktionary, or Wikipedia for the institutions).

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

### Leaderboard (optional)

The leaderboard talks to a separate backend. Point the frontend at it with an env
var (defaults to the production API when unset):

```bash
# .env.local
NEXT_PUBLIC_LEADERBOARD_API=http://localhost:8000
```

Run the backend locally from `leaderboard-api/`:

```bash
pip install -r leaderboard-api/requirements.txt
KOPITYPE_DB=./leaderboard.db uvicorn main:app --port 8000   # from leaderboard-api/
```

`KOPITYPE_DB` sets the SQLite path (default `/data/leaderboard.db`, meant for a
mounted volume in the container). The board shows each player's best run per mode +
duration, so multiple attempts don't crowd it out.

## How it works

The whole test lives on one page (`app/page.tsx` → `components/TypingTest.tsx`), a small
state machine: `idle → running → finished`.

- A hidden `<input>` captures typing. Its value **is** the current word's buffer, so it
  works with both physical keyboards and mobile soft keyboards (we read value changes,
  not keycodes). A space commits the word. Backspace erases within the current word,
  and — monkeytype-style — crosses back into the previous word only if that word was
  committed with an error; correctly typed words are locked.
- The timer starts on the first keystroke, not on load.
- `components/WordStream.tsx` renders per-character state: `pending` / `correct` /
  `incorrect` / `extra`, with a caret, and scrolls as you descend the lines.
- `lib/wpm.ts` holds the pure, unit-tested math: `wpm = (correct chars / 5) / minutes`,
  plus raw wpm and accuracy.
- On timeout the input freezes and `components/Stats.tsx` shows the result, your
  previous score, and your personal best (per mode + duration, in `localStorage` —
  still no accounts). `Tab` (while typing or on the results screen) or the restart
  button starts a fresh test; `Shift+Tab` and `Escape` are never hijacked, so
  keyboard navigation always works.
- Quiet synthesized keystroke/finish sounds live in `lib/sound.ts` (WebAudio, no
  audio assets) behind a "sound" toggle that's remembered in `localStorage`.
- Quote mode shows the attribution of the quote you're typing ("— kopi order").
- While a test runs, the keystroke tallies are snapshotted once a second
  (`lib/pace.ts`, pure + tested); the results screen renders them as an SVG line
  chart (`components/PaceChart.tsx` — hover crosshair, keyboard arrows, no chart
  library).
- `data/glossary.json` maps terms to short meanings (plus an optional link);
  `components/GlossaryWords.tsx` turns the words you attempted into hoverable,
  clickable chips.

## Custom challenges

Click **custom** in the mode bar, type a phrase (up to 300 chars), share the link.
The phrase travels base64url-encoded in the URL fragment (`#c=…`) — no backend, no
storage, nothing expires. Opening a challenge link loads a fixed-phrase test that
ends when the phrase does; the timer counts up and the wpm is computed from elapsed
time. Challenges don't touch personal bests. `lib/challenge.ts` owns the
encode/decode (validated + normalized on the way in — never trust a URL).

## Crowdsourcing (curated)

Click **submit** in the mode bar to send in words, quotes, or meanings. With no
backend, the review queue is the repo itself: the form opens a prefilled GitHub
issue (labelled `corpus-submission`) containing a ready-to-paste JSON snippet.
Nothing goes live until a maintainer vets it and commits it into `data/` — 
crowdsourced input, curated output.

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

### Corpus sizes

| File | Entries | Shape |
|---|---|---|
| `data/words.json` | ~240 | single lowercase tokens |
| `data/sg.json` | ~97 | single lowercase tokens (everyday SG) |
| `data/quotes.json` | 72 | `{ text, source }` phrases |
| `data/mrt.json` | ~120 | `{ text, source }` station → line |
| `data/xmm.json` | 32 | `{ text, source }` vowel-less texts |
| `data/vulgar.json` | 40 | single tokens, gated |
| `data/glossary.json` | ~217 | `term: { meaning, link? }` for the results-screen glossary |

The corpora are hand-written and meant to be human-readable (one entry per line) so they're
easy to vet and extend — which is also how crowdsourced submissions land (see above).

## Out of scope (v1)

Accounts, themes, multiplayer, punctuation/numbers toggles, i18n.
(Personal bests, sound, the pace graph, custom challenges, and the glossary all
landed post-v1 — local-only or in-URL. The global leaderboard came later and is the
one piece with a backend; everything else still runs without one.)
