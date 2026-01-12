# MykoBoard: Technical Overview

## Objective
MykoBoard is a decentralized, serverless gaming and collaboration platform designed to provide a privacy-first, zero-infrastructure experience for users. By leveraging Peer-to-Peer (P2P) communication and cryptographic identities, it eliminates the need for traditional backend servers for game logic and data storage.

## Core Philosophical Intent: Decentralization
The project is built on the principle of **user sovereignty**. No central authority controls the game state or user data. This is achieved by:
- **P2P Communication**: Direct browser-to-browser data exchange.
- **Client-Side Identity**: Users own their identities via cryptographic wallets.
- **Serverless Hosting**: Distributed via GitHub Pages, with no centralized application server.

---

## Technology Stack

### Frontend & Architecture
- **React & TypeScript**: Robust, type-safe UI development.
- **Microfrontend (MFE)**: Implemented using **Vite Module Federation**. This allows different games (e.g., Planning Poker, Tic-Tac-Toe) to be developed, built, and deployed independently as remote modules.
- **XState**: Predictable state management for complex game lifecycles.
- **Shadcn UI & Tailwind CSS**: Premium, consistent design system with high-performance styling.

### Networking & Synchronization
- **WebRTC**: The backbone of real-time P2P data synchronization.
- **Game Ledger**: A sequential, immutable record of game actions (e.g., votes, moves) shared among peers. This ledger allows late-joiners to reconstruct the current state and ensures consistency across all nodes.
- **WebRTC Signaling**: An AWS-based signaling service (API Gateway + Lambda + DynamoDB) is provided for discovery convenience. It operates within the **AWS Free Tier**, ensuring zero-cost infrastructure for the service.

### Security & Identity
- **Crypto Wallet Integration**: Utilizes basic cryptographic wallet logic to manage user identities and sign ledger entries, ensuring authenticity without a central login system.
- **IndexedDB**: Persistent local storage for game sessions and history, keeping data on the user's device.

---

## Implementation Examples

The platform's architecture is validated through diverse implementations that demonstrate its flexibility in handling different state models:

### 1. Tic-Tac-Toe: Simple Deterministic P2P 
A classic "two-player, one-to-one" implementation. Since the game is purely deterministic, the ledger captures each move as an event. The synchronization logic is simple: the state is successfully reconstructed by replaying the moves.

### 2. Ludo: Host-Verified Multiplayer with Chance
Demonstrates a multi-user environment (up to 4 players) involving non-deterministic events (dice rolls). To prevent "luck manipulation" on the client side, the **Host Node** acts as the authority for generating and verifying random results, which are then committed to the shared ledger.

### 3. Planning Poker: Simultaneous Collaboration
Unlike turn-based games, Planning Poker involves simultaneous action where multiple users' states are hidden until a collective revelation. It utilizes the ledger to store "commitments" (votes) without exposing their values to peers until the host triggers the "reveal" event, demonstrating secure, real-time collaborative workflows.

---

## Infrastructure & Delivery
MykoBoard utilizes a modern, automated "Free Tier" infrastructure:
- **GitHub Hosting**: Source code managed on GitHub.
- **GitHub Actions**: Automated CI/CD pipelines for testing and building.
- **Security Scans**: Integrated lineage and vulnerability scanning via GitHub's security tools.
- **GitHub Pages**: Automated deployment and global delivery of the built application.

---

## Potential Use Cases
Beyond casual gaming, the MykoBoard architecture is a foundation for:

### 1. Secure Enterprise Collaboration
- **Encrypted Brainstorming**: Private, serverless whiteboards or sticky-note sessions.
- **Internal Voting**: Secure, anonymous polling for internal team decisions without third-party data exposure.

### 2. Educational Tools
- **Classroom Interaction**: Real-time quizzes or collaborative exercises where the instructor's laptop acts as the local hub.
- **Student Privacy**: Ensuring student data never leaves the local network environment.

### 3. Decentralized Toolkits
- **Estimation Tools**: As seen with Planning Poker, providing agile teams with no-account-needed utilities.
- **Shared Checklists**: Temporary, ad-hoc shared lists for event coordination or incident response.

### 4. Privacy-First "War Rooms"
- **Incident Response**: Ad-hoc, highly private coordination channels that leave no trace on corporate servers.
