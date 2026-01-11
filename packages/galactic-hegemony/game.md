# Galactic Hegemony: P2P Browser Strategy

Galactic Hegemony is a decentralized, browser-based strategy game where players compete for dominance in a persistent galaxy. Built on a peer-to-peer (P2P) architecture, it eliminates the need for central authority during gameplay.

---

## 🏗️ Core Architecture

### WebRTC P2P Network
The backbone of the game's connectivity.
- **Signaling**: Lightweight handshake (via signaling server) to establish primary connections.
- **Data Channels**: Low-latency mesh topology for broadcasting actions.
- **Mesh Link**: Every player maintains a direct connection to every other peer.

### Consensus State Machine
The shared "brain" of the session.
- **Deterministic Logic**: Every client runs identical code. Peer A's action is validated by Peer B.
- **State Synchronization**: A lock-step protocol ensuring identical resource counts and board states.
- **Persistence**: Game progress saved to browser's **IndexedDB**, enabling session recovery.

---

## 💰 Economy: The Four Pillars

| Resource | Symbol | Purpose |
| :--- | :---: | :--- |
| **Credits** | 💰 | Trade, maintenance, and political bribes. |
| **Matter** | 🌑 | Construction of ships, outposts, and structures. |
| **Data** | 💾 | Research and upgrading the Tech Tree. |
| **Influence** | ⚛️ | Political maneuvers and claiming territory. |

---

## 🕹️ Gameplay Mechanics

### Worker Placement: The Hub
Players start with **3 Commanders**. They can be placed on specialized Sector Tiles:

#### 🏭 The Production Forge
- **Asteroid Mining**: Gain 3 Matter.
- **Tax Colony**: Gain 4 Credits.
- **Recruitment**: Pay 5 Credits to unlock an additional Commander.

#### 🔬 Research Labs
- **Data Siphon**: Gain 2 Data.
- **Tech Breakthrough**: Spend Data to advance on the Tech Tree.

#### 🌌 Exploration & Expansion
- **Deep Space Scan**: Draw 2 Planet Cards; keep one.
- **Warp Gate**: Move ships on the star map or colonize discovered planets.

#### ⚓ The Shipyard
- **Construct Frigate**: Spend Matter to place a ship.
- **Trade Route**: Spend Influence to connect controlled planets for recurring Credits.

### ☀️ The Dyson Dilemma (Global Event)
Every round, a "Dyson Ring" tile is available. 
- **Action**: Commit a worker to contribute to the structure.
- **Cost**: Lose that worker for the *next* round.
- **Reward**: Massive Victory Points and a permanent global buff.

---

## 🧬 Tech Tree: The Triple-Path

| Tier | 🔴 Military (Dreadnought) | 🟢 Economic (Consortium) | 🔵 Science (Architect) |
| :--- | :--- | :--- | :--- |
| **1** | **Plasma Thrusters**: +1 Warp movement. | **Orbital Refineries**: +1 Matter at Forge. | **Signal Boosters**: Draw 3 Planet Cards. |
| **2** | **Point Defense**: Opponents must pay 2 ⚛️ to remove ships. | **Tax Havens**: -2 Credits for Recruitment. | **Neural Links**: 1 free "Data Siphon" per round. |
| **3** | **Capital Ships**: Unlock Dreadnoughts (5 VP). | **Interstellar Bank**: +1 Credit per opponent trade route. | **Quantum Mapping**: Occupy occupied slots. |
| **Mastery** | **Galactic Enforcer**: Win all ties. | **Trade Monopoly**: Double Credit income. | **Singularity**: +10 VP & 2 Secret Objectives. |

> [!TIP]
> **Hybrid Synergy**: Reaching Tier 2 in two branches unlocks special perks like **Mercenary Corps** (use 💰 instead of 🌑 for ships) or **Automated Logistics** (workers return with 1 💰).

---

## 🪐 Planet Cards & Colonization

Planets must be **Scanned** (drawn) and then **Colonized** (using a Warp Gate action + Influence).

| Planet Type | Influence Cost | Typical VP | Main Benefit |
| :--- | :---: | :---: | :--- |
| 🌋 **Volcanic** | 2 ⚛️ | Low | Fast Matter Production |
| 💎 **Crystal** | 3 ⚛️ | Medium | Data & Research Boosts |
| 🌴 **Gaia** | 4 ⚛️ | High | Versatility & Extra Slots |
| 🛸 **Ancient** | 6 ⚛️ | Very High | Game-Changing Abilities |

---

## ⚔️ Tactical Superiority: Conflict

### Power Rating (P)
`P = Ship Count + Tech Bonuses + Tactics Card`
- **Frigate**: 1 Power | **Dreadnought**: 3 Power.

### Slot Bumping (Political Friction)
You may occupy an opponent's slot if you have more ships in the Home Sector.
- **Cost**: Pay the opponent 1 Credit bribe.
- **Result**: Their worker is "Bumped" to standby and returns to them next round.

### Planetary Conquest (Battles)
Occurs at the end of the round if ships share a system.
1. **Commit**: Secretly bid 💰 (mercenaries) or 💾 (electronic warfare).
2. **Tactics**: Reveal a card from the Tactics Deck.
3. **Resolution**: Higher Power wins. Loser retreats and suffers attrition (ship loss).

---

## 🖥️ User Interface & Player Board

### The Command Center
- **Resource Tracks**: 0-20 scale for 💰, 🌑, 💾, and ⚛️.
- **Commander Barracks**: 3 active slots + 2 locked slots.
- **Fleet Bay**: Designated areas for Frigates (6) and Dreadnoughts (2).
- **Active Tableau**: Slots for colonized Planet Cards with passive perks.

### Visual Layout Diagram
```text
___________________________________________________________
| [💰 CR] [🌑 MT] [💾 DT] [⚛️ INF]         [👑 VICTORY PTS] |
|_________________________________________________________|
|  COMMANDERS   |       TECH TREE TRACKS       |  PLANET   |
|     [ ]       |  (M) [1] [2] [3] [Mastery]   |  SLOT A   |
|     [ ]       |  (E) [1] [2] [3] [Mastery]   |           |
|     [ ]       |  (S) [1] [2] [3] [Mastery]   |___________|
|    {LOCKED}   |                              |  PLANET   |
|    {LOCKED}   |       FLEET SHIPYARD         |  SLOT B   |
|_______________|   [F][F][F]  [F][F][F]       |           |
|  TACTICS HAND |      [DREAD] [DREAD]         |           |
|_______________|______________________________|___________|
```

---

## 🏆 End Game & Scoring
The game ends when a player reaches **Mastery** or all **Planet Cards** are claimed.
- **Controlled Systems**: VP from occupied planets.
- **Trade Network**: Length and value of routes.
- **Scientific Legacy**: Total Data-based upgrades.
- **Secret Hegemony**: Points from hidden objective cards.