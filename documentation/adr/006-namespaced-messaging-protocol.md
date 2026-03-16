# ADR-006: Namespaced Messaging Protocol

## Status
Accepted

## Date
2026-03-16

## Context

As the game’s complexity grew, the flat messaging structure in the WebRTC loop began to cause organizational and scalability issues:

1. **Namespace Collisions**: Similar message types (e.g., `SYNC`) could be easily confused between player management and game state.
2. **Handler Bloat**: The main message listener in `useGameSession.ts` had become a large `switch` or `if/else` block handling unrelated concerns.
3. **Debugging Difficulty**: Filtering logs for specific subsystems (like P2P signaling) was challenging when all messages shared the same root structure.
4. **Fragile Protocol**: Lack of explicit categorization made it harder to enforce structured payloads for specific subsystems.

## Decision

We have implemented a **Namespaced Messaging Protocol** that wraps every message in a category-specific envelope.

### Subsystems (Namespaces)

1. **`player`**: Handles connectivity, player identity, participant synchronization, and P2P signaling (Offers, Answers, Requests).
2. **`game`**: Handles gameplay-specific state, including board lifecycle (`START_GAME`, `GAME_RESET`), ledger synchronization, and player readiness status.

### Message Structure

```typescript
interface NamespacedMessage {
    namespace: 'player' | 'game';
    type: string;
    payload: any;
}
```

## Implementation Details

### 1. Dedicated Handlers
We extracted logic into two specialized handler functions in `useGameSession.ts`:
- `handlePlayerNamespace(msg, connection)`
- `handleGameNamespace(msg, connection)`

### 2. Message Routing
The main message listener now simply routes based on the `namespace` property:

```typescript
connection.addMessageListener((data) => {
    const msg = JSON.parse(data);
    if (msg.namespace === 'player') handlePlayerNamespace(msg, connection);
    else if (msg.namespace === 'game') handleGameNamespace(msg, connection);
    else handleLegacyFallback(msg); // Fallback for transition
});
```

### 3. Utility Wrappers
Removed generic `createLobbyMessage` where possible in favor of direct namespaced objects to ensure TypeScript type safety and clarity.

## Consequences

### Positive
1. **Separation of Concerns**: Networking logic (P2P mesh) is no longer mixed with gameplay logic (ledger sync).
2. **Improved Readability**: Handlers are focused and easier to navigate.
3. **Flexible Scaling**: New namespaces (e.g., `chat`, `spectator`) can be added without modifying existing game logic.
4. **Better Logging**: Namespaces allow for prefixing logs, making it easier to trace P2P signaling versus board events.

### Negative
1. **Boilerplate**: Every message requires an extra `namespace` key.
2. **Migration Overhead**: All existing message calls had to be updated to the new format.

## Related Documents
- [Walkthrough](file:///home/dparadiz/.gemini/antigravity/brain/174c7a60-af3c-492c-bdd8-c35a5d2ac836/walkthrough.md)
