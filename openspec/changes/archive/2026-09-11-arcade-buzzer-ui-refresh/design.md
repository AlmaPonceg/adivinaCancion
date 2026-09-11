# Design: Arcade Buzzer UI Refresh

## Technical Approach

Purely presentational refactor. Replace the light neumorphic design system with a dark-console arcade aesthetic (`#0B0F19`/`#111827` + neon accents). Restyle `BuzzerButton` dome layers in-place (same component boundary, same props, same leaf `useState`). Replace all `.nm-*` CSS classes with console-theme equivalents. Typography → Outfit 900 headings + Space Mono monospace. No socket events, props, callbacks, or server files change.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| Restyle BuzzerButton inline (no sub-components) | Extract DomePlunger, BezelRing as separate components | Current 155-line component is within budget; splitting adds prop-threading for zero behavioral gain. Existing leaf `isPressed` state already isolates re-renders. |
| Replace `.nm-*` with `.console-*` classes in `index.css` | Use Tailwind `@theme` only, drop all custom classes | 9 files reference `.nm-flat`, `.nm-btn`, `.nm-btn-primary`, `.nm-inset` (50 occurrences, verified). Renaming to `.console-*` is 1:1 mechanical replace, keeps CSS encapsulated. Tailwind `@theme` provides tokens; utility classes complement. |
| CSS custom properties via `@theme` in Tailwind v4 | Separate `theme.css` file | Tailwind v4 supports `@theme` inline in `index.css`. Single source of truth, no extra import. |
| Keep `framer-motion` for glow/press animations | Pure CSS keyframes | Already a dependency; `motion.div` glow pulse already works. No reason to rewrite. |
| Haptic/audio untouched behind press gesture gate | Extract to separate hook | `playPlayerBuzzerSound()` is already called inline in `handlePointerDown` only. Spec requires no change. |

## Data Flow

Press → Lock interaction flow (unchanged contracts):

```
┌─ Player Phone ──────────────────────────────────────────────┐
│                                                              │
│  pointerdown ──→ setIsPressed(true)     [<1ms, optimistic]   │
│       │          playPlayerBuzzerSound() [gesture-gated]     │
│       │          navigator.vibrate(50)   [gesture-gated]     │
│       └──→ onBuzz() ──→ handleBuzz()                         │
│                   │                                          │
│         socket.emit('buzz', {roomCode})                      │
└─────────┬────────────────────────────────────────────────────┘
          │
          ▼
┌─ Server (gameManager.js — FROZEN) ──────────────────────────┐
│  buzzQueue.push(entry) → if first → emit 'first-buzz'       │
│  lock buzzers → emit 'player-state-updated'                  │
│  judge → emit 'round-judgment' | 'round-result'             │
└──────────────────────────────────────────────────────────────┘
          │
          ▼
┌─ Player Phone (listeners — UNCHANGED) ─────────────────────┐
│  'first-buzz'        → roundNotification toast               │
│  'round-result'      → score update + modal                 │
│  'round-judgment'    → reopen or block                      │
└──────────────────────────────────────────────────────────────┘
```

**Zero contract changes**: socket event names, payload shapes, `handleBuzz` callback signature, `BuzzerButton` props interface — all frozen.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `client/src/index.css` | Modify | Purge `--nm-*` vars and `.nm-*` class defs. Add `@theme` block with `--color-console-bg: #0B0F19`, `--color-console-surface: #111827`, neon accent vars. Replace with `.console-card`, `.console-card-sm`, `.console-inset`, `.console-btn`, `.console-btn-primary`. Update `body` bg to console gradient. Font vars already correct (`Outfit`, `Space Mono`). Add `.font-heading { font-weight: 900 }`. |
| `client/src/components/BuzzerButton.jsx` | Modify | Restyle mounting plate → dark console `#111827` bg + subtle slate border. Chrome bezel → metallic gradient `from-slate-600 via-slate-400 to-slate-600`. Plunger dome → team-colored radial gradient on dark base. Convex gloss → tighter `from-white/30` arc. LED underglow ring → existing `motion.div` glow, keep `pointer-events-none`. Labels → `font-heading` Outfit 900 + `tracking-widest`. Press travel stays `translateY(14px) scale(0.94)` via `isPressed` state. No prop/handler changes. |
| `client/src/pages/PlayerBuzzer.jsx` | Modify | `min-h-dvh` container → `bg-[var(--color-console-bg)]`. Top bar pills → dark surface + neon text. Scoreboard ticker → dark cards + team color left-border. Status text → light text on dark bg. Notification toast → neon-bordered. Teams modal → dark surface `#111827`. Replace `nm-btn`/`nm-btn-primary` refs → console equivalents. All handlers, socket listeners, state — UNTOUCHED. |
| `client/src/pages/Landing.jsx` | Modify | Container bg → console dark. Card → `console-card`. Vinyl disc → keep animation, darken ring colors. Gradient text → neon accent colors. Feature tags → dark surface pills. Buttons → `console-btn-primary`, `console-btn`. |
| `client/src/pages/HostGame.jsx` | Modify | Replace `nm-flat`, `nm-btn-primary` → `console-card`, `console-btn-primary`. Dark bg container. |
| `client/src/pages/HostLobby.jsx` | Modify | Replace `.nm-*` refs → console equivalents. Dark bg, dark cards, neon accents. |
| `client/src/pages/PlayerJoin.jsx` | Modify | Replace `nm-flat`, `nm-btn-primary` → console equivalents. Dark bg. |
| `client/src/pages/GameOver.jsx` | Modify | Replace `nm-flat`, `nm-btn-primary` → console equivalents. Dark bg. Confetti colors already dynamic. |
| `client/src/components/Scoreboard.jsx` | Modify | Replace `nm-flat` → `console-card`. Progress bar track → `bg-slate-800`. |
| `client/src/components/BuzzQueue.jsx` | Modify | Replace `nm-flat` → `console-card`. Dark surface. |
| `server/*` | Untouched | Zero files modified. |

## Interfaces / Contracts

**BuzzerButton props — UNCHANGED:**

```jsx
// Exact same interface, no additions, no removals
{
  onBuzz: () => void,
  canBuzz: boolean,
  hasBuzzed: boolean,
  isBlocked: boolean,
  teamColor?: string,  // default '#4F46E5'
  isMyTurn: boolean,
}
```

**CSS Token Contract (new `@theme` block in `index.css`):**

```css
@theme {
  --color-console-bg: #0B0F19;
  --color-console-surface: #111827;
  --color-console-elevated: #1F2937;
  --color-neon-indigo: #818CF8;
  --color-neon-pink: #F472B6;
  --color-neon-emerald: #34D399;
  --color-text-on-dark: #F1F5F9;
  --color-text-muted-dark: #94A3B8;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | Buzzer dome renders with bezel, glow, labels on dark bg | Manual: open `/play` on 360px Chrome DevTools mobile + desktop viewport |
| Interaction | Press latency feels instant (<10ms to visual travel) | Manual: pointerdown on mobile device, observe `translateY` travel. CPU throttle 4x in DevTools. |
| Regression | Full game round completes without errors | Manual: Host creates room → players join → round starts → buzz → judge → score → next round. Compare socket payload shapes pre/post via Network tab. |
| Token purge | Zero `.nm-*` classes remain | `grep -r "nm-" client/src/` returns only `animate` or unrelated matches. |
| Scope guard | git diff limited to `client/` presentational files | `git diff --stat` must show 0 server files, 0 new dependencies in `package.json`. |
| Viewport | 360px mobile portrait + 1280px desktop | Both viewports render without overflow, buzzer is tappable, labels readable. |

## Migration / Rollout

No migration required. Purely visual — rollback is `git revert` of the presentational commits. No data, no feature flags, no server state affected.
