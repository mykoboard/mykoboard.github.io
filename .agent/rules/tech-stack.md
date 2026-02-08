---
trigger: always_on
---

# Technical Stack & Implementation Rules

## 1. Project Mission & Architecture
- **Purpose**: A decentralized "Multiplayer Tool" for board-style games. This is a reader/facilitator tool, not a social network.
- **Decentralization**: 
    - **No Central Gameplay Server**: All gameplay must be peer-to-peer.
    - **Identity**: Player identity is strictly tied to their **Web3 Wallet**.
    - **Data Persistence**: All persistent data must be stored locally in the user's **IndexedDB**.
- **Networking**: 
    - **WebRTC**: Primary protocol for in-game communication, building ledgers, and exchanging game events.
    - **Signaling**: Uses an AWS Free Tier stack (API Gateway, Lambda, DynamoDB). Note: Signaling is strictly for discovery/handshaking, not for hosting game state.

## 2. Core Environment
- **Runtime & Package Manager**: Use **Bun** exclusively. 
    - Commands: `bun install`, `bun test`, `bun run`. 
    - Avoid `npm`, `yarn`, or `pnpm`.
- **Primary Framework**: **Vue 3** utilizing **Composition API** and `<script setup>`.
- **Language**: **TypeScript** (Strict Mode).
    - Favor `interface` for object structures.
    - Avoid `any`; use `unknown` or generics for dynamic data.
    - Centralize shared types in `@/types`.

## 3. Project Structure (Microfrontends)
- **Hybrid Frontend**: The base application is Vue 3, but the architecture must support microfrontend components from other libraries (e.g., React demo components).
- **Directory Mapping**:
    - `src/`: Contains the main Vue 3 application shell.
    - `components/`: Contains the integration library and components from other frameworks.
- **Interoperability**: Ensure clean boundaries when integrating non-Vue components into the main Vue shell.

## 4. Implementation & Styling
- **Styling**: **Tailwind CSS** (Utility-first). 
    - Do not use `<style>` blocks in `.vue` files unless required for third-party library overrides.
- **Performance**: Use `v-if` over `v-show` for heavy components to maintain a lean DOM. Ensure components are tree-shakeable.
- **Deployment**: Automated via **GitHub Actions** workflows; hosted on **GitHub Pages**.