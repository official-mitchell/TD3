# TD3 — Tactical Drone Defense Dashboard
## Product Requirements Document · v2.0

> **For:** Allen Control Systems (Bullfrog Platform) — Portfolio Demo  
> **Deployment Target:** Vercel (Public)  
> **Updated:** March 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Models](#3-data-models)
4. [API Reference](#4-api-reference)
5. [Feature Specifications](#5-feature-specifications)
6. [State Management](#6-state-management)
7. [PWA Specification](#7-pwa-specification)
8. [Development Phases](#8-development-phases)
9. [Stretch Features](#9-stretch-features)
10. [UI Routing & Layout](#10-ui-routing--layout)
11. [Environment Variables](#11-environment-variables)
12. [Key Milestones](#12-key-milestones)

---

## 1. Overview

TD3 is a publicly deployable, browser-based PWA simulating the operator interface of Allen Control Systems' Bullfrog semi-autonomous counter-drone system. It is a frontend portfolio piece for a junior fullstack engineer targeting a frontend role, demonstrating real-time data handling, interactive map visualization, state management, and offline resilience.

### 1.1 Problem Statement

Demonstrate production-grade frontend competencies — real-time WebSocket integration, complex state management, PWA offline support, map/data visualization — in a domain-specific (defense tech) mock application that mirrors Bullfrog's core operator workflows.

### 1.2 Key Assumptions

- All drone telemetry is simulated on the backend; no real hardware integration.
- The XM914E1 30mm cannon is the modeled weapon platform (2,000m effective range, 200 RPM burst fire).
- Primary deployment: Vercel (frontend) + Render (backend) + MongoDB Atlas (database).
- AWS EKS / S3 / CloudFront are optional stretch infrastructure.
- Docker Compose is the local dev environment; Kubernetes is stretch.

### 1.3 Success Criteria

| Metric | Target |
|---|---|
| Live public URL (Vercel) | Accessible without auth |
| WebSocket telemetry loop | < 500ms update latency (simulated) |
| Map drone icons update | Real-time, status-color-coded |
| Offline capability | Last-known state accessible when disconnected |
| FIRE engagement flow | Full cycle: Detect → Identify → Confirm → Engage → Destroyed |
| PWA installable | `manifest.json` + service worker passing Lighthouse |
| Mobile responsive | Functional on tablet viewport (768px+) |

---

## 2. Tech Stack

### 2.1 Monorepo

| Tool | Notes |
|---|---|
| Nx Monorepo | `apps/frontend`, `apps/backend`, `libs/shared-types` |
| TypeScript | Strict mode; shared types via `libs/` |
| Bundler | Vite (frontend) |
| CI/CD | GitHub Actions → Vercel (frontend) / Render (backend) |
| Package Manager | npm |

### 2.2 Frontend

| Library | Role |
|---|---|
| React 18 + TypeScript | UI framework |
| Material UI (MUI) | Component system, theming |
| React Router | View routing (`/dashboard`, `/history`) |
| Zustand + Immer.js | Global state management; safe nested state mutations |
| Socket.IO Client | WebSocket connection, auto-reconnect, event-based messaging |
| Leaflet.js | Central interactive map component |
| D3.js | Telemetry gauges: speed, altitude, threat level, engagement arcs |
| Workbox | Service worker, caching strategies, Background Sync API |

### 2.3 Backend

| Library | Role |
|---|---|
| Node.js + Express.js | HTTP server, REST API |
| Morgan | Request logger middleware |
| Socket.IO Server | WebSocket server, telemetry emitter |
| Mongoose | MongoDB ODM, schema validation |
| MongoDB Atlas | Managed cloud database |

### 2.4 Infrastructure

| Service | Purpose | Priority |
|---|---|---|
| Docker + Docker Compose | Local containerized dev (frontend, backend, MongoDB) | **Required** |
| Vercel | Frontend deployment, native Nx support, auto CD from GitHub | **Required** |
| Render | Backend Node.js deployment, CD from GitHub | **Required** |
| MongoDB Atlas | Cloud MongoDB, accessible from both Vercel + Render | **Required** |
| AWS S3 + CloudFront | Static asset CDN, PWA manifest/SW files | Stretch |
| AWS EKS | Kubernetes orchestration for scaling | Stretch |
| AWS DocumentDB | Managed MongoDB-compatible DB (EKS path) | Stretch |

---

## 3. Data Models

### 3.1 Drone

| Field | Type | Values / Notes |
|---|---|---|
| `droneId` | `string` | Unique identifier (e.g. `QUAD-001`, `FIXED-001`) |
| `droneType` | `enum` | `Quadcopter` \| `FixedWing` \| `VTOL` \| `Unknown` |
| `status` | `enum` | `Detected` → `Identified` → `Confirmed` → `Engagement Ready` → `Hit` → `Destroyed` |
| `position` | `object` | `{ lat: number, lng: number, altitude: number }` |
| `speed` | `number` | km/h |
| `heading` | `number` | 0–360 degrees |
| `threatLevel` | `number` | 0.0–1.0 normalized |

### 3.2 Weapon Platform

| Field | Type | Notes |
|---|---|---|
| `position` | `object` | `{ lat: number, lng: number }` |
| `heading` | `number` | Current turret bearing |
| `isActive` | `boolean` | Operational status |
| `ammoCount` | `number` | Simulated rounds remaining |
| `killCount` | `number` | Confirmed engagements |

### 3.3 Telemetry Log (MongoDB)

| Field | Type | Notes |
|---|---|---|
| `timestamp` | `Date` | ISO 8601 |
| `droneId` | `string` | Reference to drone |
| `position` | `object` | Snapshot at log time |
| `status` | `string` | Status at log time |
| `engagementOutcome` | `string \| null` | `Hit` \| `Missed` \| `Destroyed` \| `null` |

---

## 4. API Reference

### 4.1 REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/drones` | Return all active drones from MongoDB |
| `GET` | `/api/drones/:droneId` | Return specific drone by ID |
| `GET` | `/api/drones/:droneId/history` | Return engagement history for a drone |
| `GET` | `/api/platform/status` | Return current weapon platform state |
| `POST` | `/api/drones/test-types` | Spawn test drones (dev only) |

### 4.2 WebSocket Events (Socket.IO)

| Direction | Event | Payload |
|---|---|---|
| Server → Client | `drone:update` | `IDrone` object with latest telemetry |
| Server → Client | `drone:status` | `{ droneId, status }` |
| Server → Client | `platform:status` | `IWeaponPlatform` object |
| Server → Client | `drone:destroyed` | `{ droneId, timestamp }` |
| Client → Server | `target:select` | `{ droneId }` |
| Client → Server | `engagement:fire` | `{ droneId, timestamp }` |

---

## 5. Feature Specifications

### 5.1 Map Interface

- Leaflet.js base map centered on weapon platform position.
- Range circles: 2km effective range (green), 5km max detection (amber).
- Grid overlay and sector markings.
- Drone icons color-coded by status: gray (Detected), yellow (Identified), orange (Confirmed), red (Engagement Ready).
- Drone icon rotates to reflect heading.
- Pulsing ring animation on currently locked target.
- Line of fire: dynamic bearing line from platform to selected target.
- Target acquisition cone rendered via D3 SVG overlay on Leaflet.
- Map tiles cached by Workbox service worker for offline use.

### 5.2 Drone Detail Panel

- Displays: Model (if known), Drone Type, Speed, Altitude, Threat Level, Distance, Bearing, Status, Last Updated.
- Updates in real-time via Zustand subscription to WebSocket store.
- Panel re-renders only when selected drone state changes.
- Confirmation badge appears when drone meets all Engagement Ready criteria.

### 5.3 Priority Target System

- Auto-selects nearest `Confirmed` drone as primary target.
- **Next / Previous** buttons allow operator override of auto-selection.
- Target selection persists across WebSocket update cycles (`selectedDrone` in Zustand).
- Turret icon heading on map auto-rotates toward selected target.

### 5.4 Engagement Flow

| Step | Trigger | UI Response |
|---|---|---|
| 1. Detected | Drone enters 5km radius | Gray icon appears on map |
| 2. Identified | Criteria met (type classified) | Icon turns yellow, detail panel populates |
| 3. Confirmed | Threat level + range threshold | Icon turns orange, added to Priority list |
| 4. Engagement Ready | Within 2km + confirmed | Icon turns red, FIRE button activates |
| 5. Fire | Operator presses FIRE | Burst animation, 200–300ms delay simulation |
| 6. Hit | Probability calc resolves true | Icon flashes, status badge updates |
| 7. Destroyed | Engagement confirmed | Icon fades and is removed from map |

### 5.5 FIRE Button

- Disabled unless a drone is in `Engagement Ready` status.
- Triggers `engagement:fire` WebSocket event to backend.
- Short engagement delay (200–300ms) simulates turret adjustment time (XM914E1: 2–3 round burst).
- After engagement, auto-advances to next queued target.
- Disabled again until next target is ready.

### 5.6 Status Dashboard (Side Panel)

- Weapon system: `XM914E1` | Unit: `3rd Marine Brigade` (simulated label).
- Platform coordinates (lat/lng) and current heading.
- Ammo count (simulated), turret status (`Operational` / `Low Ammo` / `Offline`).
- Kill counter: Drones Detected / Identified / Engaged / Destroyed.
- All values update in real-time via Zustand.

### 5.7 Connectivity Heartbeat

- WebSocket heartbeat ping every 5 seconds.
- Visual status indicator in header: `Connected` (green) / `Degraded` (amber) / `Offline` (red).
- On disconnect: last-known state preserved via IndexedDB; map freezes with offline banner.
- Auto-reconnect handled by Socket.IO client with exponential backoff.

---

## 6. State Management

### 6.1 Zustand Store Structure

| Store Slice | Key State | Key Actions |
|---|---|---|
| Drone Data | `drones: Map<string, IDrone>` | `updateDrone()`, `removeDrone()`, `clearDrones()` |
| Target Selection | `selectedDrone: string \| null` | `setSelected()`, `nextTarget()`, `prevTarget()` |
| Platform Status | `platformStatus: IWeaponPlatform` | `updatePlatform()` |
| Connection | `connectionStatus: Connected \| Degraded \| Offline` | `setConnectionStatus()` |
| Engagement Log | `log: EngagementRecord[]` | `appendLog()`, `clearLog()` |

> Immer.js middleware applied to Zustand for safe nested state mutations (drone position objects).

### 6.2 WebSocket → State Flow

- Socket.IO client establishes connection on app mount (`useEffect`).
- Incoming `drone:update` events call Zustand `updateDrone()` action.
- Zustand notifies subscribed React components via shallow equality check.
- Outbound events (`target:select`, `engagement:fire`) dispatched from UI action handlers.

---

## 7. PWA Specification

### 7.1 Manifest

- `name`: Tactical Drone Defense Dashboard
- `short_name`: TD3
- `display`: `fullscreen`
- `theme_color`: `#0F3460` (navy)
- Custom ACS-style icons (192px, 512px) for home screen install.
- Splash screens for mobile compatibility.

### 7.2 Workbox Caching Strategy

| Asset Type | Strategy | Notes |
|---|---|---|
| Static UI assets (JS, CSS, fonts) | Cache First | Precached on install |
| API responses (`/api/*`) | Network First | Falls back to cache on offline; max 50 entries, 5min TTL |
| Map tiles (Leaflet) | Cache First | Essential for offline map display |
| Icon sets | Cache First | Precached |

### 7.3 Offline Behavior

- Background Sync API queues missed `engagement:fire` commands in IndexedDB for retry on reconnect.
- IndexedDB stores last 500 telemetry log entries for offline review.
- App displays offline banner; map frozen at last-known state.
- Heartbeat indicator turns red; side panel shows stale-data timestamp.

---

## 8. Development Phases

> Items marked ✅ are complete. Items marked ☐ are pending.

### Phase 1: Infrastructure — ✅ COMPLETE

#### 1.1 Monorepo Setup
- ✅ Nx workspace initialized (`apps/frontend`, `apps/backend`)
- ✅ TypeScript strict config with `tsconfig.base.json`
- ✅ Shared `libs/` directory for cross-app types
- ✅ GitHub Actions CI pipeline configured

#### 1.2 Docker
- ✅ Frontend Dockerfile
- ✅ Backend Dockerfile
- ✅ `docker-compose.yml` (frontend + backend + MongoDB)
- ✅ Inter-container networking configured
- ✅ `mongo-init.js` seed script

---

### Phase 2: Backend Core — ✅ COMPLETE

#### 2.1 Express Server
- ✅ Express server with Morgan, CORS, body-parser, error middleware
- ✅ REST routes: `/api/drones`, `/api/platform/status`, `/api/drones/:id/history`
- ✅ Static file serving

#### 2.2 Data Layer
- ✅ Mongoose Drone schema with all fields + validation
- ✅ Mongoose WeaponPlatform schema
- ✅ MongoDB Atlas connection + authentication

#### 2.3 WebSocket + Telemetry Simulation
- ✅ Socket.IO server initialized on Express
- ✅ Drone telemetry simulation script (randomized position, speed, heading)
- ✅ `drone:update` emitter on interval (emit to all connected clients)
- ✅ `platform:status` broadcaster
- ✅ Distance and bearing calculations from platform to each drone
- ✅ 2km engagement range detection logic

---

### Phase 3: Frontend — Map + State (IN PROGRESS)

#### 3.1 Project Setup
- ✅ React + TypeScript app via Nx Vite preset
- ☐ Material UI configured with dark military theme
- ☐ React Router: routes for `/dashboard` and `/history`

#### 3.2 Zustand Stores
- ☐ `DroneStore` with `Map<string, IDrone>`, Immer middleware
- ☐ `TargetSelectionStore` with `selectedDrone`, `nextTarget()`, `prevTarget()`
- ☐ `PlatformStore` with `platformStatus` + `updatePlatform()`
- ☐ `ConnectionStore` with heartbeat state + `setConnectionStatus()`
- ☐ `EngagementLogStore` with `appendLog()` + `clearLog()`

#### 3.3 WebSocket Client
- ☐ Socket.IO client hook (`useSocket`) on app mount
- ☐ `drone:update` handler → Zustand `updateDrone()`
- ☐ `platform:status` handler → Zustand `updatePlatform()`
- ☐ `drone:destroyed` handler → remove from store + append log
- ☐ Heartbeat ping/pong every 5s → update `ConnectionStore`
- ☐ Auto-reconnect with exponential backoff configured

#### 3.4 Leaflet Map
- ☐ Base map component, centered on platform coordinates
- ☐ Platform marker with custom XM914E1 icon + heading indicator
- ☐ 2km effective range circle (green) + 5km max detection (amber)
- ☐ Grid overlay + sector markings
- ☐ Drone markers from `DroneStore`, color-coded by status
- ☐ Drone icon rotates to heading value
- ☐ Pulsing ring on currently selected (locked) target
- ☐ Line of fire: SVG line from platform bearing to selected drone
- ☐ D3 target acquisition cone overlay

---

### Phase 4: Frontend — Controls + Engagement (PENDING)

#### 4.1 Priority Target System
- ☐ Target list panel rendering from `DroneStore` (Confirmed + Engagement Ready only)
- ☐ Target cards: ID, type, distance, bearing, altitude, speed, status badge
- ☐ Target selection persists across WebSocket updates (stable `selectedDrone`)
- ☐ Auto-select nearest Confirmed drone on first load / after engagement
- ☐ Next / Previous button navigation through target queue

#### 4.2 FIRE Button + Engagement Sequence
- ☐ FIRE button disabled unless `selectedDrone.status === 'Engagement Ready'`
- ☐ On FIRE: emit `engagement:fire` via Socket.IO
- ☐ Frontend burst animation (200–300ms delay)
- ☐ Receive `drone:destroyed` or `hit:miss` event from backend
- ☐ Hit: fade icon + update status → Destroyed, append to EngagementLog
- ☐ Miss: flash icon + status reverts, operator can re-fire
- ☐ After engagement: auto-advance to next queued target

#### 4.3 Backend: XM914E1 Engagement Logic
- ☐ Engagement probability calculation (range, speed, threat level inputs)
- ☐ Burst fire mechanics: 2–3 rounds, 200 RPM simulation
- ☐ Ammo decrement on fire event
- ☐ Respond with `drone:hit` or `drone:missed` event to client
- ☐ Update MongoDB telemetry log with engagement outcome

---

### Phase 5: D3 Visualizations + Drone Behavior

#### 5.1 D3 Telemetry Gauges
- ☐ Speed gauge widget for selected drone
- ☐ Altitude indicator for selected drone
- ☐ Threat level bar (0–1 normalized, color gradient)
- ☐ Engagement probability readout

#### 5.2 Enhanced Drone Behavior
- ☐ Purpose-driven movement (approach vector toward platform)
- ☐ Evasive maneuver patterns post-near-miss
- ☐ Swarm formation logic (V-formation or spread)
- ☐ Threat-level escalation as drone closes range

---

### Phase 6: PWA + Offline

- ☐ Workbox service worker configured (Cache First for static, Network First for API)
- ☐ `manifest.json` with ACS branding, icons, fullscreen mode
- ☐ IndexedDB setup: store last 500 telemetry entries
- ☐ Background Sync API: queue `engagement:fire` commands during offline
- ☐ Map tile caching (Leaflet tile layer precache)
- ☐ Offline banner UI component triggered by `ConnectionStore`
- ☐ Lighthouse PWA audit passing (installable, offline, icons)

---

### Phase 7: Deployment

#### 7.1 Core Deployment (Vercel + Render + Atlas)
- ☐ MongoDB Atlas cluster configured with IP whitelist for Render + Vercel
- ☐ Environment variables: `MONGO_URI`, `SOCKET_URL` set in Render + Vercel
- ☐ Render: Node.js backend deployed, CD from GitHub `main` branch
- ☐ Vercel: React frontend deployed, Nx frontend path specified
- ☐ WebSocket URL in frontend env var pointing to Render backend
- ☐ End-to-end WebSocket test in deployed environment
- ☐ Public URL verified: accessible without auth

#### 7.2 Stretch: AWS Infrastructure
- ☐ `[STRETCH]` AWS S3 bucket for static assets + PWA SW files
- ☐ `[STRETCH]` CloudFront CDN in front of S3
- ☐ `[STRETCH]` AWS EKS cluster for containerized backend
- ☐ `[STRETCH]` Kubernetes ConfigMaps + Secrets for env vars
- ☐ `[STRETCH]` ClusterIP service (backend pods) + LoadBalancer (frontend)
- ☐ `[STRETCH]` AWS DocumentDB as MongoDB-compatible managed DB

---

## 9. Stretch Features

| Feature | Description | Priority |
|---|---|---|
| Engagement History View | React Router `/history` route, table of all engagement records from MongoDB | High |
| IFF System | Friend/foe identification icons, authorization levels, friendly drone coordination | Medium |
| 3D Map View | Three.js or Cesium.js elevation-aware drone tracking | Low |
| Weather Effects | Wind/visibility modifiers affecting engagement probability | Low |
| Replay System | Playback of stored telemetry log sessions | Low |
| Multi-Platform | Second weapon platform on map, coordinated targeting | Low |
| AI Targeting Assist | Predictive intercept point calculation overlay | Low |
| E2E Tests | Cypress user flow tests for engagement sequence | Medium |
| Unit Tests | Zustand store + WebSocket handler Jest coverage | Medium |

---

## 10. UI Routing & Layout

### 10.1 Routes

| Route | Component | Description |
|---|---|---|
| `/` | Redirect | → `/dashboard` |
| `/dashboard` | `DashboardView` | Main operational view (map + panels) |
| `/history` | `HistoryView` | Engagement history table (stretch) |

### 10.2 Dashboard Layout

- **Left sidebar:** Weapon system status panel + connectivity heartbeat.
- **Center:** Leaflet map (~60% viewport width).
- **Right sidebar:** Priority target list + drone detail panel + D3 gauges.
- **Bottom bar:** FIRE button + Next/Previous controls + engagement log feed.
- **Header:** TD3 branding, connection status indicator, nav links.
- **Responsive:** Sidebars collapse to drawers/modals at 768px breakpoint.

---

## 11. Environment Variables

| Variable | App | Description |
|---|---|---|
| `VITE_SOCKET_URL` | Frontend | WebSocket server URL (Render backend) |
| `VITE_API_BASE_URL` | Frontend | REST API base URL |
| `MONGO_URI` | Backend | MongoDB Atlas connection string (via Render secret) |
| `PORT` | Backend | Express server port (default 3000) |
| `CORS_ORIGIN` | Backend | Allowed frontend origin (Vercel URL) |
| `NODE_ENV` | Backend | `development` \| `production` |

---

## 12. Key Milestones

| Milestone | Phase Complete When... |
|---|---|
| M1 — Infrastructure ✅ | Docker Compose running frontend + backend + MongoDB locally |
| M2 — Backend Core ✅ | WebSocket telemetry simulation emitting + REST endpoints responding |
| M3 — Map + State | Leaflet map rendering live drone icons from Zustand + WebSocket |
| M4 — Engagement Cycle | Full FIRE → Hit/Destroyed flow working end-to-end |
| M5 — PWA + Offline | Workbox passing Lighthouse audit; offline mode shows last-known state |
| M6 — Deployed Public | Live Vercel URL functional with Render backend + Atlas DB |
| M7 — Polish | D3 gauges, drone swarm behavior, FIRE animations complete |

---

*TD3 — Tactical Drone Defense Dashboard · PRD v2.0 · March 2026*
