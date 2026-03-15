# Mykoboard: Rust & WASM Integration Guide

This guide details how to develop game engines in Rust and integrate them with the Mykoboard platform using WebAssembly (WASM).

## 1. Project Initialization

We recommend using `wasm-pack` for building and packaging Rust code for the browser.

### Create a new Rust project:
```bash
cargo new --lib my-game-engine
cd my-game-engine
```

### Configure `Cargo.toml`:
```toml
[package]
name = "my-game-engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
tsify = "0.4.5" # Optional: for auto-generating TS definitions
```

## 2. Deterministic State Machine

The core of your game logic should reside in a deterministic Rust struct. Determinism is critical for Mykoboard's Ledger system.

```rust
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct GameState {
    pub score: u32,
    pub turn: u32,
    players: Vec<String>,
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new(player_ids: Vec<String>) -> GameState {
        GameState {
            score: 0,
            turn: 0,
            players: player_ids,
        }
    }

    pub fn apply_action(&mut self, action_type: &str, payload: JsValue) -> Result<(), JsValue> {
        // Deterministic logic based on action_type
        match action_type {
            "INCREMENT_SCORE" => {
                self.score += 1;
                self.turn += 1;
            },
            _ => return Err(JsValue::from_str("Unknown action")),
        }
        Ok(())
    }
}
```

## 3. Ledger Integration (JS Bridge)

In the Vue/React frontend, you will synchronize the WASM state with the Mykoboard ledger.

```typescript
import init, { GameState } from 'my-game-engine-wasm';
import { LedgerEntry } from '@mykoboard/integration';

async function syncWithLedger(ledger: LedgerEntry[]) {
    await init(); // Initialize WASM
    
    // 1. Create initial state
    const engine = new GameState(["player1", "player2"]);
    
    // 2. Replay all ledger actions
    ledger.forEach(entry => {
        const { type, payload } = entry.action;
        engine.apply_action(type, payload);
    });
    
    return engine;
}
```

## 4. Non-Blocking Execution (Web Workers)

For complex games, run the WASM engine in a Web Worker to keep the UI responsive.

**worker.ts:**
```typescript
import init, { GameState } from 'my-game-engine-wasm';

self.onmessage = async (e) => {
    const { action, ledger } = e.data;
    await init();
    // Replay logic here -> postMessage(result)
};
```

## 5. Local-First Persistence

Since Mykoboard uses IndexedDB, you can serialize the WASM state and store it locally for quick resumes without replaying the entire ledger.

```rust
#[wasm_bindgen]
impl GameState {
    pub fn to_serialized(&self) -> JsValue {
        serde_wasm_bindgen::to_value(self).unwrap()
    }
}
```

---

> [!IMPORTANT]
> **No Main Server**: All WASM logic must run client-side.
> **Determinism**: Avoid using `SystemTime::now()` or unseeded `rand` inside the `apply_action` logic. Use the ledger timestamp or a seeded RNG if needed.
