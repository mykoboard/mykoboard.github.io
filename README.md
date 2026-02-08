# MyKoBoard 🎮

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)

**MyKoBoard** is a modern, peer-to-peer multiplayer board games platform built for the web. Experience classic games like Ludo and Tic-Tac-Toe with zero-latency communication and a premium interface.

## ✨ Features

- **P2P Multiplayer**: Real-time gameplay powered by WebRTC.
- **Dynamic Lobby**: Interactive slot selection and live signaling.
- **Secure Wallet Integration**: Cryptographically verified game sessions.
- **Mobile Responsive**: Play on any device with a modern browser.
- **Rich Visuals**: Premium designs with glassmorphism and smooth animations.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or bun

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mykoboard/mykoboard.github.io.git
   cd mykoboard.github.io
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack

- **Frontend Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Game MFEs**: React components via [Module Federation](https://module-federation.io/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Runtime**: [Bun](https://bun.sh/)
- **State Management**: [XState](https://xstate.js.org/)
- **Networking**: [WebRTC](https://webrtc.org/) (P2P)
- **Signaling**: AWS Free Tier (Lambda + DynamoDB)
- **Local Storage**: IndexedDB
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Type Safety**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)

## 🤝 Contributing

We love contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by the MyKoBoard Team.
