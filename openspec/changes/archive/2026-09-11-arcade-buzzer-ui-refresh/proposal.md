# Proposal: Arcade Buzzer UI Refresh

## Intent

Birthday-party song-guessing game works but looks AI-made. Make the buzzer feel like a real physical arcade button and lift surrounding screens to a dark-console party aesthetic — without touching anything that already works.

## Scope

### In Scope
- `BuzzerButton.jsx`: physical dome restyle, leaf press-state isolation
- `PlayerBuzzer.jsx`: layout/polish only, handlers untouched
- `index.css`: purge `.nm-*` neumorphic tokens, add dark-console + neon tokens
- Host / Landing / Scoreboard visual polish pass

### Out of Scope
- Server logic, socket contracts, scoring rules, playlist/team mechanics
- No Three.js/WebGL; no socket payload changes; no scoring changes

## Capabilities

### New Capabilities
- `arcade-buzzer-ui`: bespoke arcade buzzer look/feel and dark-console screen polish (visual + interaction requirements only, zero contract changes)

### Modified Capabilities
- None — `openspec/specs/` is empty; no existing requirement changes

## Approach

Bespoke physical arcade dome, zero socket/state-contract changes. Layered shadows + chrome bezel + LED underglow; `translateY` travel with optimistic <10ms press feedback. Keep `pointerdown` + `preventDefault` + `touch-action: none`; glow layers get `pointer-events-none`. Type: Outfit 900 + Space Mono. Palette: dark console `#0B0F19`/`#111827` + neon accents. Retain server-authoritative queue; audio/haptics stay behind the existing press gesture gate.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/components/BuzzerButton.jsx` | Modified | Dome/bezel/glow restyle, isolated press state |
| `client/src/pages/PlayerBuzzer.jsx` | Modified | Layout polish, handlers unchanged |
| `client/src/index.css` | Modified | Purge `.nm-*`, add console/neon tokens |
| Host/Landing/Scoreboard views | Modified | Theme alignment only |
| `server/gameManager.js`, `server/index.js` | Untouched | Queue, scoring, socket timing frozen |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Touch delay / 300ms tap lag | Med | Keep `pointerdown`, `touch-action: none`, verify on mobile |
| Gesture interception (glow swallowing taps) | Low | `pointer-events-none` on all decorative layers |
| Viewport differences (small phones) | Med | Fluid dome sizing, test 360px + desktop |

## Rollback Plan

Purely visual: revert presentational layer in `BuzzerButton.jsx` / `PlayerBuzzer.jsx` / `index.css` via git. Socket contracts, queue, and scoring unchanged, so no data migration or server rollback needed.

## Dependencies

- None. No new packages (Framer Motion + Tailwind v4 only).

## Success Criteria

- [ ] Buzzer reads as physical arcade hardware, press travel is instant
- [ ] No socket/scoring diff; full game round passes on mobile + desktop
- [ ] No `.nm-*` tokens remain; party looks bespoke, not AI-made
