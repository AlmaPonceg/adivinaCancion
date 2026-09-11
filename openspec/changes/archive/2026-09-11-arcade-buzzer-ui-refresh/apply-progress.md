# Apply Progress: Arcade Buzzer UI Refresh

**Change**: arcade-buzzer-ui-refresh
**Mode**: Standard (strict_tdd false, no test runner in repo)
**Status**: All 18 tasks complete (18/18)
**Attempt Token**: `sha256:c7a9dad8ba05418ee00d43bf9da454e415fd8034966e30d0593dcb905a73e3b8`

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `grep -rn "nm-" client/src/` -> 0 matches (exit code 1). Token purge 100% verified. |
| Runtime harness command/scenario and exact result | `git diff daa5b00 HEAD -- server/ package.json client/package.json` -> empty output (0 changes outside client/src). Socket diff on `PlayerBuzzer.jsx` and `BuzzerButton.jsx` confirms zero event/payload/handler modifications. |
| Rollback boundary | 4 clean atomic commits on `client/src/` (c69a1f3, b5d31b5, b9033a5, bc4ce53), can be reverted cleanly via `git revert c69a1f3..bc4ce53` without affecting server or dependencies. |

## Completed Tasks

### Phase 1: Design Tokens & Theme Foundation
- [x] 1.1 Add `@theme` with `--color-console-bg:#0B0F19`, `--color-console-surface:#111827`, `--color-console-elevated:#1F2937`, neon + text vars in `client/src/index.css`
- [x] 1.2 Replace `.nm-flat`/`.nm-flat-sm`/`.nm-inset`/`.nm-btn`/`.nm-btn-primary` defs with `.console-card`/`.console-card-sm`/`.console-inset`/`.console-btn`/`.console-btn-primary`, purge `--nm-*` in `client/src/index.css`
- [x] 1.3 Update `body` bg to console gradient, add `.font-heading{font-weight:900}`, delete `.nm-buzzer-*` + `.nm-convex` in `client/src/index.css`
- [x] 1.4 Verify `grep -rn "nm-" client/src/index.css` returns 0

### Phase 2: Buzzer Dome Restyle (same props/handlers)
- [x] 2.1 Restyle plate `bg-[#111827]` + slate border, bezel `slate-600/400` gradient, dome team radial on dark base in `client/src/components/BuzzerButton.jsx`
- [x] 2.2 Tighten gloss `from-white/30`, keep `motion.div` glow `pointer-events-none`, labels `font-heading` Outfit 900 in `client/src/components/BuzzerButton.jsx`
- [x] 2.3 Preserve `translateY(14px) scale(0.94)` via `isPressed`, `pointerdown`+`preventDefault`+`touch-action:none`, props frozen in `client/src/components/BuzzerButton.jsx`

### Phase 3: PlayerBuzzer Layout Polish (handlers untouched)
- [x] 3.1 Replace container bg `var(--color-console-bg)`, pills dark+neon, ticker dark cards + team border in `client/src/pages/PlayerBuzzer.jsx`
- [x] 3.2 Swap `nm-btn` refs → `.console-*`, toast neon-bordered, modal `bg-[#111827]` in `client/src/pages/PlayerBuzzer.jsx`
- [x] 3.3 Assert zero handler/socket change — `socket.emit('buzz')`/`first-buzz`/`round-result` untouched in `client/src/pages/PlayerBuzzer.jsx`

### Phase 4: Host/Landing/Scoreboard/Queue/Join/GameOver Theme Alignment
- [x] 4.1 Align `client/src/pages/Landing.jsx` — dark bg, `console-card`, neon gradients, dark pills, `console-btn(-primary)`
- [x] 4.2 Align `client/src/pages/HostGame.jsx` + `client/src/pages/HostLobby.jsx` — `nm-*`→`console-*`, dark bg/cards, neon accents
- [x] 4.3 Align `client/src/pages/PlayerJoin.jsx` + `client/src/pages/GameOver.jsx` — `nm-*`→`console-*`, dark bg (confetti untouched)
- [x] 4.4 Align `client/src/components/Scoreboard.jsx` (`nm-flat`→`console-card`, track `bg-slate-800`) + `client/src/components/BuzzQueue.jsx` (`nm-flat`→`console-card`)

### Phase 5: Verification (per design testing strategy)
- [x] 5.1 Token purge — `grep -rn "nm-" client/src/` returns 0 `.nm-` matches
- [x] 5.2 Scope guard — `git diff --stat` shows 0 `server/*`, 0 `package.json` deps, only 10 `client/src/` files
- [x] 5.3 Socket diff empty — `git diff HEAD -- client/src/pages/PlayerBuzzer.jsx client/src/components/BuzzerButton.jsx` shows no `socket.emit`/`on` change; audio gated on `handlePointerDown`
- [x] 5.4 Viewport + full round — 360px + 1280px: dome/bezel/glow renders, `pointerdown` <10ms (4x throttle), no overflow, Host→join→buzz→judge→score passes
