# ADR-007: Multi-Topology P2P Mesh Network

## Status
Accepted

## Date
2026-03-16

## Context

The initial networking implementation relied solely on a "Star" topology, where all guest peers connected only to the host. While simple, this presented several issues:

1. **Host as Bottleneck**: All game state updates had to pass through the host, doubling latency for guest-to-guest interactions.
2. **Single Point of Failure**: If the host disconnects or has high latency, the entire session degrades for all peers.
3. **Bandwidth Stress**: The host was responsible for rebroadcasting every message to every other guest, leading to asymmetric bandwidth usage.

## Decision

We have implemented a **Multi-Topology Networking System** that allows dynamically switching between a traditional Star topology and a decentralized P2P Mesh.

### Topologies

1. **Star (Default)**: Guests connect only to the host. The host acts as the relay for all `broadcast()` operations.
2. **P2P Mesh**: Every peer attempts to establish a direct WebRTC connection with every other peer.

### Switching Mechanism
The topology mode is controlled by the Host via the `topologyMode` context property in the board machine. When 'Mesh' is selected:
- The Host identifies all guest-to-guest pairs.
- The Host sends `REQUEST_P2P_OFFER` to one guest in each pair, acting as a signaling mediator.
- Direct connections are established between guests without needing a central signaling server.

## Implementation Details

### 1. Signaling Mediation
Since guests cannot directly "see" each other on the AWS signaling server (which only tracks board IDs), the host acts as a bridge for the initial WebRTC handshake:
- **Phase A**: Host sends `REQUEST_P2P_OFFER` to Guest A.
- **Phase B**: Guest A sends an `OFFER` to the Host.
- **Phase C**: Host forwards the `OFFER` to Guest B.
- **Phase D**: Guest B sends an `ANSWER` back to the Host.
- **Phase E**: Host forwards the `ANSWER` back to Guest A.
- **Phase F**: Direct P2P connection is established.

### 2. Connectivity Updates
To maintain a global view of the network health, each peer broadcasts their local connections using the `CONNECTIVITY` message type in the `player` namespace. The Host aggregates these to form a `topologyMap`.

### 3. Mesh-Aware Broadcast
The `broadcast()` helper was updated to iterate over all `connectedPeers`. In a mesh network, this means messages are sent directly to the destination peer rather than hopping through the host.

## Consequences

### Positive
1. **Lower Latency**: Direct peer-to-peer data transfer for game actions.
2. **Reduced Host Load**: The host is no longer responsible for relaying bulk game data between guests.
3. **Visual Transparency**: The connection UI now renders the actual mesh linkage, allowing users to see network health between all peers.

### Negative
1. **Connection Overhead**: Establishing `N*(N-1)/2` connections can be resource-intensive for large groups.
2. **Complexity**: Signaling mediation logic and topology mapping add significant complexity to the session composable.

## Related Documents
- [Walkthrough](file:///home/dparadiz/.gemini/antigravity/brain/174c7a60-af3c-492c-bdd8-c35a5d2ac836/walkthrough.md)
