# ADR-002: Removal of Lobby Component and Direct Board Navigation

## Status
Accepted

## Date
2026-01-25

## Context

The application previously included a lobby system (`GameLobbyView.vue` and `useLobby.ts`) that provided an intermediate page between game selection and the actual game board. This lobby offered:

1. **Mode Selection**: Choice between manual and server-based signaling
2. **Session Browser**: List of available game sessions to join
3. **Manual Offer/Answer Exchange**: UI for copying and pasting WebRTC signals

### Problems with the Lobby Approach

1. **Platform Scope Confusion**: The lobby implied Mykoboard was a social platform for discovering and joining games, when in reality it's a **game facilitation tool** for groups that already know each other

2. **Unnecessary Complexity**: The lobby added an extra navigation step and maintained dual state management (lobby state + board state)

3. **Social Features Out of Scope**: Features like session browsing and player discovery belong in external social platforms (Discord, Slack, etc.), not in a game board tool

4. **Always Server Mode**: After implementing the lambda-based peer approval flow (ADR-001), we always use server-based signaling, making mode selection obsolete

5. **Duplicate State Management**: Both `useLobby` and `useGameSession` managed signaling state, creating confusion and potential bugs

### Platform Philosophy

Mykoboard should be:
- ✅ A **shared game board** for groups who already communicate elsewhere
- ✅ A **WebRTC facilitator** for peer-to-peer game sessions
- ✅ A **game state manager** with cryptographic verification

Mykoboard should NOT be:
- ❌ A social platform for finding players
- ❌ A matchmaking service
- ❌ A chat or communication platform

**Social groups form elsewhere** (Discord, WhatsApp, Slack, etc.). Mykoboard simply provides the shared game board when they want to play together.

## Decision

We have **removed the lobby system entirely** and implemented **direct navigation** from game selection to game board:

1. **Removed Components**:
   - `src/pages/GameLobbyView.vue` - Lobby page
   - `src/components/lobby/` - All lobby UI components
   - `src/composables/useLobby.ts` - Lobby state management

2. **Simplified Navigation**:
   - `/games/:gameId` now redirects to `/games` (game selection)
   - Clicking "Play Session" goes directly to `/games/:gameId/:boardId`
   - No intermediate lobby page

3. **Extracted Shared State**:
   - Created `src/composables/sharedState.ts` for truly shared pieces
   - Contains: `identity`, `activeSessions`, `lobbyActor`, `getBoardActor()`
   - Both `useGameSession` and future composables can import from here

4. **Consolidated Signaling**:
   - All signaling logic now in `useGameSession`
   - Always uses server mode (lambda-based)
   - No mode selection needed

## Implementation Details

### New Flow

**Before:**
```
Game Selection → Lobby (mode selection) → Board
```

**After:**
```
Game Selection → Board (with peer approval)
```

### Router Changes

```typescript
// Removed lobby route
{
    path: '/games/:gameId',
    redirect: '/games'  // Redirect to game selection
}

// Board route remains
{
    path: '/games/:gameId/:boardId',
    name: 'board',
    component: () => import('../pages/BoardView.vue')
}
```

### Shared State Module

Created `sharedState.ts` to hold truly global state:

```typescript
// Global shared state
export const identity = ref<PlayerIdentity | null>(null);
export const isLoading = ref(true);
export const activeSessions = ref<GameSession[]>([]);

// Persistent actors
export const lobbyActor = createActor(lobbyMachine, {...}).start();

// Board actor factory
export function getBoardActor(boardId, playerName, isInitiator, maxPlayers) {
    // Creates or retrieves board actor for given boardId
}
```

### Component Updates

#### `GameCardView.vue`
- Removed `useLobby` import
- Removed `setSignalingMode` call
- Directly navigates to board with `router.push()`

#### `BoardView.vue`
- Removed `useLobby` dependency
- Gets `signalingClient` and `isServerConnecting` from `useGameSession`
- Sets `signalingMode` as constant `'server'`
- Simplified navigation functions to use `router.push('/games')`

#### `useGameSession.ts`
- Now imports from `sharedState.ts` instead of `useLobby.ts`
- Self-contained signaling logic
- No external dependencies on lobby state

## Consequences

### Positive

1. **Clearer Platform Purpose**: Mykoboard is clearly a game board tool, not a social platform
2. **Simplified Architecture**: One less layer of state management and navigation
3. **Reduced Code**: Removed ~500 lines of lobby-related code
4. **Faster User Flow**: Users go directly from game selection to playing
5. **Better Separation of Concerns**: Social features belong in social platforms
6. **Easier Maintenance**: Less code to maintain and test
7. **Clearer Mental Model**: Game selection → Play → Share link with friends

### Negative

1. **No Session Discovery**: Users can't browse available sessions (intentional - they should share links directly)
2. **No Manual Mode**: Removed manual offer/answer exchange (server mode is better anyway)
3. **Breaking Change**: Old lobby links (`/games/:gameId`) redirect to game selection

### Neutral

1. **External Social Dependency**: Users need to communicate via external platforms (Discord, etc.) to share game links
2. **Link Sharing Required**: Host must share the board link with guests (this is the intended flow)

## Migration Path

### For Users
1. Old lobby links automatically redirect to game selection
2. Users should share board links directly (e.g., via Discord, WhatsApp)
3. No data migration needed (sessions are ephemeral)

### For Developers
1. Remove any references to `useLobby` in custom code
2. Import shared state from `sharedState.ts` if needed
3. Update navigation to go directly to board routes

## Verification

### Test Scenarios

1. **Direct Board Navigation**
   - ✅ Click "Play Session" → Goes directly to board
   - ✅ No intermediate lobby page
   - ✅ Host can immediately share link

2. **Link Sharing**
   - ✅ Host copies shareable link from preparation phase
   - ✅ Guest opens link → Goes directly to board
   - ✅ Host approves guest → WebRTC connection established

3. **Redirect Handling**
   - ✅ `/games/:gameId` redirects to `/games`
   - ✅ No broken links or 404 errors

4. **State Management**
   - ✅ `sharedState.ts` provides identity and actors
   - ✅ `useGameSession` manages all signaling
   - ✅ No state conflicts or duplication

## Design Principles

This change reinforces key design principles:

1. **Single Responsibility**: Mykoboard facilitates shared game boards, not social networking
2. **Simplicity**: Remove unnecessary layers and features
3. **External Integration**: Leverage existing social platforms instead of rebuilding them
4. **User Flow**: Minimize steps between "I want to play" and "I'm playing"

## Future Considerations

### What This Enables

1. **Integration with Social Platforms**: 
   - Discord bot that creates game sessions
   - Slack integration for team game nights
   - WhatsApp/Telegram bots for sharing game links

2. **Simplified Onboarding**:
   - Users don't need to understand "lobby" vs "board"
   - Clear flow: Pick game → Play → Share link

3. **Focus on Core Features**:
   - Better game implementations
   - Enhanced cryptographic verification
   - Improved WebRTC reliability

### What This Doesn't Prevent

- Future social features can be added as **external integrations**
- Session discovery can be implemented via **third-party services**
- Matchmaking can be handled by **dedicated platforms**

## Related Documents

- ADR-001: Lambda-Based Peer Approval Flow

## References

- Platform Design Philosophy: Focus on core competencies
- UNIX Philosophy: Do one thing and do it well
- Separation of Concerns: Social features ≠ Game board features
