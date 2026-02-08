# ADR 003: PublicKey-Based Guest Player Identification

## Status
Accepted

## Context
Guest players couldn't vote in Planning Poker due to:
- Missing `isLocal: true` flag → vote handler failed
- Host uses connection ID, guest uses identity ID → duplicate entries
- No publicKey in participant sync → can't match self

## Decision
Use publicKey as canonical identifier for guest players:

1. **Guest adds self** to `playerInfos` with `isLocal: true` (useGameSession.ts:111-113)
2. **Host syncs publicKey** in participant messages (useGameSession.ts:678)
3. **Guest skips duplicates** by matching publicKey (useGameSession.ts:139)
4. **Optimistic UI** merges local + ledger `votedPlayers` (PlanningPoker.tsx:62-64)

## Consequences
**Pros**: Guest voting works, no duplicates, immediate UI feedback  
**Cons**: +100 bytes per participant message  
**Future**: Could standardize on identity ID vs connection ID

## Alternatives Rejected
- Name matching (not unique)
- Standardize on identity ID (requires WebRTC refactor)
- Separate guest state (breaks single source of truth)
