---
trigger: always_on
---

# Technical Specifications

## Environment & Frameworks
- **Runtime**: **Bun** (Use `bun install`, `bun test`, `bun run`).
- **Frontend**: **Vue 3** (Composition API, `<script setup>`).
- **MFE Pattern**: `src/` is the Vue shell; `components/` for React/Integration components.
- **Language**: **Strict TypeScript**. Export types from `@/types`. No `any`.

## Networking & Persistence
- **Communication**: **WebRTC** via DataChannels for game events and ledger sync.
- **Signaling**: AWS Free Tier (Lambda/DynamoDB) strictly for P2P handshakes.
- **Persistence**: **IndexedDB** for all local state.

## Styling & Deployment
- **Styling**: **Tailwind CSS** (Utility-first). No scoped styles.
- **CI/CD**: **GitHub Actions** deploying to **GitHub Pages**.