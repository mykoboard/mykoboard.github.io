# ADR 005: Ping-Driven Identity Exchange and Enhanced Deduplication

## Status
Accepted

## Context
The previous WebRTC player identification had several flaws:
- **Identity Adoption**: Guests would temporarily adopt the host's name because the host's name was leaked in the initial signal.
- **Anonymous Duplicates**: Race conditions in wallet loading often resulted in "Anonymous (LOCAL)" entries alongside correctly identified peers.
- **Sync Reliability**: Outgoing synchronization messages (`SYNC_PARTICIPANTS`) were often triggered before the guest's identity was fully known to the host, leading to incomplete lobby lists.
- **Reactivity Lag**: Vue's reactivity batching meant that machine state transitions lagged behind the "live" status of WebRTC connection objects.

## Decision
Refactor the identity exchange to be push-driven from the guest immediately upon connection:

1.  **Sanitize Signals**: Removed `playerName` from the WebRTC `Signal` payload.
2.  **Stateful Connection Objects**: Added `localPlayerId`, `localPlayerName`, and `localPublicKey` to the `Connection` class.
3.  **Ping-Driven Exchange**: Modified the `onopen` data channel handler to send a JSON `PLAYER_IDENTITY` message immediately. This ensures the first bit of data the host receives is the guest's full identity.
4.  **Bypass Reactivity Batching**: Refactored `syncParticipants` and `playerInfos` in `useGameSession.ts` to merge the "live" `pendingConnections` Map with the state machine's context Map. This ensures the UI reflecting "Dwellers In Lobby" is always at the absolute leading edge of the connection state.
5.  **Strict Deduplication**: Enforced `publicKey` as the primary key for all player list calculation, ensuring that `localPlayer` is always deduplicated correctly against remote views.

## Consequences
- **Pros**: Perfectly clean player lists, zero "Anonymous" blips, guaranteed identity broadcast before game start.
- **Cons**: Minor increase in initial data channel traffic (one JSON message on open).
- **Future**: This protocol can be extended to exchange more complex metadata (avatars, preferences) during the same "Ping" phase.
