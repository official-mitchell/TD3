# TD3 — Presentation Layer PRD
## Technical Demo Enhancement: System Status Layer · Debug Mode · Systems View

> **Scope:** Three new surfaces layered onto the existing operator interface
> **Goal:** Make TD3 read as an engineered control system, not a styled prototype
> **Updated:** March 2026

---

## Assumptions

- Existing operator UI (map, panels, FIRE flow) is complete and stable
- Zustand stores for drones, platform, connection, and engagement log are available
- Socket.IO client hook (`useSocket`) is wired and emitting live events
- No new backend endpoints required — all three surfaces consume existing WS events + REST

---

## Success Criteria

- Lead engineer can inspect live system internals without reading source code
- Architecture logic is visible and interactive within the product itself
- Debug and Systems View modes do not disrupt operator state
- All three surfaces functional on a public Vercel URL

---

## 1. Mode Switcher

### 1.1 Header Toggle

- [ ] Add segmented 3-way toggle to Header: `OPERATOR` · `SYSTEMS VIEW` · `DEBUG`
- [ ] Store active mode in `UIStore` (`'operator' | 'systems-view' | 'debug'`)
- [ ] Persist active mode to `localStorage`; restore on reload
- [ ] `Shift+1/2/3` keyboard shortcuts cycle modes
- [ ] `OPERATOR` is default on first load

### 1.2 Mode Transition Rules

- [ ] Systems View → Operator restores exact pre-switch map viewport + selected drone
- [ ] Debug is an overlay over Operator — operator UI remains mounted and interactive
- [ ] Systems View is a full-page replacement — map + panels unmount while active
- [ ] Save `{ selectedDroneId, mapCenter, zoom }` to `UIStore` before leaving Operator

---

## 2. System Status Layer

Permanent sub-bar below the nav row. Always visible in all three modes.

### 2.1 Indicators

- [ ] **WS CONNECTION** — `connectionStore.status`: `LIVE` (green) / `DEGRADED` (amber) / `OFFLINE` (red)
- [ ] **TELEMETRY AGE** — `Date.now() - droneStore.lastUpdateAt` on 1s interval; amber >3s, red >8s
- [ ] **STALE TARGETS** — count of drones where `Date.now() - drone.lastUpdated > 5000ms`; hidden when 0
- [ ] **TRACKING MODE** — `targetStore.selectionMode`: `AUTO` / `MANUAL OVERRIDE`
- [ ] **ACTIVE TARGETS** — count of drones with status ≠ `Destroyed`
- [ ] **AMMO** — `platformStore.ammoCount`; amber <100, red <30

### 2.2 Store Additions Required

- [ ] Add `lastUpdateAt: number` to `droneStore`; write `Date.now()` on every `drone:update` receipt
- [ ] Add `selectionMode: 'auto' | 'manual'` to `targetStore`; set `'manual'` on Next/Prev press; reset to `'auto'` after engagement resolves

### 2.3 Layout Constraints

- [ ] Bar height ≤32px; no reflow on value change
- [ ] Fixed-width chips per indicator — no layout shift
- [ ] Readable at 768px viewport

---

## 3. Debug Mode

Fixed overlay drawer on top of Operator UI.

### 3.1 Layout

- [ ] Right-side fixed drawer, 320px wide, `z-index` above all operator panels
- [ ] 90% opacity — operator UI visible beneath
- [ ] Visibility driven by `UIStore.debugDrawerOpen`

### 3.2 DebugStore — `debugStore.ts`

- [ ] `eventRates: Record<string, number>` — rolling 10s window count per event name
- [ ] `eventLog: DebugLogEntry[]` — max 50 entries, FIFO; fields: `id, timestamp, event, payload, severity`
- [ ] `socketId: string | null`
- [ ] `reconnectAttempts: number`
- [ ] `lastHeartbeatAt: string | null`
- [ ] `latencyMs: number | null`
- [ ] `pendingFire: boolean`
- [ ] `lastFireAt: string | null`
- [ ] `lastOutcome: 'Hit' | 'Missed' | null`
- [ ] Actions: `recordEvent()`, `clearLog()`, `setSocketMeta()`, `recordHeartbeat()`
- [ ] Wire `recordEvent()` into `useSocket` for all Socket.IO events

### 3.3 Socket Health Section

- [ ] Connection status, Socket ID, reconnect attempts, last heartbeat (ISO + relative), latency (ms)
- [ ] Latency = round-trip of `heartbeat:ping` / `heartbeat:pong` (timestamp at emit, compute on receipt)

### 3.4 Event Rate Section

- [ ] 6 counters: `drone:update`, `drone:status`, `drone:destroyed`, `drone:hit`, `drone:missed`, `platform:status`
- [ ] Format: `EVENT_NAME: N/10s`
- [ ] Amber highlight when any counter is 0/10s (possible missed events)

### 3.5 Target State Section

- [ ] Selected drone ID, selection mode, selected drone status, `lastUpdated` (ISO + ms delta)
- [ ] Count of `Confirmed` drones, count of `Engagement Ready` drones

### 3.6 Engagement State Section

- [ ] Pending fire boolean, last fire timestamp, last outcome (`Hit` / `Missed` / `—`), kill count

### 3.7 Event Log Section

- [ ] Chronological feed, last 50 events, auto-scroll to latest
- [ ] Color: green (`drone:destroyed`, `drone:hit`), amber (`drone:missed`, reconnect), white (routine)
- [ ] Pause scroll on hover; `CLEAR` button resets log

---

## 4. Systems View

Full-page mode at `/systems-view`. Architecture explainer driven by live event data.

### 4.1 Architecture Diagram

- [ ] Four horizontal zones: `SIMULATION ENGINE` → `BACKEND CORE` → `FRONTEND LAYER` → `PERSISTENCE`
- [ ] Component nodes per zone:

| Zone | Nodes |
|---|---|
| SIMULATION ENGINE | Telemetry Generator, Drone State Machine, Engagement Engine |
| BACKEND CORE | Express REST API, Socket.IO Gateway, Normalization Service |
| FRONTEND LAYER | Zustand State Store, WebSocket Hook, Map + UI Panels |
| PERSISTENCE | MongoDB Atlas, TelemetryLog Model, Engagement History |

- [ ] SVG path lines connecting zones left-to-right
- [ ] Clickable node chips; selected node drives `UIStore.selectedSystemNode`

### 4.2 Data Pulse Animation

- [ ] Animated SVG circles travel along zone-connecting paths
- [ ] Pulse rate proportional to `debugStore.eventRates` for that event type
- [ ] Pulse colors: white (`drone:update`), orange (`drone:status`), red (`drone:destroyed`), green (`drone:hit`)
- [ ] Offline: animation pauses; paths render amber dashed
- [ ] Degraded: pulse rate slows; paths amber-tint

### 4.3 Component Click Panel

Right-side panel opens on node click with three sections:

- [ ] **WHAT IT DOES** — 1–2 sentence plain-language description
- [ ] **DATA IN / OUT** — input type → output type
- [ ] **FAILURE MODE** — what breaks here and how the system responds

Required failure mode content per node:

| Node | Failure Mode |
|---|---|
| Telemetry Generator | Bursty emission → frontend queue backup |
| Socket.IO Gateway | Connection drop → exponential backoff reconnect |
| Normalization Service | Out-of-order events (status after destroyed) |
| Zustand State Store | Stale entry if `drone:destroyed` event missed |
| WebSocket Hook | Reconnect restores orphaned selection state |
| MongoDB Atlas | Write failure during engagement → outcome not persisted |
| Engagement Engine | Hit probability range/speed clamp edge cases |

### 4.4 Scenario Overlay Toggle

- [ ] Toggle at top of Systems View: `NORMAL FLOW` / `DEGRADED FLOW`
- [ ] Driven by `UIStore.systemsViewOverlay`
- [ ] DEGRADED: slows pulses, stacks at Normalization node, amber indicators on affected nodes
- [ ] DEGRADED overlay is visual simulation only — does not affect live WebSocket data

### 4.5 Operator Mode Cross-Links

- [ ] Each node panel includes `VIEW IN OPERATOR MODE →` link
- [ ] On click: switches to Operator, applies 3s amber outline pulse animation to target element, then clears
- [ ] Add `highlightTarget: string | null` to `UIStore`; implement `useHighlight(targetId)` hook

Cross-link targets:

| Node | Operator Target |
|---|---|
| Zustand State Store | Target Panel |
| Socket.IO Gateway | Connection indicator in Header |
| Engagement Engine | FIRE button + engagement probability gauge |
| Telemetry Generator | Map drone icons |
| MongoDB Atlas | Engagement log feed in BottomBar |

### 4.6 Content Scope Constraint

- [ ] Explanations reference only 6 concepts: Event Ingestion, Normalization, State Ownership, Frontend Synchronization, Degraded Truth Handling, Operator Control Boundaries
- [ ] No library names, no infrastructure specifics in explainer copy

---

## 5. New Types

Add to shared types (or `uiStore.ts` if not using shared lib):

- [ ] `UIMode = 'operator' | 'systems-view' | 'debug'`
- [ ] `SelectionMode = 'auto' | 'manual'`
- [ ] `SystemsViewOverlay = 'normal' | 'degraded'`
- [ ] `DebugLogEntry = { id, timestamp, event, payload, severity: 'info' | 'warn' | 'alert' }`

---

## 6. New Files

```
src/
├── store/
│   ├── uiStore.ts
│   └── debugStore.ts
├── views/
│   └── SystemsView.tsx
├── components/
│   ├── debug/
│   │   └── DebugDrawer.tsx
│   └── systems/
│       ├── ArchitectureDiagram.tsx
│       └── NodeDetailPanel.tsx
└── hooks/
    └── useHighlight.ts
```

---

## 7. Acceptance Criteria

| Criteria | Test |
|---|---|
| Status Layer visible in all 3 modes | Toggle all modes; verify bar persists |
| Telemetry age → amber at 3s, red at 8s | Kill backend WS; observe timer |
| MANUAL OVERRIDE badge on Next/Prev press | Press Next; verify indicator |
| Debug overlay does not disrupt drone selection | Toggle debug; verify `selectedDroneId` unchanged |
| Event counters go amber when WS disconnected | Disconnect; all 6 counters → 0/10s amber |
| Systems View restores map state on return | Switch away and back; verify viewport + selection |
| Pulse rate reflects live event frequency | Compare at 1 drone vs. 5 drones |
| All 7 node panels show correct WHAT/DATA/FAILURE | Click each node |
| Cross-link highlights correct UI element | Click `VIEW IN OPERATOR MODE →` for all 5 targets |
| DEGRADED overlay visually distinct | Toggle; observe path/pulse change |
| Mode persists across hard refresh | Reload in each mode |

---

*TD3 Presentation Layer PRD · March 2026*
