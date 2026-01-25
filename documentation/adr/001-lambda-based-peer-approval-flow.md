# ADR-001: Lambda-Based Peer Approval Flow for Game Sessions

## Status
Accepted

## Date
2026-01-25

## Context

The previous game session flow allowed guests to automatically connect to hosts via WebRTC by simply having the shareable link. This created several issues:

1. **No Host Control**: Hosts had no ability to approve or reject incoming connections
2. **Security Concerns**: Anyone with the link could join without permission
3. **Friend Management**: No integration with the friends system to verify trusted peers
4. **Ambiguous Roles**: Difficult to reliably distinguish between host and guest when using the same link
5. **Immediate Connection**: WebRTC connections were established before the host could verify the guest

### Previous Flow
```
Guest clicks link → Creates WebRTC offer → Sends to signaling server → Host auto-accepts
```

### Problems
- No approval step
- Host couldn't reject unwanted guests
- No friend verification
- Same link caused role confusion

## Decision

We have implemented a **lambda-based peer approval flow** where:

1. **Host explicitly registers** their session with the signaling server
2. **Guests request to join** by sending a join request
3. **Host reviews and approves/rejects** each guest before WebRTC connection
4. **Friend status is checked** to help hosts make informed decisions
5. **IndexedDB tracks hosting status** to reliably distinguish host from guest

### New Flow
```
Host: Creates session → hostRegister → Waits for join requests
Guest: Opens link → guestJoin → Waits for approval
Lambda: Routes peerJoined to host
Host: Reviews request → Approves → Creates WebRTC offer → hostOffer
Guest: Receives offer → Creates answer → guestAnswer
Host: Receives answer → Completes WebRTC connection
```

## Implementation Details

### 1. Signaling Layer (`src/lib/signaling.ts`)

Added four new methods to the `SignalingService` class:

#### `hostRegister(boardId, gameId, peerName, publicKey)`
- Called when host creates a session
- Registers the host with the signaling server
- Stores host in lambda's `players` map with role "Host"

#### `guestJoin(boardId, peerName, publicKey, encryptionPublicKey)`
- Called when guest opens the shareable link
- Sends join request to signaling server
- Lambda adds guest to `players` map and notifies host

#### `hostOffer(connectionId, publicKey, offer, encryptionPublicKey, iv)`
- Called when host approves a guest
- Sends WebRTC offer to specific guest
- Lambda routes offer to the guest's connection

#### `guestAnswer(connectionId, publicKey, answer, iv)`
- Called when guest accepts the offer
- Sends WebRTC answer back to host
- Lambda routes answer to host's connection

### 2. Session Tracking (`src/lib/db.ts`)

Added new IndexedDB object store `hostedSessions` (DB version 4):

```typescript
interface HostedSession {
    boardId: string;      // Primary key
    gameId: string;
    createdAt: number;
    maxPlayers: number;
}
```

**Methods:**
- `markAsHosting(boardId, gameId, maxPlayers)` - Called when "Play Session" clicked
- `isHosting(boardId)` - Checks if user is hosting this board
- `cleanupOldHostedSessions()` - Removes sessions older than 24 hours

**Why This Works:**
- Persists across page refreshes
- Same link works for both host and guest
- No dependency on URL query parameters
- Automatic cleanup prevents stale data

### 3. Composable Updates (`src/composables/useGameSession.ts`)

#### New State
```typescript
// Pending join requests (for host approval)
const pendingJoinRequests = ref<PendingJoinRequest[]>([]);

// Track pending connections waiting for answers
const pendingConnections = ref<Map<string, Connection>>(new Map());

// Prevent duplicate registration
const hasRegistered = ref(false);
```

#### New Functions
- `isFriend(publicKey)` - Checks if guest is in friends list
- `onApprovePeer(request)` - Creates WebRTC offer and sends to guest
- `onRejectPeer(request)` - Removes guest from pending list
- `onJoinAsGuest()` - Guest sends join request to host

#### Auto-Registration Logic
```typescript
watch([signalingClient, boardSnapshot, boardId], async () => {
    const state = boardSnapshot.value;
    
    // Host: In hosting/preparation state with isInitiator
    if (state.matches('hosting') && state.context.isInitiator) {
        signalingClient.value.hostRegister(...)
    }
    // Guest: In joining state or not initiator
    else if (state.matches('joining') || !state.context.isInitiator) {
        signalingClient.value.guestJoin(...)
    }
})
```

#### Message Handlers
- **`peerJoined`**: Adds guest to `pendingJoinRequests` for host approval
- **`offer`**: Guest creates connection, accepts offer, sends answer
- **`answer`**: Host applies answer to pending connection

### 4. UI Updates

#### `PreparationPhase.vue`
Added "Join Requests" card displaying:
- Guest name
- Truncated public key (for verification)
- "Friend" badge if guest is in friends list
- "Approve" and "Reject" buttons

Features:
- Automatically checks friend status when requests appear
- Real-time updates as guests join
- Matches existing design system

#### `BoardView.vue`
- Fixed missing `ActivePhase` import
- Added props: `pendingJoinRequests`, `isFriend`, `onApprovePeer`, `onRejectPeer`
- Checks `db.isHosting(boardId)` to determine role on mount

#### `GameCardView.vue`
- Calls `db.markAsHosting()` when "Play Session" clicked
- Ensures host is tracked before navigation

### 5. Lambda Updates (`lambdas/onMessage.js`)

Added handlers for new message types:

#### `hostRegister`
```javascript
players.set(connectionId, {
    role: 'Host',
    boardId,
    gameId,
    peerName,
    publicKey
});
```

#### `guestJoin`
```javascript
players.set(connectionId, {
    role: 'Guest',
    boardId,
    peerName,
    publicKey,
    encryptionPublicKey
});

// Notify host
const hostConnection = findHost(boardId);
sendToConnection(hostConnection, {
    type: 'peerJoined',
    from: connectionId,
    peerName,
    publicKey,
    encryptionPublicKey
});
```

#### `hostOffer` & `guestAnswer`
Routes offers and answers between specific connections based on `connectionId`.

## Consequences

### Positive

1. **Enhanced Security**: Hosts can verify and approve each guest before connection
2. **Friend Integration**: Hosts can see if guests are in their friends list
3. **Better UX**: Clear approval flow with visual feedback
4. **Reliable Role Detection**: IndexedDB ensures correct host/guest identification
5. **Same Link Works**: Both host and guest can use the same shareable link
6. **Scalable**: Lambda-based routing supports multiple concurrent sessions
7. **Persistent State**: IndexedDB survives page refreshes

### Negative

1. **Extra Step**: Guests must wait for host approval (intentional trade-off)
2. **Database Migration**: Requires DB version bump to 4
3. **More Complex Flow**: Additional message types and state management
4. **Lambda Dependency**: Requires signaling server for all connections

### Neutral

1. **Breaking Change**: Old sessions won't work with new flow (acceptable for dev)
2. **Manual Cleanup**: Old hosted sessions cleaned up after 24 hours
3. **State Machine Dependency**: Relies on board machine states for role detection

## Migration Path

### For Existing Users
1. Clear browser data to reset IndexedDB to version 4
2. Create new game sessions (old sessions incompatible)
3. No data loss as sessions are ephemeral

### For Developers
1. Update signaling server to handle new message types
2. Deploy lambda changes before client changes
3. Test with multiple browsers to verify host/guest roles

## Verification

### Test Scenarios

1. **Host Creates Session**
   - ✅ Session marked in IndexedDB
   - ✅ `hostRegister` sent to signaling server
   - ✅ Host appears in lambda's players map

2. **Guest Joins**
   - ✅ `guestJoin` sent to signaling server
   - ✅ Host receives `peerJoined` message
   - ✅ Join request appears in host's UI

3. **Host Approves**
   - ✅ WebRTC offer created and sent
   - ✅ Guest receives offer
   - ✅ Guest creates answer and sends back

4. **Connection Established**
   - ✅ Host receives answer
   - ✅ WebRTC connection completed
   - ✅ Both can exchange game messages

5. **Game Start**
   - ✅ Host clicks "Launch Protocol"
   - ✅ `START_GAME` sent via WebRTC
   - ✅ Guest receives and processes message
   - ✅ Both transition to game phase

## Related Documents

- Implementation Walkthrough: `brain/63056b27-65ea-4ac7-ac6e-90f909750632/walkthrough.md`
- Task Breakdown: `brain/63056b27-65ea-4ac7-ac6e-90f909750632/task.md`

## References

- WebRTC Signaling: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
- IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- AWS Lambda WebSocket API: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html
