# TD3 — Implementation Plan
## Agent Handoff Document · v2.0

**Purpose:** Sequential build instructions for a coding agent or developer. Read this entire document before writing any code. Each step declares its dependencies, deliverables, and acceptance criteria. Do not begin a step until all its declared dependencies are verified complete.

**Repo layout:** Nx monorepo at `td3/`. Frontend lives at `apps/frontend/`, backend at `apps/backend/`, shared types at `libs/shared-types/`.

---

## 0. Current State — Do Not Repeat

Phases 1 and 2 of the PRD are already complete. The following files exist in the repository and must not be overwritten or regenerated.

| Already Built | Location |
|---|---|
| Nx monorepo config | `nx.json`, `tsconfig.base.json`, `package.json` |
| Frontend React/Vite scaffold | `apps/frontend/` |
| Backend Express server, Morgan, CORS | `apps/backend/src/main.ts` |
| Mongoose Drone schema | `apps/backend/src/models/drone.model.ts` |
| Mongoose WeaponPlatform schema | `apps/backend/src/models/weapon-platform.model.ts` |
| REST routes | `apps/backend/src/routes/drone.routes.ts` |
| Socket.IO server and telemetry emitter | `apps/backend/src/services/socket-service.ts` |
| Distance and bearing calculations | `apps/backend/src/services/socket-service.ts` |
| Docker and `docker-compose.yml` | Repo root |
| MongoDB seed script | `mongo-init.js` |

Begin work at Step 1.

---

## 0.1 Canonical Types Reference

All TypeScript types are defined once in `libs/shared-types/src/index.ts` and imported everywhere else. Neither `apps/frontend` nor `apps/backend` may define their own versions of these types. The import path alias is `@td3/shared-types`.

**Type definitions to declare:**

1. `DroneType` — union of `Quadcopter`, `FixedWing`, `VTOL`, `Unknown`.
2. `DroneStatus` — ordered union of `Detected`, `Identified`, `Confirmed`, `Engagement Ready`, `Hit`, `Destroyed`.
3. `ConnectionStatus` — union of `Connected`, `Degraded`, `Offline`.
4. `EngagementOutcome` — union of `Hit`, `Missed`, `Destroyed`, or `null`.
5. `IPosition` — object with `lat: number`, `lng: number`, `altitude: number`.
6. `IDrone` — object with `droneId: string`, `droneType: DroneType`, `status: DroneStatus`, `position: IPosition`, `speed: number` (km/h), `heading: number` (0–360), `threatLevel: number` (0.0–1.0), `lastUpdated: string` (ISO 8601).
7. `IWeaponPlatform` — object with `position: { lat: number, lng: number }`, `heading: number`, `isActive: boolean`, `ammoCount: number`, `killCount: number`.
8. `ITelemetryLog` — object with `timestamp: string`, `droneId: string`, `position: IPosition`, `status: DroneStatus`, `engagementOutcome: EngagementOutcome`.
9. `IEngagementRecord` — object with `droneId: string`, `droneType: DroneType`, `timestamp: string`, `outcome` of `Hit`, `Missed`, or `Destroyed`, `distanceAtEngagement: number` in meters.

**Socket.IO payload interfaces to declare:**

10. `DroneUpdatePayload` — extends `IDrone`.
11. `DroneStatusPayload` — `droneId: string`, `status: DroneStatus`.
12. `DroneDestroyedPayload` — `droneId: string`, `timestamp: string`.
13. `TargetSelectPayload` — `droneId: string`.
14. `EngagementFirePayload` — `droneId: string`, `timestamp: string`.
15. `EngagementResultPayload` — `droneId: string`, `outcome: Hit | Missed`, `timestamp: string`.

---

## 1. Shared Types Library ✅

**Depends on:** Nothing. Run this step first.
**Output:** `libs/shared-types/src/index.ts` containing all types from section 0.1.

### 1.1 Scaffold the library

- [x] 1.1.1. Generate the library using the Nx JS library generator with `shared-types` as the name, `libs/shared-types` as the directory, no unit test runner, and `tsc` as the bundler.

- [x] 1.1.2. Confirm Nx has registered the path alias `@td3/shared-types` pointing to `libs/shared-types/src/index.ts` in `tsconfig.base.json`. Add it manually if Nx did not generate it.

### 1.2 Write the types

- [x] 1.2.1. Create `libs/shared-types/src/index.ts` and declare all 15 types and interfaces from section 0.1 exactly as specified.

- [x] 1.2.2. Export every type from the barrel. No type may be left unexported.

### 1.3 Update existing backend models

- [x] 1.3.1. Open `apps/backend/src/models/drone.model.ts` (or `backend/src/models/drone.model.ts`). Replace any locally defined type aliases or interfaces with imports from `@td3/shared-types`. Confirm the Mongoose schema fields mirror `IDrone` exactly — field names, types, and required constraints must match.

- [x] 1.3.2. Open `apps/backend/src/models/weapon-platform.model.ts` (or `backend/src/models/weapon-platform.model.ts`). Apply the same import replacement against `IWeaponPlatform`. Ensure `ammoCount` and `killCount` fields are present in the schema. Add them with defaults of `300` and `0` respectively if missing.

### 1.4 Acceptance criteria

- [x] 1.4.1. `npx nx build shared-types` completes with zero TypeScript errors.

- [x] 1.4.2. Adding `import { IDrone } from '@td3/shared-types'` to any file in `apps/frontend` or `apps/backend` (or `frontend`/`backend`) resolves without a module-not-found error.

- [x] 1.4.3. `npx nx build backend` completes with zero TypeScript errors after the model imports are updated.

---

## 2. Backend — Engagement Logic

**Depends on:** Step 1.
**Output:** Engagement event handling in `socket-service.ts`, a new `TelemetryLog` Mongoose model, and a working `GET /api/drones/:droneId/history` route.

**Phase 2 status:** 2.2 ✅ 2.3 ✅ 2.4 ✅ complete. 2.1 (engagement handler) pending. 2.5 acceptance criteria partially verifiable.

### 2.1 Engagement handler in `socket-service.ts` (pending — not yet implemented)

- [ ] 2.1.1. Inside the `socket.on('connection')` callback, register a listener for the `engagement:fire` event. The payload type is `EngagementFirePayload`.

- [ ] 2.1.2. On receiving `engagement:fire`, look up the target drone by `droneId` in the active in-memory drone map. If the drone is not found or its status is not `Engagement Ready`, emit no event and return early.

- [ ] 2.1.3. Calculate hit probability. The formula is: `baseProbability` of `0.85`, multiplied by `rangeFactor` which equals `1 minus (distanceMeters divided by 2000)` and degrades linearly to zero at maximum range, multiplied by `(1 minus (speedPenalty times 0.3))` where `speedPenalty` equals `drone.speed divided by 500`. Clamp the final value between 0 and 1.

- [ ] 2.1.4. Roll `Math.random()`. If the result is less than or equal to the calculated hit probability, process a hit: set the drone's in-memory status to `Hit`, emit a `drone:hit` event to all connected clients with the `droneId` and timestamp, wait 300 milliseconds, then set status to `Destroyed`, emit `drone:destroyed`, decrement the platform's `ammoCount` by 3, increment `killCount` by 1, write a `TelemetryLog` document with `engagementOutcome` of `Destroyed`, and remove the drone from the active simulation map.

- [ ] 2.1.5. If the roll exceeds hit probability, process a miss: emit `drone:missed` to all clients with the `droneId`, `outcome` of `Missed`, and timestamp. Write a `TelemetryLog` document with `engagementOutcome` of `Missed`. The drone remains active and continues its approach.

- [ ] 2.1.6. After every engagement resolution — hit or miss — emit a `platform:status` event to all clients with the updated `IWeaponPlatform` data.

### 2.2 `TelemetryLog` Mongoose model ✅

- [x] 2.2.1. Create `apps/backend/src/models/telemetry-log.model.ts` (or `backend/src/models/telemetry-log.model.ts`). Import `ITelemetryLog` from `@td3/shared-types`.

- [x] 2.2.2. Define a Mongoose schema matching `ITelemetryLog` exactly: `timestamp` as a required string, `droneId` as a required string, `position` as a sub-document with `lat`, `lng`, and `altitude` as numbers, `status` as a required string, and `engagementOutcome` as a string that defaults to `null`.

- [x] 2.2.3. Export the compiled model as `TelemetryLog`.

### 2.3 Engagement history REST route ✅

- [x] 2.3.1. In `apps/backend/src/routes/drone.routes.ts` (or `backend/src/routes/drone.routes.ts`), implement the handler for `GET /api/drones/:droneId/history`. It must query the `TelemetryLog` collection filtered by `droneId`, sorted by `timestamp` descending, limited to 50 records, and respond with the results as JSON.

- [x] 2.3.2. Add basic error handling — wrap the query in a try-catch and respond with HTTP 500 and a structured error body on failure.

### 2.4 Heartbeat handler ✅

- [x] 2.4.1. Inside the `socket.on('connection')` callback, register a listener for `heartbeat:ping`. On receipt, immediately emit `heartbeat:pong` back to the same socket. No payload is required in either direction.

### 2.5 Acceptance criteria

| ID | Criterion | Depends on | Status |
|----|-----------|------------|--------|
| 2.5.1 | `POST /api/drones/test-types` spawns at least three active drones. Verify via `GET /api/drones`. | Routes, createTestDrones | ☐ Verifiable now |
| 2.5.2 | Emit `engagement:fire` from a Socket.IO test client targeting one of the spawned drones. Confirm receipt of either `drone:hit` or `drone:missed` within 500 ms. | Step 2.1 (engagement handler) | ☐ Blocked |
| 2.5.3 | If `drone:hit` was received, confirm `drone:destroyed` follows within 350 ms. | Step 2.1 | ☐ Blocked |
| 2.5.4 | `GET /api/drones/:droneId/history` returns an array with at least one entry whose `engagementOutcome` is either `Destroyed` or `Missed`. | Step 2.1 (TelemetryLog populated on engagement) | ☐ Blocked |
| 2.5.5 | `GET /api/platform/status` returns a payload with `killCount` incremented by 1 and `ammoCount` decremented by 3 after a successful hit. | Step 2.1 | ☐ Blocked |
| 2.5.6 | Emitting `heartbeat:ping` causes the server to respond with `heartbeat:pong` on the same socket within 100 ms. | Step 2.4 | ☐ Verifiable now |

---

## 3. Frontend — Zustand Stores

**Depends on:** Step 1.
**Output:** Five store files in `apps/frontend/src/store/` (or `frontend/src/store/`), each exporting a typed Zustand hook.

### 3.1 Install dependencies ✅

- [x] 3.1.1. Install `zustand` and `immer` as production dependencies.

### 3.2 `droneStore.ts` ✅

- [x] 3.2.1. Create `apps/frontend/src/store/droneStore.ts` (or `frontend/src/store/droneStore.ts`). The state shape is a `Map<string, IDrone>` keyed by `droneId`.

- [x] 3.2.2. Apply Immer middleware so mutations to `state.drones` are written directly rather than via spread.

- [x] 3.2.3. Implement `updateDrone(drone: IDrone)` — sets or overwrites the entry at `drone.droneId` in the map.

- [x] 3.2.4. Implement `removeDrone(droneId: string)` — deletes the entry at the given key.

- [x] 3.2.5. Implement `clearDrones()` — clears the entire map.

- [x] 3.2.6. Implement `getSortedByDistance(platformLat: number, platformLng: number): IDrone[]` — filters the map to only drones with status `Confirmed` or `Engagement Ready`, converts to an array, and sorts ascending by Euclidean distance from the platform coordinates. Return the array.

- [x] 3.2.7. **Critical pitfall:** Never iterate a `Map` directly in JSX. Always call `Array.from(state.drones.values())` before any `.filter()` or `.map()` call. This is the root cause of the known target-list rendering bug.

### 3.3 `targetStore.ts` ✅

- [x] 3.3.1. Create `apps/frontend/src/store/targetStore.ts`. State holds `selectedDroneId: string | null`, initialized to `null`.

- [x] 3.3.2. Implement `setSelected(droneId: string | null)` — sets the selected drone directly.

- [x] 3.3.3. Implement `nextTarget(sortedIds: string[])` — advances the selection to the next entry in the sorted array, wrapping from last to first.

- [x] 3.3.4. Implement `prevTarget(sortedIds: string[])` — moves selection to the previous entry, wrapping from first to last.

- [x] 3.3.5. **This store must never be touched by telemetry update logic.** `selectedDroneId` is owned exclusively by user interaction and the `nextTarget`/`prevTarget` actions. WebSocket drone updates update `droneStore` only. This separation is what fixes the selection-persistence bug.

### 3.4 `platformStore.ts` ✅

- [x] 3.4.1. Create `apps/frontend/src/store/platformStore.ts`. State holds `platform: IWeaponPlatform | null`, initialized to `null`.

- [x] 3.4.2. Implement `updatePlatform(platform: IWeaponPlatform)` — replaces the platform state.

### 3.5 `connectionStore.ts` ✅

- [x] 3.5.1. Create `apps/frontend/src/store/connectionStore.ts`. State holds `status: ConnectionStatus` initialized to `Offline`, and `lastHeartbeat: number | null` initialized to `null`.

- [x] 3.5.2. Implement `setStatus(status: ConnectionStatus)` — sets the connection status.

- [x] 3.5.3. Implement `recordHeartbeat()` — sets `lastHeartbeat` to `Date.now()` and sets `status` to `Connected`.

### 3.6 `engagementLogStore.ts` ✅

- [x] 3.6.1. Create `apps/frontend/src/store/engagementLogStore.ts`. State holds `log: IEngagementRecord[]` initialized to an empty array.

- [x] 3.6.2. Implement `appendLog(record: IEngagementRecord)` — prepends the record to the front of the array and trims the array to a maximum of 200 entries.

- [x] 3.6.3. Implement `clearLog()` — replaces the array with an empty array.

### 3.7 Acceptance criteria

- [x] 3.7.1. All five store files compile with zero TypeScript errors when running `npx nx typecheck frontend`.

- [ ] 3.7.2. Calling `droneStore.updateDrone(testDrone)` followed by `droneStore.getSortedByDistance(lat, lng)` returns only drones with status `Confirmed` or `Engagement Ready`.

- [ ] 3.7.3. Calling `targetStore.setSelected('QUAD-001')` then triggering `droneStore.updateDrone(...)` with the same drone does not reset `targetStore.selectedDroneId`.

---

## 4. Frontend — WebSocket Hook

**Depends on:** Steps 1 and 3.
**Output:** `apps/frontend/src/hooks/useSocket.ts` — a single React hook that establishes the Socket.IO connection, routes all incoming events to their respective Zustand store actions, and manages heartbeat lifecycle.

### 4.1 Install dependencies ✅

- [x] 4.1.1. Install `socket.io-client` as a production dependency.

### 4.2 Hook implementation ✅

- [x] 4.2.1. Create `apps/frontend/src/hooks/useSocket.ts`. The hook must use a `useRef` to hold the Socket.IO client instance so it is not re-created on re-renders.

- [x] 4.2.2. Read the WebSocket server URL from `import.meta.env.VITE_SOCKET_URL`, with a fallback of `http://localhost:3333` for local development.

- [x] 4.2.3. Instantiate the Socket.IO client inside `useEffect` with reconnection enabled, initial reconnection delay of 1000ms, maximum delay of 10,000ms, and unlimited reconnection attempts.

- [x] 4.2.4. On `connect`: call `connectionStore.setStatus('Connected')`. Start the heartbeat interval.

- [x] 4.2.5. On `disconnect`: call `connectionStore.setStatus('Offline')`. Clear the heartbeat interval and watchdog timeout.

- [x] 4.2.6. On `connect_error`: call `connectionStore.setStatus('Degraded')`.

- [x] 4.2.7. On `drone:update` (and `droneUpdate` for backend compat): call `droneStore.updateDrone(payload)`. Also call `saveTelemetry(payload)` from the offline storage module (Step 14) when implemented.

- [x] 4.2.8. On `platform:status`: call `platformStore.updatePlatform(payload)`.

- [x] 4.2.9. On `drone:destroyed`: call `droneStore.removeDrone(payload.droneId)`.

- [x] 4.2.10. On `drone:hit`: call `engagementLogStore.appendLog(...)` with outcome `Hit`. Populate `droneType` from the current `droneStore` entry for that `droneId` before removing it, if available.

- [x] 4.2.11. On `drone:missed`: call `engagementLogStore.appendLog(...)` with outcome `Missed`.

- [x] 4.2.12. On `heartbeat:pong`: clear the watchdog timeout and call `connectionStore.recordHeartbeat()`.

### 4.3 Heartbeat logic ✅

- [x] 4.3.1. The heartbeat interval fires every 5,000ms. On each tick, emit `heartbeat:ping` and set a watchdog timeout of 12,000ms that calls `connectionStore.setStatus('Degraded')` if no `heartbeat:pong` arrives before it fires.

- [x] 4.3.2. On `heartbeat:pong`, clear the active watchdog timeout to prevent a false `Degraded` transition.

- [x] 4.3.3. The interval and watchdog timer must both be cleared in the `useEffect` cleanup function so there are no memory leaks when the component unmounts.

### 4.4 Mount the hook ✅

- [x] 4.4.1. Call `useSocket()` at the top level of `apps/frontend/src/App.tsx` so the connection is established once on app load. The hook return value is the socket ref, which can be passed down or accessed via a context if needed by child components (such as `BottomBar`).

### 4.5 Acceptance criteria ✅

- [x] 4.5.1. Open the app locally with the backend running. Within 5 seconds, `connectionStore.status` equals `Connected` (verify via React DevTools Zustand plugin or a temporary debug display).

- [x] 4.5.2. `droneStore.drones` starts populating with `IDrone` entries within 5 seconds of the connection being established.

- [x] 4.5.3. Shut down the backend process. Within 15 seconds (heartbeat interval plus watchdog timeout), `connectionStore.status` transitions to `Offline`.

- [x] 4.5.4. Restart the backend. The client reconnects automatically and `connectionStore.status` returns to `Connected` without a page reload.

---

## 5. Frontend — MUI Theme and Router

**Depends on:** Nothing (can run in parallel with Steps 3 and 4).
**Output:** `apps/frontend/src/theme.ts`, `apps/frontend/src/router.tsx`, and updated `apps/frontend/src/main.tsx`.

### 5.1 Install dependencies ✅

- [x] 5.1.1. Install `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, and `react-router-dom` as production dependencies.

- [x] 5.1.2. Install `@fontsource/jetbrains-mono` and import it in `main.tsx` to ensure consistent monospace typography across environments without relying on system fonts.

### 5.2 Dark military theme ✅

- [x] 5.2.1. Create `apps/frontend/src/theme.ts`. Use MUI `createTheme` with `mode: 'dark'`.

- [x] 5.2.2. Set the color palette as follows: `primary.main` is `#1E90FF` (electric blue), `secondary.main` is `#FF6B35` (amber-orange), `background.default` is `#0A0E1A` (near-black navy), `background.paper` is `#0F1929` (dark card surface), `text.primary` is `#E8F4FD`, `text.secondary` is `#7B9BB5`, `success.main` is `#00C853`, `warning.main` is `#FFB300`, `error.main` is `#FF1744`.

- [x] 5.2.3. Set the typography `fontFamily` to `JetBrains Mono, Courier New, monospace`. Set `h1` to `1.5rem`, bold, `0.1em` letter-spacing, uppercase. Set `h2` to `1rem`, semibold, `0.08em` letter-spacing, uppercase. Set `body2` to `0.75rem` with `0.05em` letter-spacing.

- [x] 5.2.4. Apply component overrides: `MuiPaper` root should have `backgroundImage: none` and a `1px solid #1A3A5C` border. `MuiButton` root should use `border-radius: 2`, `0.1em` letter-spacing, and `font-weight: 700`. Enhanced: MuiAppBar, MuiCard, MuiDrawer, MuiTextField, divider palette.

### 5.3 Router configuration ✅

- [x] 5.3.1. Create `apps/frontend/src/router.tsx`. Define routes using `createBrowserRouter` from `react-router-dom`.

- [x] 5.3.2. Route `/` must redirect to `/dashboard` using `Navigate` with `replace: true`.

- [x] 5.3.3. Route `/dashboard` renders `DashboardView`. Leave the `/history` route commented out as a placeholder for the stretch phase.

### 5.4 App entry point ✅

- [x] 5.4.1. Update `apps/frontend/src/main.tsx`. Wrap the `RouterProvider` in both `ThemeProvider` (passing the `td3Theme`) and `CssBaseline` to normalize browser styles.

### 5.5 Acceptance criteria ✅

- [x] 5.5.1. Navigating to `/` redirects to `/dashboard` without a visible flash.

- [x] 5.5.2. `document.body` background color is `#0A0E1A`.

- [x] 5.5.3. All text uses JetBrains Mono or a monospace fallback.

---

## 6. Frontend — Dashboard Layout Shell

**Depends on:** Step 5.
**Output:** `apps/frontend/src/views/DashboardView.tsx` and four stub layout components with no internal logic yet.

### 6.1 Layout grid ✅

- [x] 6.1.1. Create `apps/frontend/src/views/DashboardView.tsx`. The root element is a full-viewport flex column (`height: 100vh`, `overflow: hidden`).

- [x] 6.1.2. The header row is a fixed-height bar across the full width.

- [x] 6.1.3. Below the header is a flex row that fills the remaining height. It contains three zones: a left sidebar of `280px` fixed width, a center zone that fills the remaining width with `flex: 1`, and a right sidebar of `320px` fixed width.

- [x] 6.1.4. Below the three-zone row is a bottom bar of fixed height.

- [x] 6.1.5. Left and right sidebars have `overflow-y: auto` so they scroll independently of the map.

- [x] 6.1.6. Borders between zones use `1px solid #1A3A5C`.

### 6.2 Stub components ✅

- [x] 6.2.1. Create `apps/frontend/src/components/layout/Header.tsx` — renders Navbar (layout cleanup).

- [x] 6.2.2. Create `apps/frontend/src/components/panels/StatusPanel.tsx` — contains StatusCards + LogPanel.

- [x] 6.2.3. Create `apps/frontend/src/components/map/MapContainer.tsx` — placeholder with RadarDisplay (Phase 7 will replace with Leaflet).

- [x] 6.2.4. Create `apps/frontend/src/components/panels/TargetPanel.tsx` — contains PriorityTargetPanel.

- [x] 6.2.5. Create `apps/frontend/src/components/layout/BottomBar.tsx` — placeholder bar labeled `BOTTOM BAR`.

### 6.3 Responsive behavior ✅

- [x] 6.3.1. Use MUI `useMediaQuery` with a `768px` breakpoint. When the viewport is narrower than 768px, both the left and right sidebars are hidden from the inline layout and instead made accessible as MUI `Drawer` components. Add icon buttons to the header to toggle each drawer.

### 6.4 Acceptance criteria ✅

- [x] 6.4.1. The layout renders with all five zones visible on a desktop viewport without horizontal scrolling.

- [x] 6.4.2. At 768px viewport width, the left and right sidebars are hidden and replaced by drawer toggle icons in the header. Clicking each icon opens the corresponding drawer.

- [x] 6.4.3. The center zone fills all remaining horizontal space between the sidebars.

---

## 7. Frontend — Leaflet Map Component ✅

**Depends on:** Steps 3, 4, and 5.
**Output:** A fully functional interactive map at `apps/frontend/src/components/map/` displaying the weapon platform, drone markers, range circles, and line of fire.

### 7.1 Install dependencies ✅

- [x] 7.1.1. Install `leaflet`, `react-leaflet` as production dependencies and `@types/leaflet` as a dev dependency.

- [x] 7.1.2. **Known Vite pitfall:** Leaflet's default marker icons reference a `node_modules` path that Vite's asset pipeline cannot resolve, causing 404 errors for the marker PNG files. Fix this by calling `delete (L.Icon.Default.prototype as any)._getIconUrl` and then calling `L.Icon.Default.mergeOptions` with explicit `new URL(...)` references using `import.meta.url` for the three icon files: `marker-icon.png`, `marker-icon-2x.png`, and `marker-shadow.png`. Apply this fix once at the top of `MapContainer.tsx`.

### 7.2 File structure ✅

- [x] 7.2.1. Create the following files under `apps/frontend/src/components/map/`:
  - `MapContainer.tsx` — root map component
  - `PlatformMarker.tsx` — XM914E1 weapon platform icon with heading arrow
  - `DroneMarker.tsx` — per-drone icon, color by status, rotates to heading
  - `RangeCircles.tsx` — 2km and 5km circle overlays
  - `LineOfFire.tsx` — SVG polyline from platform to selected target
  - `TargetLockRing.tsx` — pulsing animation ring on the locked target

### 7.3 `MapContainer.tsx` ✅

- [x] 7.3.1. Read `platform` from `usePlatformStore`. Read all drone values as an array from `useDroneStore`. Read `selectedDroneId` from `useTargetStore`.

- [x] 7.3.2. Default map center is `[37.7749, -122.4194]` (San Francisco — matches seed data). Default zoom is `14`. When `platform` is available, derive the center from `platform.position.lat` and `platform.position.lng`.

- [x] 7.3.3. Use CartoDB dark tile layer at `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. This tile style matches the dark military theme and is free for public projects.

- [x] 7.3.4. Render `RangeCircles` and `PlatformMarker` only when `platform` is non-null.

- [x] 7.3.5. Render `LineOfFire` when both `platform` is non-null and a drone matching `selectedDroneId` exists in the store.

- [x] 7.3.6. Render a `DroneMarker` for each drone in the store, passing `isSelected: true` for the drone whose `droneId` matches `selectedDroneId`.

### 7.4 `DroneMarker.tsx` ✅

- [x] 7.4.1. Use a `L.divIcon` containing an inline SVG arrow rotated to `drone.heading` degrees using a CSS `transform: rotate(${drone.heading}deg)` style.

- [x] 7.4.2. The SVG fill color must reflect `drone.status`: `#6B7280` for `Detected`, `#EAB308` for `Identified`, `#F97316` for `Confirmed`, `#EF4444` for `Engagement Ready`, `#374151` for `Hit` or `Destroyed`.

- [x] 7.4.3. When `isSelected` is true, apply the `TargetLockRing` overlay at the drone's position.

- [x] 7.4.4. Attach an `onClick` handler that calls `targetStore.setSelected(drone.droneId)`.

### 7.5 `RangeCircles.tsx` ✅

- [x] 7.5.1. Render two `react-leaflet` `Circle` components centered on the platform.

- [x] 7.5.2. The inner circle has `radius: 2000`, color `#00C853` (green), `fillOpacity: 0.04`, and `weight: 1.5`. This is the effective engagement range of the XM914E1.

- [x] 7.5.3. The outer circle has `radius: 5000`, color `#FFB300` (amber), `fillOpacity: 0.02`, `weight: 1`, and `dashArray: '6 4'`. This is the maximum detection range.

### 7.6 `LineOfFire.tsx` ✅

- [x] 7.6.1. Render a `react-leaflet` `Polyline` with two positions: the platform position and the selected drone position.

- [x] 7.6.2. Style with color `#EF4444`, `weight: 2`, and `dashArray: '8 4'`.

- [x] 7.6.3. Component must render nothing when `targetDrone` is null.

### 7.7 `TargetLockRing.tsx` ✅

- [x] 7.7.1. Implement a CSS keyframe animation named `pulseRing` that scales the element from `0.9` to `1.3` and fades opacity from `1` to `0.4`, then returns, over a 1.4-second infinite loop.

- [x] 7.7.2. Apply this animation to a circular div overlay positioned at the drone marker location using a Leaflet `DivIcon`.

### 7.8 Acceptance criteria

- [x] 7.8.1. Map renders with CartoDB dark tiles. The platform marker is visible at the correct coordinate.

- [x] 7.8.2. Drone markers appear at the correct latitude/longitude for each drone in the store.

- [x] 7.8.3. Each drone marker's color matches its current status.

- [x] 7.8.4. Clicking a drone marker sets it as the selected target and immediately draws the line of fire from the platform to that drone.

- [x] 7.8.5. Range circles are visible at the correct radii around the platform.

- [x] 7.8.6. As drone positions update via WebSocket, markers move on the map without full remount or flicker.

---

## 8. Frontend — Status Panel

**Depends on:** Steps 3 and 5.
**Output:** A fully populated `apps/frontend/src/components/panels/StatusPanel.tsx`.

### 8.1 Data bindings

- [x] 8.1.1. Read `platform` from `usePlatformStore`.

- [x] 8.1.2. Read `status` and `lastHeartbeat` from `useConnectionStore`.

- [x] 8.1.3. Read `drones` from `useDroneStore` to compute per-status counts.

- [x] 8.1.4. Read `log` from `useEngagementLogStore` for the total engagement count.

### 8.2 System block

- [x] 8.2.1. Render `XM914E1` as the weapon system identifier. This value is hardcoded — it is a display label, not data from the API.

- [x] 8.2.2. Render `3rd Marine Brigade` as the unit label. Also hardcoded.

- [x] 8.2.3. Render a turret status badge. The badge reads `OPERATIONAL` in green when `platform.isActive` is true and `platform.ammoCount >= 50`. It reads `LOW AMMO` in amber when `ammoCount < 50`. It reads `OFFLINE` in red when `platform.isActive` is false or `platform` is null.

### 8.3 Position block

- [x] 8.3.1. Render `LAT:` followed by `platform.position.lat` formatted to four decimal places.

- [x] 8.3.2. Render `LNG:` followed by `platform.position.lng` formatted to four decimal places.

- [x] 8.3.3. Render `HDG:` followed by `platform.heading` formatted to one decimal place, suffixed with `°`.

### 8.4 Engagement statistics

- [x] 8.4.1. Render the following four counters, each derived by filtering `Array.from(drones.values())`:
  - `DETECTED:` count of drones with status `Detected`
  - `IDENTIFIED:` count with status `Identified`
  - `CONFIRMED:` count with status `Confirmed` or `Engagement Ready`
  - `KILLS:` `platform.killCount`

- [x] 8.4.2. Render `AMMO:` followed by `platform.ammoCount` with a visual indication (amber color) when below 50.

### 8.5 Connection status badge

- [x] 8.5.1. Render a filled circle indicator followed by the connection status string.

- [x] 8.5.2. Color the dot: `#00C853` for `Connected`, `#FFB300` for `Degraded`, `#FF1744` for `Offline`.

- [x] 8.5.3. When status is `Degraded`, apply a CSS blink animation to the dot at 1-second intervals.

- [x] 8.5.4. When status is `Offline`, compute elapsed seconds since `lastHeartbeat` using `Date.now() - lastHeartbeat` divided by 1000, rounded down. Display as `LAST CONTACT: {n}s ago`. Update this display every second using a `setInterval` inside a `useEffect`.

### 8.6 Acceptance criteria

- [x] 8.6.1. All fields populate with real data within 5 seconds of app load.

- [x] 8.6.2. Shutting down the backend causes the status badge to transition to `Offline` and the elapsed-seconds counter to start incrementing.

- [x] 8.6.3. After a `drone:hit` engagement, `KILLS` increments and `AMMO` decrements without a page reload.

---

## 9. Frontend — Target Panel and Drone Detail

**Depends on:** Steps 3, 4, and 5.
**Output:** `apps/frontend/src/components/panels/TargetPanel.tsx` containing both the priority target list and the drone detail panel.

### 9.1 `PriorityTargetList`

- [x] 9.1.1. Retrieve the sorted target array by calling `useDroneStore(s => s.getSortedByDistance(...))` with the platform's current lat/lng. If `platform` is null, render an empty list.

- [x] 9.1.2. Render each drone as a clickable card. Clicking the card calls `targetStore.setSelected(drone.droneId)`.

- [x] 9.1.3. Each card displays: the drone ID in bold, drone type in secondary text, a color-coded status badge, distance formatted as `DIST: {n}km` to two decimal places, bearing as `BRG: {n}°`, altitude as `ALT: {n}m`, speed as `SPD: {n} km/h`, and a threat percentage bar reading `THREAT: {n}%`.

- [x] 9.1.4. The threat percentage bar color is green when below 40%, amber between 40% and 70%, and red above 70%.

- [x] 9.1.5. Cards are numbered `1`, `2`, `3` in order of distance from the platform.

- [x] 9.1.6. The selected card renders with a `2px solid` border using `primary.main` (`#1E90FF`). All other cards render with the default paper border.

- [x] 9.1.7. **Bug fix note:** The distance and bearing values displayed on the card must be computed client-side from the drone's current `position` and the platform's `position`. Do not rely solely on a stale backend-sent distance field, as position updates faster than distance fields may be recalculated.

### 9.2 `DroneDetailPanel`

- [x] 9.2.1. Read `selectedDroneId` from `useTargetStore`. Look up the corresponding `IDrone` from `useDroneStore`.

- [x] 9.2.2. When `selectedDroneId` is null or no matching drone is found in the store, render the text `NO TARGET SELECTED` centered in the panel.

- [x] 9.2.3. When a drone is found, render: drone ID, drone type, status badge, an `✓ WITHIN ENGAGEMENT RANGE` indicator (visible only when `status === 'Engagement Ready'`), distance from platform, bearing, altitude, speed, threat level, raw lat/lng position, and last updated timestamp formatted as a human-readable time.

- [x] 9.2.4. **Selection persistence:** The detail panel must not lose its displayed drone when a `drone:update` WebSocket event arrives. Because `targetStore` is a separate Zustand slice from `droneStore`, and `updateDrone` in `droneStore` never touches `targetStore.selectedDroneId`, the selection persists automatically. If selection is resetting unexpectedly, audit that `selectedDroneId` is not stored inside `droneStore`.

### 9.3 Acceptance criteria

- [x] 9.3.1. The target list renders cards for all `Confirmed` and `Engagement Ready` drones only. `Detected` and `Identified` drones do not appear in the list.

- [x] 9.3.2. Cards are sorted by ascending distance to the platform and numbered correctly.

- [x] 9.3.3. Clicking a card highlights it with a blue border and populates the detail panel.

- [x] 9.3.4. The detail panel values (distance, speed, altitude) update in real-time as telemetry arrives, without the card losing its selection highlight or the detail panel clearing.

- [x] 9.3.5. When a drone is destroyed and removed from the store, the detail panel falls back to the `NO TARGET SELECTED` state. The next closest drone in the list is not automatically selected — that happens via the bottom bar's auto-advance logic in Step 10.

---

## 10. Frontend — Bottom Bar and FIRE Button

**Depends on:** Steps 3, 4, and 9.
**Output:** `apps/frontend/src/components/layout/BottomBar.tsx` with target navigation controls, the FIRE button, and the engagement log feed.

### 10.1 Layout

- [x] 10.1.1. The bottom bar is a single horizontal row containing, left to right: the `← PREV` button, a center display showing the current target label, the `NEXT →` button, and the FIRE button on the far right.

- [x] 10.1.2. Below or adjacent to the controls, render the last 10 entries of `engagementLogStore.log` as a compact scrollable feed.

### 10.2 FIRE button states

- [x] 10.2.1. Derive `canFire` as true when all three conditions are met: the selected drone's status is `Engagement Ready`, the component is not in the `firing` state, and `platform.isActive` is true.

- [x] 10.2.2. When `canFire` is true, render the button with a red background, label `FIRE ({platform.ammoCount})`, and a repeating pulse glow CSS animation using `box-shadow` at 1-second intervals.

- [x] 10.2.3. When `canFire` is false, render the button with a muted gray background and the label `NO TARGET`. The button must have the HTML `disabled` attribute set.

- [x] 10.2.4. When the `firing` state is true (immediately after FIRE is pressed and before the 350ms timeout resolves), render the button with an amber background and the label `ENGAGING...`. The button must be disabled during this window.

### 10.3 FIRE button handler

- [x] 10.3.1. On click, verify `canFire` is true and a socket ref is available. If not, return without action.

- [x] 10.3.2. Set local `firing` state to true.

- [x] 10.3.3. Emit `engagement:fire` on the socket with `droneId` equal to `selectedDroneId` and `timestamp` equal to the current ISO 8601 time.

- [x] 10.3.4. After 350ms, set `firing` back to false. The backend will handle the actual result and emit the outcome event.

- [x] 10.3.5. When `drone:destroyed` is received (handled in `useSocket`), the drone is removed from `droneStore`. The bottom bar should then automatically advance to the next target: call `targetStore.nextTarget(sortedIds)` inside the `drone:destroyed` handler after the drone is removed from the store.

### 10.4 Next and Previous navigation

- [x] 10.4.1. Read the sorted target ID array by calling `useDroneStore(s => s.getSortedByDistance(...)).map(d => d.droneId)`.

- [x] 10.4.2. The `← PREV` button calls `targetStore.prevTarget(sortedIds)`.

- [x] 10.4.3. The `NEXT →` button calls `targetStore.nextTarget(sortedIds)`.

- [x] 10.4.4. Both buttons render as disabled when `sortedIds` has fewer than two entries.

### 10.5 Engagement log feed

- [x] 10.5.1. Read `log` from `useEngagementLogStore`. Display the first 10 entries.

- [x] 10.5.2. Each entry renders: timestamp formatted as `HH:MM:SS`, drone ID, an arrow `→`, and the outcome with a visual indicator — a green checkmark `✓` for `Hit` or `Destroyed`, a red cross `✗` for `Missed`.

### 10.6 Acceptance criteria

- [x] 10.6.1. With no `Engagement Ready` drone, the FIRE button is disabled and labeled `NO TARGET`.

- [x] 10.6.2. When a drone reaches `Engagement Ready`, the FIRE button activates without a page action and its pulsing glow begins.

- [x] 10.6.3. Pressing FIRE emits the `engagement:fire` socket event. The button enters the amber `ENGAGING...` state for approximately 350ms.

- [x] 10.6.4. On receiving `drone:hit` or `drone:missed`, a new entry appears in the log feed.

- [x] 10.6.5. On receiving `drone:destroyed`, the drone disappears from the map and the target list auto-advances to the next available target.

- [x] 10.6.6. Next/Prev buttons cycle through the sorted target list. Selection wraps correctly at both ends.

---

## 11. Frontend — Header and Connection Badge

**Depends on:** Steps 3 and 5.
**Output:** A fully implemented `apps/frontend/src/components/layout/Header.tsx`.

### 11.1 Layout

- [x] 11.1.1. Left zone: the text `TD3` in `primary.main` color at `1.2rem` bold monospace, followed by the full title `TACTICAL DRONE DEFENSE DASHBOARD` in `text.secondary` at small caps styling.

- [x] 11.1.2. Right zone: the connection status badge, then on mobile viewports the drawer toggle buttons for the left and right panels.

### 11.2 Connection status badge

- [x] 11.2.1. Read `status` from `useConnectionStore`.

- [x] 11.2.2. Render a filled circle `●` colored by status: `#00C853` for `Connected`, `#FFB300` for `Degraded`, `#FF1744` for `Offline`. Follow it with the status string in uppercase.

- [x] 11.2.3. When `Degraded`, apply a CSS blink animation to the circle at 1-second intervals.

### 11.3 Acceptance criteria

- [x] 11.3.1. Header renders across the full viewport width at all breakpoints.

- [x] 11.3.2. Connection badge updates in real-time without page interaction.

- [x] 11.3.3. On mobile, drawer toggle buttons are visible and functional.

---

## 12. Frontend — D3 Telemetry Gauges

**Depends on:** Steps 3 and 9.
**Output:** Four D3-powered gauge components in `apps/frontend/src/components/gauges/`, rendered in the right sidebar below `DroneDetailPanel` when a drone is selected.

### 12.1 Install dependencies

- [x] 12.1.1. Install `d3` as a production dependency and `@types/d3` as a dev dependency.

### 12.2 File structure

- [x] 12.2.1. Create the following files under `apps/frontend/src/components/gauges/`:
  - `SpeedGauge.tsx`
  - `AltitudeBar.tsx`
  - `ThreatMeter.tsx`
  - `EngagementProbability.tsx`

### 12.3 D3 component pattern

- [x] 12.3.1. Every gauge component follows the same pattern: it holds a `ref` to an `SVGSVGElement`, runs all D3 drawing logic inside a `useEffect` that depends on the incoming `value` prop, begins the effect by calling `d3.select(svgRef.current).selectAll('*').remove()` to clear the previous render, then redraws from scratch.

- [x] 12.3.2. React owns the data binding and the component lifecycle. D3 owns only the SVG drawing. Do not let D3 manage component mount or unmount.

### 12.4 Gauge specifications

- [x] 12.4.1. `SpeedGauge` renders a D3 arc from 0° to 180° (semicircle). The filled arc spans proportionally from `0` to `value / max` where `max` defaults to `300` km/h. The fill color transitions from `#00C853` at zero to `#EAB308` at midrange to `#EF4444` at maximum using `d3.interpolateRgb`. Label: `{value} KM/H` centered below the arc.

- [x] 12.4.2. `AltitudeBar` renders a vertical rectangle. Its filled height is proportional to `value / 1000` where 1000m is the maximum. Fill color is `#1E90FF`. Label: `{value}M` above the bar.

- [x] 12.4.3. `ThreatMeter` renders a horizontal rectangle. Its filled width is proportional to the `value` (0.0 to 1.0). Fill color is interpolated using `d3.interpolateRgb('#00C853', '#FF1744')(value)`. Label: `THREAT {(value * 100).toFixed(0)}%` to the right of the bar.

- [x] 12.4.4. `EngagementProbability` computes `probability = (1 - distanceMeters / 2000) * 0.85`, clamped to `[0, 1]`. Renders the probability as a large bold percentage and a small arc gauge. Color is red when below `0.5`, amber between `0.5` and `0.75`, green above `0.75`. Label: `ENG. PROB`.

### 12.5 Placement

- [x] 12.5.1. Render all four gauges stacked vertically at the bottom of `TargetPanel`, visible only when `selectedDroneId` is non-null.

### 12.6 Acceptance criteria

- [x] 12.6.1. Selecting a drone causes all four gauges to render with the drone's current values.

- [x] 12.6.2. As telemetry updates arrive (speed and altitude changing), the D3 arcs and bars re-render with updated values. No full component remount occurs — only the inner SVG content is cleared and redrawn.

- [x] 12.6.3. Deselecting the drone (or drone being destroyed) causes all gauges to unmount cleanly with no console errors.


---

## Frontend Fixes:

- [x] make the telemetry overlay background 30% more transparent. 
- [x] cache recent user settings for size. Increase default size of the vehicle by 30% and drones by 15%
- [X] remove and consolidate target details to the interface itself.
- [x] allow me to press cmd + enter (on Mac) to fire the turret; different on PC — let's detect the user's device settings
- [x] show the keyboard shortcut, small underneath the fire button, based on the user's device
- [x] center the fire button inside of the map overlay in the center along the bottom center of the map with some bottom margin, add a glowing animation to the background gradient red color, add a grow/shrinking button size animation
- [x] add an animation to whenever the fire button is pressed the button itself grows out super quickly and shrinks really quickly as if it's shooting and recoiling, add some wobble as it grows and shrinks
- [x] enable sounds in settings... slider for sound volume... make frontend/src/assets/diesel-idle.mp3 always present
- [x] enable first 1.5 seconds of frontend/src/assets/mechanical-clamp.mp3 for swivel sound (have it fade out)
- [x] enable frontend/src/assets/a-10-warthog-brrrt.mp3 when firing
- [x] create an ammo count in the top right, use a casino rolling typography animation (make default ammo count 2000 rounds). Combine this by using the frontend/src/assets/TD3 minigun mock.png, so the ammo depletes. Show the text grow and shrink and wobble similarly to the fire button WHILE also the casino rolling typography animation shows the ammo count depleting
- [x] ensure that ammo actually depletes... and doesn't just reset
- [x] remove background container of turret and ammo counter — remove ambient grow/shrink, should only animate during firing and ammo depletion
- [x] represent real life stats of the machine gun: Rate of fire, 200 shots per minute. Muzzle velocity, 805 m/s. Effective firing range, 300 m. Maximum firing range, 4,000 m.
- [x] slow down swivels so it takes a little bit of time to reposition
- [x] show distance between the turret and the drone as a stat on the line between vehicle and the drone
- [x] allow me to click off the drone to deselect that target.
- [x] tether sounds to animation
- [x] rotate turret image by 15 degrees clockwise so turret barrel aligns with heading
- [x] animate the turret a subtle opposite heading x/y translation to mimic recoil, should reset after firing
- [x] remove the engagement log from the bottom bar, so the bottom bar's height shrinks. Ensure the Engagement Log in the right side bar is organized from most recent first in descending order
- [x] when new engagement logs come in have them animate in by fading from poping in even as they get layered.

- [ ] create tracer rounds that match the ammo fired count, flashing a dotted line to where the bullet went, by default show an "x" in a muted color where the bullet landed (this will require tracing where the bullet started and where it landed)
- [ ] when bullets hit the drones use a "+" in a brighter red; ensure bullets/bullet paths fade out 1 second after firing
- [ ] create animation for landing hits and missed shots (show the rounds missing the target) and create little X's when they miss (assume they land behind the drone in some way)
- [ ] create a range accuracy gradient cone away from the vehicle
- [ ] generate FRIENDLIES on the screen — representing radar equipment, personnel, command posts, HQs, vehicles, aircraft, and ships. Generate friendlies inside, outside, and far outside the turret. Persist the allies in a database. When I click on them allow me to see their status.

**Depends on:** Steps 2, 4, 7. Backend engagement handler emits `drone:hit` / `drone:missed`; platform and drone positions available from stores.
**Output:** `TracerOverlay.tsx`, `AccuracyCone.tsx`, `FriendlyMarker.tsx`, backend `Friendly` model and routes.

### 12a.1 Tracer rounds (715) ✅

- [x] 12a.1.1. Create a `TracerOverlay` component rendered inside the Leaflet map. It subscribes to `drone:hit` and `drone:missed` events via `useSocket` and maintains a list of recent tracer entries: `{ id, startLatLng, endLatLng, outcome: 'Hit' | 'Missed', timestamp }`.

- [x] 12a.1.2. For **hits**: `startLatLng` = platform position; `endLatLng` = drone position at time of hit (from `droneStore` snapshot or payload if backend adds it). For **misses**: `endLatLng` = point along the bearing from platform to drone, extended past the drone by a random 50–150 m (simulated overshoot behind target).

- [x] 12a.1.3. Render each tracer as a dashed Polyline from start to end. Use `dashArray` for a dotted/flashing effect. At the end point, render a Leaflet `CircleMarker` or custom div with "x" in a muted color (e.g. `#6b7280`). Match tracer count to rounds fired: one tracer per `drone:hit` or `drone:missed` received.

- [x] 12a.1.4. When bullets hit drones (outcome `Hit`): render a "+" in brighter red (`#ef4444` or `#dc2626`) at the hit position instead of "x".

- [x] 12a.1.5. Fade out: remove tracer entries from the list 1 second after their `timestamp`. Use `setTimeout` or a cleanup effect keyed on timestamp.

### 12a.2 Hit and miss markers (716, 717) ✅

- [x] 12a.2.1. Consolidate hit/miss marker logic in `TracerOverlay`: hits show "+" in bright red; misses show "x" in muted color at the computed overshoot position.

- [x] 12a.2.2. Ensure bullet paths (dotted lines) and markers (x/+) both fade out together 1 second after firing. No persistent markers after 1 s.

### 12a.3 Range accuracy cone (718) ✅

- [x] 12a.3.1. Create `AccuracyCone.tsx`: an SVG or Leaflet polygon overlay emanating from the platform position, aligned with the turret heading (or selected target bearing when a target is selected).

- [x] 12a.3.2. The cone widens with distance. Use `MINIGUN_STATS.EFFECTIVE_RANGE_M` (300 m) and `MAX_RANGE_M` (4000 m). Inner cone (0–300 m): higher opacity (e.g. 0.4); outer cone (300–4000 m): gradient to lower opacity (e.g. 0.1) to suggest accuracy falloff.

- [x] 12a.3.3. Render as a semi-transparent filled polygon. When no target selected, use `platformStore.currentTurretHeading`; when target selected, use bearing to target for cone direction.

### 12a.4 Friendlies (719)

12a.4.1. **Backend:** Add Mongoose `Friendly` model: `friendlyId`, `type` (radar | personnel | command_post | hq | vehicle | aircraft | ship), `position` (IPosition), `status` (string), `lastUpdated`. Seed script or API to generate friendlies inside (< 300 m), outside (300–2000 m), and far outside (> 2000 m) the turret.

12a.4.2. **Backend:** Add `GET /api/friendlies` and optional `GET /api/friendlies/:id` for status. Emit `friendly:update` via Socket.IO if live updates are desired, or rely on REST for initial load.

12a.4.3. **Frontend:** Create `FriendlyMarker.tsx` — distinct icon or color (e.g. blue/green) from drone markers. On click, show a status panel or tooltip with friendly type and status.

12a.4.4. **Frontend:** Add `useFriendlies` hook or store to fetch and hold friendlies. Render `FriendlyMarker` for each friendly on the map. Click handler opens status view (sidebar panel or modal).

### 12a.5 Acceptance criteria

- [x] 12a.5.1. Firing at a drone produces tracer lines (dotted) from platform to hit/miss point; hits show "+" in bright red, misses show "x" in muted color. All fade out within 1 s.

- [x] 12a.5.2. Accuracy cone renders from platform, aligned with turret heading or target bearing; gradient reflects effective vs max range.

- [ ] 12a.5.3. Friendlies appear on map with distinct styling; clicking one shows status. Friendlies persist in database and load on page refresh.

---

## 13. Backend — Enhanced Drone Behavior

- [ ] fix target creation.... ensure they're getting created inside and out of range... add more and more drones... 
- [ ] ensure at least 50%+ the behavior of the drones is to fly TOWARD the turret; the other 50% behavior should be flying inside/outside the bounds potentially striking different targets
- [ ] increase speed of updates to nearly live time... think 60 fps updates, illustrate repositioning of drones at that 60 FPS change... no need to log all of that

**Depends on:** Step 2.
**Output:** Updated telemetry simulation logic in `apps/backend/src/services/socket-service.ts` replacing random movement with purpose-driven swarm behavior.

### 13.1 Approach vector ✅

- [x] 13.1.1. On each simulation tick, calculate the bearing from each drone's current position to the platform's position.

- [x] 13.1.2. Rather than snapping the drone's heading directly to that bearing, nudge it toward the target bearing by a random amount between 5° and 15° per tick. This simulates realistic flight path corrections rather than instant reorientation.

### 13.2 Speed escalation ✅

- [x] 13.2.1. As a drone's distance to the platform drops below 3km, increase its speed by `+5 km/h` per tick up to a maximum of `250 km/h`.

- [x] 13.2.2. Above 3km, hold speed within a randomized base range of `80–130 km/h` depending on drone type.

### 13.3 Threat level calculation ✅

- [x] 13.3.1. Recalculate `threatLevel` on every tick as `1 - (distanceMeters / 5000)`, clamped to `[0, 1]`. A drone at 5km or beyond has threat level `0`. A drone at the platform has threat level `1`.

### 13.4 Automatic status progression ✅

- [x] 13.4.1. A drone spawns with status `Detected`.

- [x] 13.4.2. After 3 consecutive ticks within 5km, advance to `Identified`. Emit `drone:status` on the change.

- [x] 13.4.3. When `threatLevel > 0.5` and distance is under 3km, advance to `Confirmed`. Emit `drone:status`.

- [x] 13.4.4. When distance is under 2km and status is `Confirmed`, advance to `Engagement Ready`. Emit `drone:status`.

- [x] 13.4.5. Each status advancement is a one-way progression. A drone cannot revert to a lower status during normal approach.

### 13.5 Evasive maneuver on miss ✅

- [x] 13.5.1. When the engagement logic in Step 2 resolves a miss for a drone, flag that drone as `evading` in its in-memory state.

- [x] 13.5.2. While `evading`, add a random jink of ±45° to the drone's heading and increase speed by `+30 km/h`.

- [x] 13.5.3. After 5 simulation ticks, clear the `evading` flag and resume the normal approach vector behavior.

### 13.6 Swarm formation ✅

- [x] 13.6.1. When 3 or more drones are active simultaneously, space their approach bearings 120° apart around the platform. New drones that spawn slot into the next available bearing gap rather than approaching from the same direction.

### 13.7 Acceptance criteria

- [x] 13.7.1. Spawn 3 drones. After 30 seconds on the map, all three drones are visibly moving toward the platform.

- [x] 13.7.2. Drone statuses automatically advance through `Identified`, `Confirmed`, and `Engagement Ready` as they approach. No manual action is required to trigger progression.

- [ ] 13.7.3. After a missed engagement, the targeted drone visibly changes heading for several ticks before resuming its approach vector. (Manual verification)

- [x] 13.7.4. With 3 active drones, their approach vectors are spread roughly 120° apart rather than clustered.


---

## updating to 60 FPS


Here’s how moving to ~60 fps (0.016 s) updates affects the system.

---

## Backend changes

### 1. **Simulation tick rate**
- **Current:** `updateInterval: 2000` (every 2 s)
- **Target:** `updateInterval: 16` (≈60 fps)

### 2. **What scales automatically**
- **Movement distance:** `moveM = (speed * 1000 * updateInterval) / 3600000` — already time-based, so it scales with `updateInterval`.
- **Socket emits:** Frontend will receive more `drone:update` events; it just reacts to whatever the backend sends.
- **Firing:** `ROUND_INTERVAL_MS = 300` is independent of the simulation tick.

### 3. **What must be scaled explicitly**

| Logic | Current | At 60 fps | Fix |
|-------|---------|-----------|-----|
| **Speed escalation (13.2)** | +5 km/h per tick | +5 km/h per 16 ms → ~312 km/h/s | Use time-based delta: `speed += 5 * (updateInterval / 1000)` |
| **Status progression (13.4)** | 3 ticks within 5 km | 3 × 16 ms = 48 ms | Switch to time: e.g. 6 s within 5 km |
| **Evading duration (13.5)** | 5 ticks | 5 × 16 ms = 80 ms | Switch to time: e.g. 10 s (5000 ms) |
| **Heading nudge (13.1)** | 5–15° per tick | Same per tick → much faster turning | Scale: e.g. `nudgeDeg * (updateInterval / 2000)` |

---

## Reverberations (cascading effects)

1. **DB load:** At 60 fps, 6 drones → ~360 `drone.save()` calls per second. The plan says “no need to log all of that,” so we should avoid persisting every tick.
2. **Socket traffic:** ~360 `droneUpdate` events/sec. Likely fine for WebSocket, but worth monitoring.
3. **Frontend:** React will re-render more often. Drone markers and map updates should handle it; Leaflet is usually fine.
4. **E2E tests:** They use fixed waits (e.g. 32 s). With 60 fps, fewer ticks are needed for the same simulated time; test durations can stay the same.
5. **`PLATFORM_CONSTANTS.UPDATE_INTERVAL`:** Frontend constant (2000 ms). Used for engagement altitude, not for tick rate. Can stay as-is or be updated for consistency.

---

## Summary

| Component | Dynamic? | Action |
|-----------|----------|--------|
| Movement distance | Yes | No change |
| Speed +5 km/h | No | Make time-based |
| Status progression | No | Use time (e.g. 6 s) instead of ticks |
| Evading 5 ticks | No | Use time (e.g. 10 s) instead of ticks |
| Heading nudge | No | Scale by tick duration |
| DB persistence | No | Throttle or skip per-tick writes |
| Socket emit | Yes | No change |
| Frontend | Yes | No change |

---

## Recommended implementation

1. Set `updateInterval: 16` (or 17 for 1/60 s).
2. Make speed escalation time-based: `speed += 5 * (updateInterval / 1000)`.
3. Replace tick-based status progression with time-based (e.g. `msWithin5km >= 6000`).
4. Replace evading tick count with time (e.g. `evadingMsRemaining`).
5. Scale heading nudge by tick duration.
6. Avoid `drone.save()` on every tick; either throttle (e.g. every 500 ms) or only persist on status changes and at end of engagement.



---

## 14. PWA — Service Worker and Offline Mode ✅

**Depends on:** Step 5.
**Output:** A Workbox-powered service worker, `manifest.json`, IndexedDB offline storage, and an offline banner component.

### 14.1 Install dependencies

- [x] 14.1.1. Install `vite-plugin-pwa` as a dev dependency.

### 14.2 Vite configuration

- [x] 14.2.1. Add `VitePWA` to the plugins array in `apps/frontend/vite.config.ts`.

- [x] 14.2.2. Set `registerType: 'autoUpdate'` so the service worker updates silently when a new build is deployed.

- [x] 14.2.3. Configure `workbox.globPatterns` to precache all `.js`, `.css`, `.html`, `.ico`, `.png`, `.svg`, and `.woff2` files.

- [x] 14.2.4. Configure runtime caching with two rules: one for CartoDB map tile URLs using `CacheFirst` strategy with a cache name of `map-tiles`, max 200 entries, and a max age of 86,400 seconds (24 hours); one for all `/api/*` URLs using `NetworkFirst` strategy with a cache name of `api-cache`, max 50 entries, and a 300-second TTL.

### 14.3 Manifest

- [x] 14.3.1. Set `name` to `Tactical Drone Defense Dashboard`, `short_name` to `TD3`, `theme_color` to `#0F3460`, `background_color` to `#0A0E1A`, `display` to `fullscreen`, and `orientation` to `landscape`.

- [x] 14.3.2. Include two icon entries: `icon-192.png` at `192x192` and `icon-512.png` at `512x512` with `purpose: 'any maskable'`.

### 14.4 PWA icons

- [x] 14.4.1. Create `apps/frontend/public/icons/icon-192.png` — 192×192 pixels, dark navy (`#0F3460`) background with a white crosshair or `TD3` lettermark centered.

- [x] 14.4.2. Create `apps/frontend/public/icons/icon-512.png` — 512×512 pixels, same design.

### 14.5 IndexedDB offline storage

- [x] 14.5.1. Create `apps/frontend/src/lib/offlineStorage.ts`. It must export three functions: `openDB()` which opens or creates a version-1 IndexedDB database named `td3-offline` with an object store named `telemetry` keyed by `timestamp`; `saveTelemetry(entry: object)` which writes a record to the store; and `getRecentTelemetry()` which retrieves all records and returns the newest 500.

- [x] 14.5.2. Each write operation must also prune the store so it never exceeds 500 entries. Delete the oldest entries to maintain the cap.

- [x] 14.5.3. Call `saveTelemetry(drone)` inside the `drone:update` handler in `useSocket.ts` (Step 4.2.7 above).

### 14.6 Offline banner

- [x] 14.6.1. Create `apps/frontend/src/components/layout/OfflineBanner.tsx`. It renders a fixed-position amber bar across the full top of the screen with the text `⚠ CONNECTION LOST — DISPLAYING LAST KNOWN STATE`.

- [x] 14.6.2. In `DashboardView.tsx`, subscribe to `connectionStore.status`. Render `OfflineBanner` when status is `Offline`.

### 14.7 Acceptance criteria

- [x] 14.7.1. Run `npx nx build frontend` and serve the output with a static server. Run the Lighthouse PWA audit. All three PWA checklist items must pass: installable, offline capability, and icons.

- [x] 14.7.2. Disable the network tab in browser DevTools after the app has loaded. Reload the page. The app loads from cache with no network requests failing.

- [x] 14.7.3. The offline banner is visible after the network is disabled and the heartbeat watchdog has timed out.

- [x] 14.7.4. Open the Application tab in DevTools. Under IndexedDB, confirm `td3-offline` / `telemetry` contains drone records.

---

## 15. Deployment

**Depends on:** All prior steps complete and passing locally against Docker Compose.

### 15.1 MongoDB Atlas

15.1.1. Create a free M0 cluster at `mongodb.com/atlas`. Select the AWS region closest to where the Render backend will be deployed.

15.1.2. Create a database user with username and password authentication. Save the credentials securely.

15.1.3. Under Network Access, add IP address `0.0.0.0/0` to the IP Access List. This is required to allow both Render and Vercel to connect.

15.1.4. Copy the connection string in the format `mongodb+srv://<user>:<pass>@cluster.mongodb.net/td3?retryWrites=true&w=majority`. This becomes the `MONGO_URI` environment variable.

### 15.2 Render — Backend

15.2.1. Create a new Web Service on `render.com`. Connect the GitHub repository.

15.2.2. Set Root Directory to `backend` (or `apps/backend` if your repo uses that path).

15.2.3. Set Build Command to `npm install && npx tsc`.

15.2.4. Set Start Command to `node dist/main.js`.

**Alternative — Blueprint (if Build/Start Command fields are not visible in the dashboard):** Use `render.yaml` in the repo root. In Render Dashboard, click **New > Blueprint**, connect the repo. Render reads `render.yaml` and creates the service with `buildCommand` and `startCommand`. Add `MONGODB_URI` and `CORS_ORIGIN` in the service's Environment tab.

15.2.5. Add environment variables: `MONGODB_URI` from step 15.1.4 (backend reads this, not `MONGO_URI`), `CORS_ORIGIN` set to the Vercel URL (update this after deploying in step 15.3), `NODE_ENV` set to `production`, and `PORT` set to `3000`.

15.2.6. Save and deploy. Copy the Render service URL once the deployment is healthy.

### 15.3 Vercel — Frontend

15.3.1. Import the repository on `vercel.com`.

15.3.2. Set Framework Preset to `Vite`. Set Root Directory to `apps/frontend`.

15.3.3. Add environment variables: `VITE_SOCKET_URL` and `VITE_API_BASE_URL` both set to the Render backend URL from step 15.2.6.

15.3.4. Deploy. Copy the Vercel URL.

15.3.5. Return to Render. Update `CORS_ORIGIN` to the Vercel URL. Trigger a manual redeploy of the backend.

### 15.4 Smoke test checklist

15.4.1. `GET {RENDER_URL}/api/platform/status` returns a valid JSON response, not a 502 or 503.

15.4.2. The Vercel URL loads without browser console errors.

15.4.3. The connection status badge transitions to `CONNECTED` within 10 seconds of opening the app.

15.4.4. `POST {RENDER_URL}/api/drones/test-types` returns a success response and spawns drones.

15.4.5. Drone icons appear on the map within 5 seconds of spawning.

15.4.6. Selecting a drone populates the detail panel with real data.

15.4.7. A drone reaches `Engagement Ready` status within 2 minutes of spawning. The FIRE button activates.

15.4.8. Pressing FIRE triggers a result, which appears in the engagement log.

15.4.9. The browser shows a PWA install prompt. Installing it opens the app in fullscreen with no browser chrome.

15.4.10. Enabling airplane mode causes the offline banner to appear. The app remains usable showing last-known drone positions.

---

## 16. Testing

**Depends on:** All feature steps (Steps 1–15).

### 16.1 Unit testing — Backend

16.1.1. Set up Vitest in `apps/backend` with a `vitest.config.ts` referencing the backend `tsconfig`.

16.1.2. Write a test suite for the engagement probability formula in `socket-service.ts`. Test the following cases: a drone at 0m distance returns probability close to `0.85`, a drone at exactly 2000m distance returns probability of `0`, a fast drone (250 km/h) returns a lower probability than a slow drone (50 km/h) at the same distance, and probability never exceeds `1.0` or drops below `0.0`.

16.1.3. Write a test suite for the status progression logic. Test that a drone at 1500m with `threatLevel > 0.5` and `Confirmed` status advances to `Engagement Ready`. Test that a drone at 4000m does not advance past `Identified` regardless of elapsed ticks.

16.1.4. Write a test suite for the `TelemetryLog` model. Mock Mongoose and confirm that an engagement resolution writes a document with the correct `droneId`, `engagementOutcome`, and `timestamp` fields.

### 16.2 Unit testing — Frontend stores

16.2.1. Set up Vitest in `apps/frontend`.

16.2.2. Write a test suite for `droneStore`. Test that `updateDrone` adds a new drone. Test that updating an existing drone replaces it without creating duplicates. Test that `removeDrone` removes the correct drone. Test that `getSortedByDistance` returns only `Confirmed` and `Engagement Ready` drones, sorted by ascending distance, using mock drone fixtures at known coordinates.

16.2.3. Write a test suite for `targetStore`. Test that `setSelected` stores the `droneId`. Test that `nextTarget` advances correctly through a three-item array. Test that `nextTarget` wraps from the last item to the first. Test that `prevTarget` wraps from the first item to the last.

16.2.4. Write a test suite for `engagementLogStore`. Test that `appendLog` prepends the entry. Test that the log is trimmed to a maximum of 200 entries when entries exceed the cap.

16.2.5. Write a test suite for `connectionStore`. Test that `recordHeartbeat` sets `lastHeartbeat` to a number and sets `status` to `Connected`. Test that `setStatus('Offline')` updates the status.

### 16.3 Unit testing — Frontend components

16.3.1. Write a render test for `DroneDetailPanel`. Use a mock Zustand store with a pre-populated drone. Assert that the drone ID, status badge, and distance are visible in the rendered output. Assert that the `✓ WITHIN ENGAGEMENT RANGE` indicator is only visible when the drone's status is `Engagement Ready`.

16.3.2. Write a render test for `BottomBar`. Assert that the FIRE button renders as disabled when no drone is selected. Provide a mock `Engagement Ready` drone and assert that the FIRE button renders as enabled.

16.3.3. Write a render test for `ConnectionBadge` (within `Header`). Assert that it renders the correct color class for each of the three `ConnectionStatus` values.

### 16.4 Integration testing — Backend API

16.4.1. Use Supertest with a real Express app instance and a test MongoDB connection (use `mongodb-memory-server` for an in-memory database that does not require a live Atlas connection).

16.4.2. Write a test for `GET /api/drones`. Seed the database with two drone documents. Assert the response is an array of length two and that both documents contain a `droneId` field.

16.4.3. Write a test for `GET /api/platform/status`. Seed a platform document. Assert the response contains `heading`, `isActive`, `ammoCount`, and `killCount` fields.

16.4.4. Write a test for `GET /api/drones/:droneId/history`. Seed three `TelemetryLog` documents for a single drone. Assert the response is an array of length three sorted by `timestamp` descending.

16.4.5. Write a test for `POST /api/drones/test-types`. Assert the response indicates success and that querying `GET /api/drones` afterwards returns a non-empty array.

### 16.5 Integration testing — WebSocket flow

16.5.1. Use a Socket.IO test client connected to a locally running backend instance (not mocked).

16.5.2. Write a test that confirms the server emits a `drone:update` event within 5 seconds of the client connecting.

16.5.3. Write a test that confirms emitting `heartbeat:ping` causes the server to respond with `heartbeat:pong` within 100 milliseconds.

16.5.4. Write a test for the full engagement cycle: spawn a test drone, manually set it to `Engagement Ready` status in the database, emit `engagement:fire` from the client, and assert receipt of either `drone:hit` or `drone:missed` within 1 second, followed by `platform:status` with an updated `killCount` or a preserved count depending on outcome.

### 16.6 Run configuration

16.6.1. Add an `npm run test:backend` script in `apps/backend/package.json` that runs `vitest run`.

16.6.2. Add an `npm run test:frontend` script in `apps/frontend/package.json` that runs `vitest run`.

16.6.3. Add a root-level `npm run test` script in the repo `package.json` that runs both via Nx: `npx nx run-many --target=test --all`.

16.6.4. All tests must pass before any deployment step is attempted.

---

## 17. QA

**Depends on:** Steps 1–16.

### 17.1 Known bugs

| ID | Issue | Root Cause | Resolution |
|---|---|---|---|
| BUG-001 | Target list not rendering | `Map` is not iterable in JSX | Call `Array.from(drones.values())` before filter and map |
| BUG-002 | Target selection resets on WS update | `selectedDroneId` was co-located in `droneStore` | Isolated to `targetStore` in Step 3 |
| BUG-003 | Engagement sequence not wired | `engagement:fire` had no backend handler | Added in Step 2.1 |
| BUG-004 | Leaflet marker icons 404 | Vite breaks Leaflet's default icon path resolution | Fixed via explicit `new URL(...)` imports in Step 7.1.2 |

### 17.2 Pre-deploy QA checklist

17.2.1. `npx nx build frontend` — zero TypeScript errors, zero build warnings.

17.2.2. `npx nx build backend` — zero TypeScript errors.

17.2.3. `npx nx run-many --target=test --all` — all tests pass.

17.2.4. `docker compose up` — all three containers reach healthy status within 60 seconds.

17.2.5. Map renders drone icons within 5 seconds of app load.

17.2.6. Drones move toward the platform and status auto-advances to `Engagement Ready`.

17.2.7. Selecting a drone highlights its card and draws the line of fire.

17.2.8. Next/Prev buttons cycle the target list. Selection wraps correctly at both ends.

17.2.9. FIRE button is disabled with no valid target. Activates when a drone reaches `Engagement Ready`.

17.2.10. Pressing FIRE emits the event. Result arrives from the backend. Log feed updates.

17.2.11. On hit, the drone icon fades from the map and kill count increments.

17.2.12. Heartbeat cycles every 5 seconds. Status badge is accurate.

17.2.13. Killing the backend triggers `Offline` status and the offline banner.

17.2.14. Restarting the backend reconnects automatically and clears the offline banner.

17.2.15. Lighthouse PWA audit: Performance score ≥ 80, all PWA checks green.

17.2.16. App renders correctly on a 768px-wide viewport with sidebars collapsed to drawers.

### 17.3 Browser compatibility

17.3.1. Test on Chrome 120+ and Firefox 120+ as primary targets.

17.3.2. Test on Safari 17+ (macOS and iOS) — confirm IndexedDB and service worker behavior, as Safari has historically had restrictions on both.

17.3.3. Test on an Android Chrome browser at a 360px viewport to verify the PWA install flow and fullscreen orientation.

### 17.4 TypeScript strict mode compliance

17.4.1. `"strict": true` must be set in `tsconfig.base.json`. No `@ts-ignore` or `any` type annotations are permitted in production code except where explicitly approved and commented.

17.4.2. After completing each step, run `npx nx typecheck frontend` and `npx nx typecheck backend` to confirm zero type errors before proceeding.

---

## 18. Observability

**Depends on:** Steps 2 and 4 (can be implemented incrementally after each step).

### 18.1 Backend logging

18.1.1. Morgan is already configured in `apps/backend/src/main.ts` as HTTP request middleware. Confirm it is using the `combined` format in production (`NODE_ENV === 'production'`) and `dev` format in development.

18.1.2. Add a structured logger for application events. Create `apps/backend/src/lib/logger.ts`. Export a simple wrapper around `console.log` that outputs JSON-formatted entries in production and human-readable entries in development. Each log entry must include: `timestamp` in ISO 8601, `level` (`info`, `warn`, `error`), `event` (a short string identifier), and an optional `meta` object for additional context.

18.1.3. Log the following events using the structured logger:
  - `socket.connected` — when a new Socket.IO client connects, include `socketId` in meta.
  - `socket.disconnected` — when a client disconnects, include `socketId` and `reason`.
  - `engagement.fired` — when `engagement:fire` is received, include `droneId`, `distanceMeters`, and `hitProbability` in meta.
  - `engagement.hit` — when an engagement resolves as a hit, include `droneId` and `timestamp`.
  - `engagement.missed` — when an engagement resolves as a miss, include `droneId` and `timestamp`.
  - `drone.statusChange` — when a drone's status advances, include `droneId`, `fromStatus`, `toStatus`, and `distanceMeters`.
  - `db.error` — when any MongoDB operation throws, include the error message and the operation name.

18.1.4. Wrap all route handlers and Socket.IO event handlers in try-catch blocks. In catch blocks, call `logger.error('event.name', { error: err.message })` before returning the error response.

### 18.2 Frontend error boundaries

18.2.1. Create `apps/frontend/src/components/ErrorBoundary.tsx` as a React class component implementing `componentDidCatch`. The fallback UI renders a dark panel with the message `SYSTEM ERROR — COMPONENT UNAVAILABLE` and the error message below it.

18.2.2. Wrap the following component subtrees in `ErrorBoundary`:
  - The `MapContainer` render zone.
  - The `TargetPanel` render zone.
  - The `BottomBar` render zone.

18.2.3. This ensures that a D3 rendering error or a Leaflet exception does not unmount the entire application.

### 18.3 Frontend console discipline

18.3.1. Create `apps/frontend/src/lib/logger.ts` with three exported functions: `log(event: string, meta?: object)`, `warn(event: string, meta?: object)`, and `error(event: string, meta?: object)`. In development, these call `console.log`, `console.warn`, and `console.error` with structured output. In production (detected via `import.meta.env.PROD`), suppress `log` and `warn` calls — emit only `error` level output.

18.3.2. Log the following frontend events:
  - `socket.connected` — when the Socket.IO `connect` event fires.
  - `socket.disconnected` — when the `disconnect` event fires, with the reason as meta.
  - `socket.reconnecting` — on each reconnection attempt, with attempt number as meta.
  - `engagement.fire.emitted` — when the FIRE button emits the event, with `droneId` as meta.
  - `engagement.result` — when `drone:hit` or `drone:missed` is received, with outcome as meta.
  - `pwa.offline` — when `connectionStore.status` transitions to `Offline`.
  - `pwa.restored` — when `connectionStore.status` returns to `Connected` after `Offline`.

18.3.3. No raw `console.log` calls may exist in production builds. All frontend logging must go through `apps/frontend/src/lib/logger.ts`.

### 18.4 Health check endpoint

18.4.1. Add a `GET /health` route to `apps/backend/src/main.ts` (outside of the `/api` router). It must respond with HTTP 200 and a JSON body containing `status: 'ok'`, `timestamp` in ISO 8601, `activeDrones` count from the current in-memory simulation map, and `mongoConnected` boolean derived from `mongoose.connection.readyState === 1`.

18.4.2. This endpoint is used by Render's health check configuration. Set Render's health check path to `/health`.

### 18.5 Render deployment monitoring

18.5.1. In the Render dashboard, enable the health check against `/health`. Render will restart the service automatically if the endpoint stops returning 200.

18.5.2. Set up a free UptimeRobot monitor (or equivalent) on the Render service URL to alert if the backend becomes unreachable. Point it at `{RENDER_URL}/health`.

18.5.3. Set up a second UptimeRobot monitor on the Vercel URL to confirm the frontend remains accessible.

### 18.6 Vercel analytics

18.6.1. Enable Vercel Web Analytics in the project dashboard. This provides page view counts, Web Vitals scores (LCP, FID, CLS), and visitor geography with no additional code changes required for the Vite project.

18.6.2. Review the Web Vitals report after the first 24 hours of public traffic. The target for LCP (Largest Contentful Paint) is under 2.5 seconds. If LCP exceeds 2.5 seconds, investigate asset preloading for the Leaflet tile layer and the JetBrains Mono font.

---

## Appendix A — Target File Tree

```
td3/
├── apps/
│   ├── frontend/
│   │   ├── public/icons/
│   │   │   ├── icon-192.png
│   │   │   └── icon-512.png
│   │   └── src/
│   │       ├── components/
│   │       │   ├── gauges/
│   │       │   │   ├── SpeedGauge.tsx
│   │       │   │   ├── AltitudeBar.tsx
│   │       │   │   ├── ThreatMeter.tsx
│   │       │   │   └── EngagementProbability.tsx
│   │       │   ├── layout/
│   │       │   │   ├── Header.tsx
│   │       │   │   ├── BottomBar.tsx
│   │       │   │   └── OfflineBanner.tsx
│   │       │   ├── map/
│   │       │   │   ├── MapContainer.tsx
│   │       │   │   ├── PlatformMarker.tsx
│   │       │   │   ├── DroneMarker.tsx
│   │       │   │   ├── RangeCircles.tsx
│   │       │   │   ├── LineOfFire.tsx
│   │       │   │   └── TargetLockRing.tsx
│   │       │   ├── panels/
│   │       │   │   ├── StatusPanel.tsx
│   │       │   │   └── TargetPanel.tsx
│   │       │   └── ErrorBoundary.tsx
│   │       ├── hooks/
│   │       │   └── useSocket.ts
│   │       ├── lib/
│   │       │   ├── logger.ts
│   │       │   └── offlineStorage.ts
│   │       ├── store/
│   │       │   ├── droneStore.ts
│   │       │   ├── targetStore.ts
│   │       │   ├── platformStore.ts
│   │       │   ├── connectionStore.ts
│   │       │   └── engagementLogStore.ts
│   │       ├── views/
│   │       │   └── DashboardView.tsx
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       ├── router.tsx
│   │       └── theme.ts
│   └── backend/
│       └── src/
│           ├── lib/
│           │   └── logger.ts
│           ├── models/
│           │   ├── drone.model.ts
│           │   ├── weapon-platform.model.ts
│           │   └── telemetry-log.model.ts
│           ├── routes/
│           │   └── drone.routes.ts
│           ├── services/
│           │   └── socket-service.ts
│           └── main.ts
└── libs/
    └── shared-types/
        └── src/
            └── index.ts
```

---

## Appendix B — Step Dependency Map

| Step | Title | Hard Dependencies |
|---|---|---|
| 1 | Shared Types Library | None |
| 2 | Backend Engagement Logic | Step 1 |
| 3 | Zustand Stores | Step 1 |
| 4 | WebSocket Hook | Steps 1, 3 |
| 5 | MUI Theme and Router | None |
| 6 | Dashboard Layout Shell | Step 5 |
| 7 | Leaflet Map | Steps 3, 4, 5 |
| 8 | Status Panel | Steps 3, 5 |
| 9 | Target Panel and Drone Detail | Steps 3, 4, 5 |
| 10 | Bottom Bar and FIRE Button | Steps 3, 4, 9 |
| 11 | Header and Connection Badge | Steps 3, 5 |
| 12 | D3 Telemetry Gauges | Steps 3, 9 |
| 13 | Enhanced Drone Behavior | Step 2 |
| 14 | PWA and Offline Mode | Step 5 |
| 15 | Deployment | Steps 1–14 |
| 16 | Testing | Steps 1–15 |
| 17 | QA | Steps 1–16 |
| 18 | Observability | Steps 2, 4 (incremental) |

---

*TD3 — Implementation Plan v2.0 · March 2026*

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-03-18 | **Phase 1 Shared Types cleanup:** Created `libs/shared-types/` with all 15 canonical types from section 0.1. Added `@td3/shared-types` path alias to `tsconfig.base.json`, frontend `tsconfig.json`, and `vite.config.ts`. Updated backend `drone.model.ts` and `weapon-platform.model.ts` to import from shared-types; schema now mirrors `IDrone`/`IWeaponPlatform`. Updated frontend stores, hooks, and utils to use `@td3/shared-types`. Removed `frontend/src/types/` (local duplicate types). Marked Step 1 complete. |
| 2026-03-18 | **Phase 2.1 Backend engagement cleanup:** Removed `handleDroneHit` and `POST /drones/:droneId/hit` route. Removed `engagementHistory`/`isEngaged` usage from socket-service and drone routes. Fixed `createTestDrones`: `FixedWing` (not `Fixed Wing`), `threatLevel` 0.0–1.0. Fixed `updateDrone`: threatLevel 0.0–1.0, removed engagementHistory push. Platform init now includes `ammoCount`/`killCount`. History route stubbed (returns `[]`) until TelemetryLog. Removed commented code from socket-service. |
| 2026-03-18 | **Phase 2.2 TelemetryLog + model cleanup:** Created `backend/src/models/telemetry-log.model.ts` per 2.2.1–2.2.3. Wired `GET /api/drones/:droneId/history` to query TelemetryLog. Platform init route now includes `ammoCount`/`killCount`. Added checkbox format to Phase 2.1/2.2 in Implementation Plan. |
| 2026-03-18 | **Phase 2.3 Routes and error handler cleanup:** Created `backend/src/lib/errorHandler.ts` with `sendError()` for structured error bodies. Removed `/routes-check`, `/drones/check`, and all commented code from drone.routes. Standardized all route handlers to use `sendError()`. Added DroneStatus validation for `PUT /drones/:droneId/status`. Reordered routes so `/drones/status` and `/drones/clear` precede `/drones/:droneId`. Cleaned main.ts: removed commented Socket.io block, fixed error middleware, ISO timestamp for health. |
| 2026-03-18 | **Phase 2.4 Heartbeat handler:** Added `heartbeat:ping` listener in socket-service; on receipt emits `heartbeat:pong` to same socket. Removed nested disconnect listener bug from requestDroneUpdate. Removed commented CORS block. |
| 2026-03-18 | **Phase 2.5 Acceptance criteria review:** Reformatted as table with dependency and status columns. 2.5.1 and 2.5.6 verifiable now; 2.5.2–2.5.5 blocked on Step 2.1 (engagement handler). |
| 2026-03-18 | **Phase 2 + Phase 3.1–3.2:** Added Phase 2 status line. Phase 3.1 zustand/immer confirmed in package.json. Phase 3.2 droneStore: rewritten with Immer, Map<string,IDrone>, updateDrone, removeDrone, clearDrones, getSortedByDistance (uses calculateDistance, filters Confirmed/Engagement Ready). Created targetStore for selection. Updated useSocket (updateDrone), useDrones (targetStore, getSortedByDistance). |
| 2026-03-18 | **Phase 3.3–3.5 store cleanup:** targetStore: confirmed spec compliance. platformStore: simplified to platform | null + updatePlatform only; removed turretStatus, currentTarget, killLog, addKill, selector hooks. connectionStore: created with status, lastHeartbeat, setStatus, recordHeartbeat. Refactored usePlatform to use targetStore for selection, local state for turretStatus. |
| 2026-03-18 | **Phase 3.6–3.7:** Created engagementLogStore.ts with log, appendLog, clearLog (max 200). Fixed TypeScript: LogEntries (Copter→Circle), LogPanel (export types, fix mock), tsconfig.app rootDir+include for shared-types. All stores compile with zero errors. |
| 2026-03-18 | **Phase 2.1 + 4.1–4.4:** Added "(pending — not yet implemented)" to 2.1 header. socket.io-client already in deps. useSocket: useRef, VITE_SOCKET_URL fallback 3333, reconnection config, connectionStore/connectionStore/platformStore/engagementLogStore routing, droneUpdate+drone:update, platform:status, drone:destroyed, drone:hit, drone:missed, heartbeat:ping/pong (5s interval, 12s watchdog). Mounted useSocket in App.tsx. Backend: emit platform:status on connect. |
| 2026-03-18 | **Phase 4.5 Acceptance:** Added temporary debug display in Navbar showing `connectionStore.status` (Connected/Offline/Degraded) and `droneStore.drones.size`. Enables verification of 4.5.1–4.5.4 without React DevTools. Manual verification: start backend+frontend → status=Connected, drones populate; stop backend → status→Offline within ~15s; restart backend → status→Connected without reload. |
| 2026-03-18 | **Phase 5.1–5.4:** Checked off 4.5.1–4.5.4. Installed @mui/icons-material@^6, @fontsource/jetbrains-mono. Created theme.ts: dark palette, JetBrains Mono typography, MuiPaper/MuiButton overrides; enhanced with MuiAppBar, MuiCard, MuiDrawer, MuiTextField, divider. Created router.tsx: / → Navigate /dashboard, /dashboard → DashboardView, /history commented. Created views/DashboardView.tsx (wraps MainLayout). main.tsx: ThemeProvider, CssBaseline, @fontsource/jetbrains-mono. App: RouterProvider. index.css: theme colors, JetBrains Mono font. MainLayout: theme background. |
| 2026-03-18 | **Phase 5.5 Acceptance:** index.html body inline critical styles (background #0A0E1A, color, font-family) to prevent white flash before React load. index.css: html+body font cascade, explicit #0A0E1A background. Meets 5.5.1 (no flash), 5.5.2 (body bg), 5.5.3 (JetBrains Mono + monospace fallback). |
| 2026-03-18 | **Phase 6 Layout cleanup:** DashboardView with flex layout (h-screen, overflow hidden), header, three-zone main row (left 280px, center flex-1, right 320px), bottom bar. Created Header (Navbar), BottomBar, StatusPanel (StatusCards+LogPanel), TargetPanel (PriorityTargetPanel), MapContainer (RadarDisplay). 768px responsive: MUI Drawers for sidebars, IconButtons in header. Borders #1A3A5C. Removed MainLayout, duplicate StatusCards from Navbar. StatusCards grid-cols-2 on narrow. |
| 2026-03-19 | **Step 7 Leaflet map:** Replaced RadarDisplay with Leaflet map. Installed leaflet, react-leaflet@4, @types/leaflet. MapContainer: CartoDB dark tiles, Vite icon fix (import marker images). Created PlatformMarker (XM914E1 + heading arrow), DroneMarker (SVG arrow, color by status, TargetLockRing when selected), RangeCircles (2km green, 5km amber dashed), LineOfFire (platform→target). Deleted RadarDisplay. |
| 2026-03-19 | **Step 7 checkboxes:** Marked 7.1–7.8 complete. Renamed TargetLockRing keyframe to `pulseRing` per 7.7.1. |
| 2026-03-19 | **Step 7.8 acceptance criteria tests:** MapContainer.spec.tsx (7.8.1 tiles/platform, 7.8.2 drone markers, 7.8.4 click→line of fire, 7.8.5 range circles, 7.8.6 stable keys). DroneMarker.spec.tsx (7.8.3 status colors, 7.8.4 click→setSelected). RangeCircles.spec.tsx (7.8.5 2km/5km). LineOfFire.spec.tsx (7.8.4 polyline, 7.6.3 null). All 15 tests pass. |
| 2026-03-19 | **Step 8.1–8.5 Status Panel:** StatusCards rewritten with data bindings: platformStore, connectionStore, droneStore, engagementLogStore. 8.2: XM914E1, 3rd Marine Brigade, turret badge (OPERATIONAL/LOW AMMO/OFFLINE). 8.3: LAT/LNG/HDG formatted. 8.4: DETECTED, IDENTIFIED, CONFIRMED, KILLS, ENGAGEMENTS, AMMO (amber when &lt;50). 8.5: Connection badge with dot (#00C853/#FFB300/#FF1744), Degraded blink, Offline LAST CONTACT. Added connection-blink keyframe to index.css. |
| 2026-03-19 | **Step 8.6 acceptance criteria tests:** StatusCards.spec.tsx for 8.6.1 (all fields populate), 8.6.2 (Offline + LAST CONTACT with fake timers), 8.6.3 (KILLS/AMMO update). Added data-testid for kills-count, ammo-count, connection-status. All Phase 8 tests pass (StatusPanel + StatusCards). |
| 2026-03-19 | **Step 9.1–9.2 Target Panel:** Created PriorityTargetList (9.1) and DroneDetailPanel (9.2). TargetPanel now contains both. PriorityTargetList: getSortedByDistance, empty when platform null, clickable cards with full spec (ID, type, status badge, DIST/BRG/ALT/SPD, threat bar green/amber/red, numbered 1–3, selected border #1E90FF). Client-side distance/bearing via calculateDistance/calculateBearing. DroneDetailPanel: NO TARGET SELECTED when null, full drone detail + ✓ WITHIN ENGAGEMENT RANGE when Engagement Ready. Removed PriorityTargetPanel. TargetPanel.spec.tsx for 9.1.1, 9.1.2, 9.2.2, 9.2.3. |
| 2026-03-19 | **Step 9.3 + enableMapSet:** TargetPanel.spec.tsx for 9.3.1 (Confirmed/Engagement Ready only), 9.3.2 (sorted by distance), 9.3.3 (click→blue border), 9.3.4 (real-time update without losing selection), 9.3.5 (destroyed→NO TARGET, no auto-select). Added enableMapSet() to droneStore for Immer Map support (fixes removeDrone in tests). |
| 2026-03-19 | **Step 10.1–10.3 Bottom Bar:** BottomBar: 10.1.1 layout (PREV, target label, NEXT, FIRE), 10.1.2 engagement log feed (last 10, HH:mm:ss, droneId → outcome ✓/✗). 10.2: canFire (Engagement Ready + !firing + platform.isActive), FIRE pulse glow, NO TARGET when disabled, ENGAGING… amber when firing. 10.3: handler with socket check, 350ms timeout. useSocket: drone:destroyed calls nextTarget after remove. PREV/NEXT disabled when sortedIds.length &lt; 2. LogPanel: wired to engagementLogStore, removed mock data and Update Log. Deleted LogEntries.tsx. Added fire-pulse-glow keyframe. |
| 2026-03-19 | **Step 10.4–10.5:** Marked 10.4.1–10.4.4 and 10.5.1–10.5.2 complete (already implemented). Added BottomBar tests for 10.4.2/10.4.3 (PREV/NEXT change selection) and 10.5.2 (log entry format ✓/✗). |
| 2026-03-19 | **Step 10.6 acceptance criteria tests:** BottomBar.spec.tsx for 10.6.1 (FIRE disabled/labeled NO TARGET), 10.6.2 (FIRE activates with fire-pulse when Engagement Ready), 10.6.3 (emit engagement:fire, ENGAGING… ~350ms), 10.6.4 (appendLog→log feed), 10.6.5 (remove+nextTarget→auto-advance), 10.6.6 (Next/Prev wrap). All 13 BottomBar tests pass. |
| 2026-03-19 | **Step 11.1–11.3 Header and connection badge:** Rewrote Header.tsx per 11.1 (left: TD3 primary.main + TACTICAL DRONE DEFENSE DASHBOARD text.secondary; right: connection badge + drawer toggles on mobile). 11.2: status from useConnectionStore, ● colored #00C853/#FFB300/#FF1744, Degraded blink. 11.3: full width, real-time badge, mobile drawer toggles. DashboardView passes isMobile and onOpenLeftPanel/onOpenRightPanel to Header. Header.spec.tsx for 11.1–11.3. Removed Navbar from Header. |
| 2026-03-19 | **LocationPicker positioning and tests:** Fixed LocationPicker rendering behind Leaflet map (z-index 50 < Leaflet ~700). Renders via createPortal to document.body with z-index 9999. Added p-4 padding for small screens. LocationPicker.spec.tsx: overlay z-index ≥9999, portal to body, backdrop/modal click behavior, Cancel/Apply. DashboardView.spec.tsx: integration test—open hamburger → Change location → overlay z-index > 700. Header.spec.tsx: removed connection badge tests (badge removed in hamburger redesign). |
| 2026-03-19 | **Left sidebar layout and telemetry gauges:** DroneDetailPanel: formatAltitude/formatSpeed (1 decimal) to prevent long-float overflow; truncate on grid cells; min-w-0. TelemetryGauges: card wrapper (bg-slate-800/80, border), "Telemetry" title, data-testid. ThreatMeter: label below bar to prevent truncation; bar 120px; WIDTH 140. All gauges: WIDTH 140, min-w-0. formatters.ts: formatAltitude, formatSpeed. formatters.spec.ts + TargetPanel layout tests: formatted values, no raw floats, telemetry card, gauge labels visible. |
| 2026-03-19 | **Telemetry over map:** Moved telemetry from sidebar to floating overlay on map. TelemetryOverlay: semi-transparent (rgba 0.85, backdrop-filter blur), positioned via latLngToContainerPoint near selected drone (offset 24px), 2x2 grid of Speed/Altitude/Threat/Eng. Prob charts. Removed TelemetryGauges from TargetPanel. MapContainer.spec: overlay renders when drone selected, unmounts when deselected. |
| 2026-03-19 | **Telemetry overlay refinements:** Background 30% more transparent (0.55). Removed "Telemetry" from header. SpeedGauge: fixed top-left (donut arc, track + fill, SPD label). ElevationChart: X/Y quarter-circle (90°), arc = altitude vs elevation angle, (0,0) = vehicle (blinking), turret line = target elevation, drone point. calculateElevationAngle helper. |
| 2026-03-19 | **Telemetry overlay v2:** Fixed bottom-left of map (absolute bottom-4 left-4). ElevationChart: transparent grid lines, X/Y axis lines, tick numbers (0°–90°), ALT/elevation labels white. SpeedGauge: 40% larger arc, tick numbers (0/100/200/300), bold value "X km/h". EngagementProbability: full "Engagement Probability" label. |
| 2026-03-19 | **Telemetry overlay v3:** EngagementProbability: temperature-meter horizontal bar above text, white font. SpeedGauge: "Speed" title below chart, scale 0–100 km/h (ticks 0/25/50/75/100) so data visible. Threat + Engagement cells: pt-4 for horizontal alignment. |
| 2026-03-19 | **Step 12.1–12.5 D3 Telemetry Gauges:** Installed d3 and @types/d3. Created SpeedGauge, AltitudeBar, ThreatMeter, EngagementProbability in frontend/src/components/gauges/. All follow 12.3 pattern (ref, useEffect, clear+redraw). SpeedGauge: semicircle arc, green→amber→red. AltitudeBar: vertical bar, #1E90FF. ThreatMeter: horizontal bar, green→red. EngagementProbability: (1−d/2000)*0.85, red/amber/green. TelemetryGauges composes all four. TargetPanel renders gauges at bottom when selectedDroneId non-null. |
| 2026-03-19 | **Step 12.6 acceptance criteria tests:** TargetPanel.spec.tsx for 12.6.1 (all four gauges render with drone values), 12.6.2 (telemetry update→gauges re-render), 12.6.3 (deselect/destroyed→gauges unmount). All 13 TargetPanel tests pass. |
| 2026-03-19 | **Telemetry overlay UX refinements:** SpeedGauge: "Speed" title centered with top margin, big digital readout (00 km/h) in center of arc. ThreatMeter + EngagementProbability: % inside bar (filled if >50%, empty if ≤50%), gradient fills (green→red, red→amber→green). Added ( ? ) help icons with MUI Tooltip (2-sentence explanations). Fifth meter: CompassSpeedGauge (compass + heading needle + speed in center). Overlay grid 3 cols top (Speed, Elevation, CompassSpeed), 2 cols bottom (Threat, Engagement). Width 440px. |
| 2026-03-19 | **Telemetry overlay v4:** Replaced ( ? ) with HelpOutlineIcon. SpeedGauge: digital readout with number + km/h on separate lines (km/h below to avoid arc intersection), reduced left offset, "SPEED" label below. CompassSpeedGauge: removed "HDG", degrees only, +30% font, "HEADING" label below. Vertical layout (one reading per row). Removed outer background; each reading has transparent container (Speed/Elevation/Compass: 140×140; Threat/Engagement: 140×56). |
| 2026-03-19 | **Telemetry overlay v5:** Increased container sizes (180×180 square, 72px bar). SpeedGauge: digital readout centered in arc using centroid (4R/3π), SPEED label below with clearance from tick labels. Threat/Engagement: question icons moved inline with labels (THREAT, Engagement Probability). Gauge sizes scaled (SpeedGauge 180×170, ElevationChart 180, CompassSpeedGauge 180×230). Added TelemetryOverlay.spec.tsx and SpeedGauge.spec.tsx for fit/readability tests. |
| 2026-03-19 | **Telemetry overlay v6:** Removed drone ID title from overlay. Zoom controls moved to bottom-right (ZoomControl position="bottomright"). SpeedGauge: bottom semicircle (0 left, 100 right), tick labels evenly spaced, readout and SPEED title centered at (0,0). ElevationChart: increased padding, X axis line more visible above container edge. CompassSpeedGauge: reduced radius (50), shifted center down for top clearance. |
| 2026-03-19 | **Telemetry overlay v7:** SpeedGauge: scale 0–200 km/h, major ticks every 10, half ticks every 5, 0 at true arc start, increased top margin (cy=42), reduced bottom margin. ElevationChart: positive X quadrant only (no negative X), arc lines and blue highlight on right side, blue 65% transparent (opacity 0.35). |
| 2026-03-19 | **Telemetry overlay v8:** SpeedGauge: right semicircle (0 at top, 200 at bottom), centered (cy=HEIGHT/2-8), fill starts at 0 tick. ElevationChart: fixed d3 angle convention (0=12oc, π/2=3oc) — arc/radial lines/blue highlight now in positive X quadrant only (right side). |
| 2026-03-19 | **Telemetry overlay v9:** SpeedGauge: 270° arc like car speedometer (0 bottom-left, 200 bottom-right, clockwise). ElevationChart: radial ticks use d3 coords (x=sin, y=-cos) so they stay in upper-right quadrant (positive X, positive Y), not below X axis. |
| 2026-03-19 | **Frontend Fix — cache size settings + defaults:** uiStore: added zustand persist middleware for weaponSize/droneSize to localStorage (key `td3-ui-settings`). Default weaponSize 1.3 (+30% vehicle), droneSize 1.15 (+15% drones). User preferences persist across sessions. |
| 2026-03-19 | **Frontend Fix — consolidate target details:** Removed DroneDetailPanel. Target details (ID, type, status, distance, bearing, IN RANGE) now in TelemetryOverlay header on map. TargetPanel: PriorityTargetList only; slim "Select a target from the list above" footer when targets exist but none selected. Deleted DroneDetailPanel.tsx. Updated TargetPanel.spec and TelemetryOverlay.spec. |
| 2026-03-19 | **Frontend Fixes 695–698:** Cmd+Enter (Mac) / Ctrl+Enter (PC) to fire; shortcut label (⌘↵ / Ctrl+↵) under button. MapFireButton: centered at bottom of map (bottom-6), glowing (fire-pulse), grow/shrink idle (fire-breathe), recoil on press (fire-recoil). FIRE moved from BottomBar to map. BottomBar: PREV/NEXT + log only. |
| 2026-03-19 | **Frontend Fixes 699–701:** Sound volume slider in Header settings (uiStore, persisted). DieselAmbient: diesel-idle loops when platform active. mechanical-clamp: first 1.5s with 500ms fade on swivel (PlatformMarker heading change). a-10-warthog on fire (MapFireButton). lib/sounds.ts, DieselAmbient.tsx. |
| 2026-03-19 | **Fire button + Ammo overlay:** Fire button fixed at bottom-6 (no shift when explanation shows). Explanation absolute bottom-2. AmmoOverlay: top right, minigun mock image, depletion gradient (ammo/2000), casino rolling typography on change, fire-breathe animation. |
| 2026-03-19 | **Frontend Fixes 703–708:** (703) Ammo depletes correctly; default ammo 2000 for new platform. (704) AmmoOverlay: removed container, fire-breathe only during firing/depletion. (705) MINIGUN_STATS in constants; StatusCards Weapon System shows ROF 200/min, muzzle 805 m/s, effective 300 m, max 4,000 m. (706) PlatformMarker turret: 0.6s ease-out transition. (707) LineOfFire: permanent Tooltip with distance (m). (708) MapClickToDeselect: click map (not drone) deselects target. |
| 2026-03-19 | **Fire button + LineOfFire fixes:** MapFireButton: uses firingDroneIdRef so ENGAGING resets on drone:destroyed even when useSocket runs first and changes selectedDroneId. LineOfFire: textRotation exported and normalized (bearing % 360), rotation kept in [0, 180) so text never flips upside down; key={targetDrone.droneId} on Polyline so tooltip position resets when target changes. LineOfFire.spec: added textRotation test (rotation in [0, 180)); mock includes Tooltip. |
| 2026-03-19 | **LineOfFire text parallel to line:** Previous formula gave perpendicular text (bearing>=180 → bearing-180 produced horizontal text on vertical line). Fixed: rotation=(bearing+90)%360 for parallel (CSS rotate(0)=horizontal; line at bearing B needs B+90 for parallel). Flip when r in (90,270) to avoid upside down. Text now runs along the line; target at (-x,+y) no longer shows upside-down text. |
| 2026-03-19 | **MapFireButton ENGAGING reset on target change:** Added useEffect so when selectedDroneId changes to a different drone than the one being fired at, firing state resets (no longer stuck). MapFireButton.spec: "ENGAGING resets when user changes target (not stuck)" — fire at D1, switch to D2, expect ENGAGING to clear. |
| 2026-03-19 | **Priority targets: engageable only, sorted by threat:** droneStore.getEngageableTargets: Engagement Ready only, altitude ≤ 500m, not friendly, sorted by threat descending. PriorityTargetList, TargetPanel, BottomBar, MapFireButton, useSocket, useDrones now use getEngageableTargets for target list and PREV/NEXT. TargetPanel.spec: 9.3.1 (engageable only), 9.3.2 (sorted by threat). |
| 2026-03-19 | **Ammo/HP engagement overhaul:** Hit probability reduced 85% (×0.15). Drones have hitPoints (1–10 random). Multi-hit: each hit decrements HP; drone:destroyed only when HP=0. IDrone + Drone schema + createTestDrones + test route: hitPoints. TelemetryOverlay + PriorityTargetList: show HP. 200 rounds/min unchanged. |
| 2026-03-19 | **Implementation Plan 709–716 (partial):** (709) Tether sounds: fire sound on recoil start; ricochets on drone:hit/drone:destroyed. (710) Turret image +15° clockwise for barrel alignment. (712) Turret recoil: opposite-heading x/y translate on fire, reset after 180ms. (715) BottomBar: removed engagement log (right sidebar only), height shrunk. (716) LogPanel: most recent first (store prepends), new entries animate in (fade+pop). |
| 2026-03-19 | **Implementation Plan 715–719 expansion:** Added Section 12a with structured sub-tasks for tracer rounds (12a.1), hit/miss markers (12a.2), range accuracy cone (12a.3), and friendlies (12a.4). Includes dependencies, output files, approach bullets, and acceptance criteria (12a.5). |
| 2026-03-19 | **Tracer rounds, accuracy cone, hide downed drones:** Backend: emit landingPosition in drone:hit/drone:missed; miss = cone scatter (angle ±cone, overshoot 50–150m). Frontend: TracerOverlay (dotted lines, + hit / × miss, 1s fade), AccuracyCone (polygon aligned with turret/target), showDyingDrones: false (hide skull overlay), filter DroneMarker to exclude Hit/Destroyed. |
| 2026-03-19 | **12a completion, 13.1, accuracy, port fix:** Marked 12a.1–12a.3, 12a.5.1–12a.5.2 complete. Hit probability 0.55 for better targeting. dev:kill-port script frees 3333 before dev. 13.1 Approach vector: 70% of drones nudge heading 5–15° toward platform bearing per tick, move in heading direction; 30% patrol (random). |
| 2026-03-19 | **13.2–13.4:** Speed escalation (distance <3km: +5 km/h/tick cap 250; ≥3km: 80–130 by type). Threat level = 1 − distance/5000. Status progression: 3 ticks within 5km → Identified; threatLevel>0.5 & <3km → Confirmed; <2km → Engagement Ready. Emit drone:status on change. Frontend: drone:status handler. |
| 2026-03-19 | **13.5–13.7:** Evasive maneuver: on miss, flag evading 5 ticks; ±45° jink, +30 km/h. Swarm formation: 3+ drones get slot bearings 120° apart. backend-e2e/drone-behavior.spec.ts: 13.7.1, 13.7.2, 13.7.4 automated; 13.7.3 manual. |
| 2026-03-19 | **60fps simulation:** updateInterval 16ms. Throttle drone.save() to 500ms or on status change. Time-based: speed += 5*(dt/1000) km/h/s; msWithin5km>=6000 for Identified; evadingMsRemaining 10s; heading nudge scaled by dt/2000. simulation:rate emitted every second; connectionStore.simulationRate; StatusCards shows "X drone updates/s". PLATFORM_CONSTANTS.UPDATE_INTERVAL 16. |
| 2026-03-19 | **Stable drone movement:** droneBaseSpeed per drone when >=3km (no random each tick); fixed 8 deg/s heading nudge; patrol ±2 deg heading, ±1m altitude; evading ±15° jink, +30 km/h/s. **MapFireButton:** useThrottledValue(150ms) for turret/barrel state; flex center for button + description. |
| 2026-03-19 | **Smooth drone flight:** All drones move via destinationPoint (heading + speed). No random lat/lng. Approach (70%): nudge 8 deg/s toward platform. Cruise (30%): arc turn every 25–40s, 3 deg/s. Flight trail: dotted line when drone selected (droneTrails in droneStore). Tests: calculations.spec (movement math), FlightTrailOverlay.spec, drone-behavior 13.7.5 (heading consistency). |
| 2026-03-19 | **Step 14.1–14.6 PWA and offline mode:** Installed vite-plugin-pwa (^0.20.5). VitePWA: registerType autoUpdate, globPatterns (js,css,html,ico,png,svg,woff2), runtimeCaching: CartoDB map tiles (CacheFirst, 200 entries, 24h), /api/* (NetworkFirst, 50 entries, 300s). Manifest: name, short_name TD3, theme #0F3460, background #0A0E1A, fullscreen, landscape, icons 192/512. Icons in public/icons/. offlineStorage.ts: openDB, saveTelemetry, getRecentTelemetry; td3-offline IndexedDB, telemetry store, 500 cap. useSocket: saveTelemetry on droneUpdate/drone:update. OfflineBanner: amber bar when Offline. DashboardView: OfflineBanner when connectionStore.status Offline. |
| 2026-03-20 | **Phase 14 complete, build fixes:** Fixed d3 arc() calls to pass DefaultArcObject (innerRadius, outerRadius, startAngle, endAngle) instead of null — ElevationChart, SpeedGauge. Removed unused imports (DyingDroneOverlay, TelemetryOverlay, TracerOverlay), unused readoutX (SpeedGauge), fixed useThrottledValue useEffect return. Phase 14 tasks 14.1–14.7 checked off in Implementation Plan. |
| 2026-03-20 | **CORS fix for production:** Socket.IO CORS was hardcoded to localhost only; Vercel frontend was blocked. socket-service.ts now uses CORS_ORIGIN in production (same as Express). main.ts: use `||` for empty-string fallback, add startup warning when CORS_ORIGIN unset in production. Both Express and Socket.IO read CORS_ORIGIN from env. |
