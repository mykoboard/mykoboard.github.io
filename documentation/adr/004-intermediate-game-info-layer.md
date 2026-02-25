# ADR-004: Intermediate Game Information and Onboarding Layer

## Status
Accepted

## Date
2026-02-25

## Context
[ADR-002](./002-removal-of-lobby-direct-board-navigation.md) successfully simplified the user flow by removing the "Lobby" layer, which mixed networking configuration (signaling modes) with game discovery. 

However, as game complexity increases (e.g., *Apex Nebula*), a total lack of an intermediate layer created a "documentation gap." Users were forced into a game board without viewing mechanics, turn structures, or required win conditions. Direct navigation to a board ID also made the "Hosting" intent implicit rather than explicit.

## Decision
We have introduced a dedicated **Game Information View** that serves as an onboarding bridge between the Game selection and the live P2P board.

### Implementation Details

1. **New Route Pattern**: 
   The route `/games/:gameId` no longer redirects to the library. It now displays `GameInfoView.vue`.

2. **Microfrontend Integration**:
   - Each game package (Remote) must expose a `./GameInfo` component.
   - The Shell (Host) lazy-loads this component based on the `gameId`.
   - This keeps the shell "zero-knowledge"—it does not need to know the rules of the games it hosts.

3. **Explicit Hosting Intent**:
   The "Create Game Session" button is now located on this info page. Clicking it:
   - Generates the deterministic Board UUID.
   - Marks the session as "Hosting" in the local `IndexedDB`.
   - Navigates the user to the Board.

4. **Asset Optimization**:
   Large game card assets and UI guides are converted to **WebP** to ensure route transitions to/from this page are performant and don't cause layout "blowout."

## Consequences

### Positive
- **Better Onboarding**: Users can read rules and UI guides before initiating a session.
- **Improved Performance**: Documentation is only downloaded when the user expresses interest in a specific game.
- **Architectural Scalability**: Adding new games only requires updating the `GameRegistry` thumbnail/metadata; the rules stay within the game's own package.

### Negative
- **Extra Click**: Adds one additional navigation step for seasoned players who already know the rules.

## References
- Amends: [ADR-002 - Removal of Lobby and Direct Board Navigation](./002-removal-of-lobby-direct-board-navigation.md)
