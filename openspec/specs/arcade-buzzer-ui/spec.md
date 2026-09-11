# Arcade Buzzer UI Specification

## Purpose
Defines the physical arcade buzzer look, feel, and dark-console party aesthetic for the song-guessing game, focusing strictly on visual presentation and interaction without altering server logic or game contracts.

## Requirements

### Requirement: Physical Arcade Buzzer Appearance
The system MUST render the buzzer as a physical arcade hardware dome with a chrome bezel and LED underglow.

#### Scenario: Displaying the buzzer button
- GIVEN the player is on the buzzer screen
- WHEN the buzzer is rendered
- THEN it MUST display a physical dome and bezel
- AND the decorative glow layers MUST have `pointer-events-none` applied

### Requirement: Instant Press Feedback
The system MUST provide optimistic travel and feedback for the buzzer press in under 10ms.

#### Scenario: Player presses the buzzer
- GIVEN the player is active in a game round
- WHEN the player presses the buzzer
- THEN the system MUST apply a `translateY` travel effect
- AND the press response MUST occur in less than 10ms

### Requirement: Touch Event Handling
The system MUST retain `pointerdown` and `preventDefault` handling to avoid touch delay and gesture interception.

#### Scenario: Player interacts on a mobile device
- GIVEN the player is using a mobile touch device
- WHEN the player taps the buzzer
- THEN the system MUST intercept the tap using `pointerdown`
- AND the system MUST apply `touch-action: none` to prevent double-tap zoom or scroll
- AND the system MUST call `preventDefault`

### Requirement: Dark Console Theme Alignment
The system MUST purge old neumorphic tokens (`.nm-*`) and apply a dark console aesthetic with neon accents.

#### Scenario: Rendering the application theme
- GIVEN the player navigates to the Host, Landing, or Scoreboard views
- WHEN the UI is painted
- THEN it MUST use the dark console palette (`#0B0F19` / `#111827`) with neon accents
- AND it MUST use Outfit 900 for headings and Space Mono for timers, codes, and scores
- AND no `.nm-*` classes SHALL be present

### Requirement: Reliability and Regression Preservation
The system MUST NOT alter existing server logic, socket contracts, scoring rules, or gesture-gated audio/haptics.

#### Scenario: Playing a full game round
- GIVEN a full game round is played across mobile (at least 360px viewport) and desktop
- WHEN players buzz in
- THEN the socket payloads and event names MUST remain unchanged
- AND the audio and haptics MUST only trigger behind the existing press gesture gate
- AND the game MUST complete successfully without scoring regressions
