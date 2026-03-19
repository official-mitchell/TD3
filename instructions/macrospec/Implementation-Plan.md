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

### 4.5 Acceptance criteria

4.5.1. Open the app locally with the backend running. Within 5 seconds, `connectionStore.status` equals `Connected` (verify via React DevTools Zustand plugin or a temporary debug display).

4.5.2. `droneStore.drones` starts populating with `IDrone` entries within 5 seconds of the connection being established.

4.5.3. Shut down the backend process. Within 15 seconds (heartbeat interval plus watchdog timeout), `connectionStore.status` transitions to `Offline`.

4.5.4. Restart the backend. The client reconnects automatically and `connectionStore.status` returns to `Connected` without a page reload.

---

## 5. Frontend — MUI Theme and Router

**Depends on:** Nothing (can run in parallel with Steps 3 and 4).
**Output:** `apps/frontend/src/theme.ts`, `apps/frontend/src/router.tsx`, and updated `apps/frontend/src/main.tsx`.

### 5.1 Install dependencies

5.1.1. Install `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, and `react-router-dom` as production dependencies.

5.1.2. Install `@fontsource/jetbrains-mono` and import it in `main.tsx` to ensure consistent monospace typography across environments without relying on system fonts.

### 5.2 Dark military theme

5.2.1. Create `apps/frontend/src/theme.ts`. Use MUI `createTheme` with `mode: 'dark'`.

5.2.2. Set the color palette as follows: `primary.main` is `#1E90FF` (electric blue), `secondary.main` is `#FF6B35` (amber-orange), `background.default` is `#0A0E1A` (near-black navy), `background.paper` is `#0F1929` (dark card surface), `text.primary` is `#E8F4FD`, `text.secondary` is `#7B9BB5`, `success.main` is `#00C853`, `warning.main` is `#FFB300`, `error.main` is `#FF1744`.

5.2.3. Set the typography `fontFamily` to `JetBrains Mono, Courier New, monospace`. Set `h1` to `1.5rem`, bold, `0.1em` letter-spacing, uppercase. Set `h2` to `1rem`, semibold, `0.08em` letter-spacing, uppercase. Set `body2` to `0.75rem` with `0.05em` letter-spacing.

5.2.4. Apply component overrides: `MuiPaper` root should have `backgroundImage: none` and a `1px solid #1A3A5C` border. `MuiButton` root should use `border-radius: 2`, `0.1em` letter-spacing, and `font-weight: 700`.

### 5.3 Router configuration

5.3.1. Create `apps/frontend/src/router.tsx`. Define routes using `createBrowserRouter` from `react-router-dom`.

5.3.2. Route `/` must redirect to `/dashboard` using `Navigate` with `replace: true`.

5.3.3. Route `/dashboard` renders `DashboardView`. Leave the `/history` route commented out as a placeholder for the stretch phase.

### 5.4 App entry point

5.4.1. Update `apps/frontend/src/main.tsx`. Wrap the `RouterProvider` in both `ThemeProvider` (passing the `td3Theme`) and `CssBaseline` to normalize browser styles.

### 5.5 Acceptance criteria

5.5.1. Navigating to `/` redirects to `/dashboard` without a visible flash.

5.5.2. `document.body` background color is `#0A0E1A`.

5.5.3. All text uses JetBrains Mono or a monospace fallback.

---

## 6. Frontend — Dashboard Layout Shell

**Depends on:** Step 5.
**Output:** `apps/frontend/src/views/DashboardView.tsx` and four stub layout components with no internal logic yet.

### 6.1 Layout grid

6.1.1. Create `apps/frontend/src/views/DashboardView.tsx`. The root element is a full-viewport flex column (`height: 100vh`, `overflow: hidden`).

6.1.2. The header row is a fixed-height bar across the full width.

6.1.3. Below the header is a flex row that fills the remaining height. It contains three zones: a left sidebar of `280px` fixed width, a center zone that fills the remaining width with `flex: 1`, and a right sidebar of `320px` fixed width.

6.1.4. Below the three-zone row is a bottom bar of fixed height.

6.1.5. Left and right sidebars have `overflow-y: auto` so they scroll independently of the map.

6.1.6. Borders between zones use `1px solid #1A3A5C`.

### 6.2 Stub components

6.2.1. Create `apps/frontend/src/components/layout/Header.tsx` — renders a placeholder bar with the text `TD3`.

6.2.2. Create `apps/frontend/src/components/panels/StatusPanel.tsx` — renders a placeholder box labeled `STATUS PANEL`.

6.2.3. Create `apps/frontend/src/components/map/MapContainer.tsx` — renders a placeholder div with `height: 100%`, `width: 100%`, and a visible background color to confirm the zone occupies the correct space.

6.2.4. Create `apps/frontend/src/components/panels/TargetPanel.tsx` — renders a placeholder box labeled `TARGET PANEL`.

6.2.5. Create `apps/frontend/src/components/layout/BottomBar.tsx` — renders a placeholder bar labeled `BOTTOM BAR`.

### 6.3 Responsive behavior

6.3.1. Use MUI `useMediaQuery` with a `768px` breakpoint. When the viewport is narrower than 768px, both the left and right sidebars must be hidden from the inline layout and instead made accessible as MUI `Drawer` components. Add icon buttons to the header to toggle each drawer.

### 6.4 Acceptance criteria

6.4.1. The layout renders with all five zones visible on a desktop viewport without horizontal scrolling.

6.4.2. At 768px viewport width, the left and right sidebars are hidden and replaced by drawer toggle icons in the header. Clicking each icon opens the corresponding drawer.

6.4.3. The center zone fills all remaining horizontal space between the sidebars.

---

## 7. Frontend — Leaflet Map Component

**Depends on:** Steps 3, 4, and 5.
**Output:** A fully functional interactive map at `apps/frontend/src/components/map/` displaying the weapon platform, drone markers, range circles, and line of fire.

### 7.1 Install dependencies

7.1.1. Install `leaflet`, `react-leaflet` as production dependencies and `@types/leaflet` as a dev dependency.

7.1.2. **Known Vite pitfall:** Leaflet's default marker icons reference a `node_modules` path that Vite's asset pipeline cannot resolve, causing 404 errors for the marker PNG files. Fix this by calling `delete (L.Icon.Default.prototype as any)._getIconUrl` and then calling `L.Icon.Default.mergeOptions` with explicit `new URL(...)` references using `import.meta.url` for the three icon files: `marker-icon.png`, `marker-icon-2x.png`, and `marker-shadow.png`. Apply this fix once at the top of `MapContainer.tsx`.

### 7.2 File structure

7.2.1. Create the following files under `apps/frontend/src/components/map/`:
  - `MapContainer.tsx` — root map component
  - `PlatformMarker.tsx` — XM914E1 weapon platform icon with heading arrow
  - `DroneMarker.tsx` — per-drone icon, color by status, rotates to heading
  - `RangeCircles.tsx` — 2km and 5km circle overlays
  - `LineOfFire.tsx` — SVG polyline from platform to selected target
  - `TargetLockRing.tsx` — pulsing animation ring on the locked target

### 7.3 `MapContainer.tsx`

7.3.1. Read `platform` from `usePlatformStore`. Read all drone values as an array from `useDroneStore`. Read `selectedDroneId` from `useTargetStore`.

7.3.2. Default map center is `[37.7749, -122.4194]` (San Francisco — matches seed data). Default zoom is `14`. When `platform` is available, derive the center from `platform.position.lat` and `platform.position.lng`.

7.3.3. Use CartoDB dark tile layer at `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. This tile style matches the dark military theme and is free for public projects.

7.3.4. Render `RangeCircles` and `PlatformMarker` only when `platform` is non-null.

7.3.5. Render `LineOfFire` when both `platform` is non-null and a drone matching `selectedDroneId` exists in the store.

7.3.6. Render a `DroneMarker` for each drone in the store, passing `isSelected: true` for the drone whose `droneId` matches `selectedDroneId`.

### 7.4 `DroneMarker.tsx`

7.4.1. Use a `L.divIcon` containing an inline SVG arrow rotated to `drone.heading` degrees using a CSS `transform: rotate(${drone.heading}deg)` style.

7.4.2. The SVG fill color must reflect `drone.status`: `#6B7280` for `Detected`, `#EAB308` for `Identified`, `#F97316` for `Confirmed`, `#EF4444` for `Engagement Ready`, `#374151` for `Hit` or `Destroyed`.

7.4.3. When `isSelected` is true, apply the `TargetLockRing` overlay at the drone's position.

7.4.4. Attach an `onClick` handler that calls `targetStore.setSelected(drone.droneId)`.

### 7.5 `RangeCircles.tsx`

7.5.1. Render two `react-leaflet` `Circle` components centered on the platform.

7.5.2. The inner circle has `radius: 2000`, color `#00C853` (green), `fillOpacity: 0.04`, and `weight: 1.5`. This is the effective engagement range of the XM914E1.

7.5.3. The outer circle has `radius: 5000`, color `#FFB300` (amber), `fillOpacity: 0.02`, `weight: 1`, and `dashArray: '6 4'`. This is the maximum detection range.

### 7.6 `LineOfFire.tsx`

7.6.1. Render a `react-leaflet` `Polyline` with two positions: the platform position and the selected drone position.

7.6.2. Style with color `#EF4444`, `weight: 2`, and `dashArray: '8 4'`.

7.6.3. Component must render nothing when `targetDrone` is null.

### 7.7 `TargetLockRing.tsx`

7.7.1. Implement a CSS keyframe animation named `pulseRing` that scales the element from `0.9` to `1.3` and fades opacity from `1` to `0.4`, then returns, over a 1.4-second infinite loop.

7.7.2. Apply this animation to a circular div overlay positioned at the drone marker location using a Leaflet `DivIcon`.

### 7.8 Acceptance criteria

7.8.1. Map renders with CartoDB dark tiles. The platform marker is visible at the correct coordinate.

7.8.2. Drone markers appear at the correct latitude/longitude for each drone in the store.

7.8.3. Each drone marker's color matches its current status.

7.8.4. Clicking a drone marker sets it as the selected target and immediately draws the line of fire from the platform to that drone.

7.8.5. Range circles are visible at the correct radii around the platform.

7.8.6. As drone positions update via WebSocket, markers move on the map without full remount or flicker.

---

## 8. Frontend — Status Panel

**Depends on:** Steps 3 and 5.
**Output:** A fully populated `apps/frontend/src/components/panels/StatusPanel.tsx`.

### 8.1 Data bindings

8.1.1. Read `platform` from `usePlatformStore`.

8.1.2. Read `status` and `lastHeartbeat` from `useConnectionStore`.

8.1.3. Read `drones` from `useDroneStore` to compute per-status counts.

8.1.4. Read `log` from `useEngagementLogStore` for the total engagement count.

### 8.2 System block

8.2.1. Render `XM914E1` as the weapon system identifier. This value is hardcoded — it is a display label, not data from the API.

8.2.2. Render `3rd Marine Brigade` as the unit label. Also hardcoded.

8.2.3. Render a turret status badge. The badge reads `OPERATIONAL` in green when `platform.isActive` is true and `platform.ammoCount >= 50`. It reads `LOW AMMO` in amber when `ammoCount < 50`. It reads `OFFLINE` in red when `platform.isActive` is false or `platform` is null.

### 8.3 Position block

8.3.1. Render `LAT:` followed by `platform.position.lat` formatted to four decimal places.

8.3.2. Render `LNG:` followed by `platform.position.lng` formatted to four decimal places.

8.3.3. Render `HDG:` followed by `platform.heading` formatted to one decimal place, suffixed with `°`.

### 8.4 Engagement statistics

8.4.1. Render the following four counters, each derived by filtering `Array.from(drones.values())`:
  - `DETECTED:` count of drones with status `Detected`
  - `IDENTIFIED:` count with status `Identified`
  - `CONFIRMED:` count with status `Confirmed` or `Engagement Ready`
  - `KILLS:` `platform.killCount`

8.4.2. Render `AMMO:` followed by `platform.ammoCount` with a visual indication (amber color) when below 50.

### 8.5 Connection status badge

8.5.1. Render a filled circle indicator followed by the connection status string.

8.5.2. Color the dot: `#00C853` for `Connected`, `#FFB300` for `Degraded`, `#FF1744` for `Offline`.

8.5.3. When status is `Degraded`, apply a CSS blink animation to the dot at 1-second intervals.

8.5.4. When status is `Offline`, compute elapsed seconds since `lastHeartbeat` using `Date.now() - lastHeartbeat` divided by 1000, rounded down. Display as `LAST CONTACT: {n}s ago`. Update this display every second using a `setInterval` inside a `useEffect`.

### 8.6 Acceptance criteria

8.6.1. All fields populate with real data within 5 seconds of app load.

8.6.2. Shutting down the backend causes the status badge to transition to `Offline` and the elapsed-seconds counter to start incrementing.

8.6.3. After a `drone:hit` engagement, `KILLS` increments and `AMMO` decrements without a page reload.

---

## 9. Frontend — Target Panel and Drone Detail

**Depends on:** Steps 3, 4, and 5.
**Output:** `apps/frontend/src/components/panels/TargetPanel.tsx` containing both the priority target list and the drone detail panel.

### 9.1 `PriorityTargetList`

9.1.1. Retrieve the sorted target array by calling `useDroneStore(s => s.getSortedByDistance(...))` with the platform's current lat/lng. If `platform` is null, render an empty list.

9.1.2. Render each drone as a clickable card. Clicking the card calls `targetStore.setSelected(drone.droneId)`.

9.1.3. Each card displays: the drone ID in bold, drone type in secondary text, a color-coded status badge, distance formatted as `DIST: {n}km` to two decimal places, bearing as `BRG: {n}°`, altitude as `ALT: {n}m`, speed as `SPD: {n} km/h`, and a threat percentage bar reading `THREAT: {n}%`.

9.1.4. The threat percentage bar color is green when below 40%, amber between 40% and 70%, and red above 70%.

9.1.5. Cards are numbered `1`, `2`, `3` in order of distance from the platform.

9.1.6. The selected card renders with a `2px solid` border using `primary.main` (`#1E90FF`). All other cards render with the default paper border.

9.1.7. **Bug fix note:** The distance and bearing values displayed on the card must be computed client-side from the drone's current `position` and the platform's `position`. Do not rely solely on a stale backend-sent distance field, as position updates faster than distance fields may be recalculated.

### 9.2 `DroneDetailPanel`

9.2.1. Read `selectedDroneId` from `useTargetStore`. Look up the corresponding `IDrone` from `useDroneStore`.

9.2.2. When `selectedDroneId` is null or no matching drone is found in the store, render the text `NO TARGET SELECTED` centered in the panel.

9.2.3. When a drone is found, render: drone ID, drone type, status badge, an `✓ WITHIN ENGAGEMENT RANGE` indicator (visible only when `status === 'Engagement Ready'`), distance from platform, bearing, altitude, speed, threat level, raw lat/lng position, and last updated timestamp formatted as a human-readable time.

9.2.4. **Selection persistence:** The detail panel must not lose its displayed drone when a `drone:update` WebSocket event arrives. Because `targetStore` is a separate Zustand slice from `droneStore`, and `updateDrone` in `droneStore` never touches `targetStore.selectedDroneId`, the selection persists automatically. If selection is resetting unexpectedly, audit that `selectedDroneId` is not stored inside `droneStore`.

### 9.3 Acceptance criteria

9.3.1. The target list renders cards for all `Confirmed` and `Engagement Ready` drones only. `Detected` and `Identified` drones do not appear in the list.

9.3.2. Cards are sorted by ascending distance to the platform and numbered correctly.

9.3.3. Clicking a card highlights it with a blue border and populates the detail panel.

9.3.4. The detail panel values (distance, speed, altitude) update in real-time as telemetry arrives, without the card losing its selection highlight or the detail panel clearing.

9.3.5. When a drone is destroyed and removed from the store, the detail panel falls back to the `NO TARGET SELECTED` state. The next closest drone in the list is not automatically selected — that happens via the bottom bar's auto-advance logic in Step 10.

---

## 10. Frontend — Bottom Bar and FIRE Button

**Depends on:** Steps 3, 4, and 9.
**Output:** `apps/frontend/src/components/layout/BottomBar.tsx` with target navigation controls, the FIRE button, and the engagement log feed.

### 10.1 Layout

10.1.1. The bottom bar is a single horizontal row containing, left to right: the `← PREV` button, a center display showing the current target label, the `NEXT →` button, and the FIRE button on the far right.

10.1.2. Below or adjacent to the controls, render the last 10 entries of `engagementLogStore.log` as a compact scrollable feed.

### 10.2 FIRE button states

10.2.1. Derive `canFire` as true when all three conditions are met: the selected drone's status is `Engagement Ready`, the component is not in the `firing` state, and `platform.isActive` is true.

10.2.2. When `canFire` is true, render the button with a red background, label `FIRE ({platform.ammoCount})`, and a repeating pulse glow CSS animation using `box-shadow` at 1-second intervals.

10.2.3. When `canFire` is false, render the button with a muted gray background and the label `NO TARGET`. The button must have the HTML `disabled` attribute set.

10.2.4. When the `firing` state is true (immediately after FIRE is pressed and before the 350ms timeout resolves), render the button with an amber background and the label `ENGAGING...`. The button must be disabled during this window.

### 10.3 FIRE button handler

10.3.1. On click, verify `canFire` is true and a socket ref is available. If not, return without action.

10.3.2. Set local `firing` state to true.

10.3.3. Emit `engagement:fire` on the socket with `droneId` equal to `selectedDroneId` and `timestamp` equal to the current ISO 8601 time.

10.3.4. After 350ms, set `firing` back to false. The backend will handle the actual result and emit the outcome event.

10.3.5. When `drone:destroyed` is received (handled in `useSocket`), the drone is removed from `droneStore`. The bottom bar should then automatically advance to the next target: call `targetStore.nextTarget(sortedIds)` inside the `drone:destroyed` handler after the drone is removed from the store.

### 10.4 Next and Previous navigation

10.4.1. Read the sorted target ID array by calling `useDroneStore(s => s.getSortedByDistance(...)).map(d => d.droneId)`.

10.4.2. The `← PREV` button calls `targetStore.prevTarget(sortedIds)`.

10.4.3. The `NEXT →` button calls `targetStore.nextTarget(sortedIds)`.

10.4.4. Both buttons render as disabled when `sortedIds` has fewer than two entries.

### 10.5 Engagement log feed

10.5.1. Read `log` from `useEngagementLogStore`. Display the first 10 entries.

10.5.2. Each entry renders: timestamp formatted as `HH:MM:SS`, drone ID, an arrow `→`, and the outcome with a visual indicator — a green checkmark `✓` for `Hit` or `Destroyed`, a red cross `✗` for `Missed`.

### 10.6 Acceptance criteria

10.6.1. With no `Engagement Ready` drone, the FIRE button is disabled and labeled `NO TARGET`.

10.6.2. When a drone reaches `Engagement Ready`, the FIRE button activates without a page action and its pulsing glow begins.

10.6.3. Pressing FIRE emits the `engagement:fire` socket event. The button enters the amber `ENGAGING...` state for approximately 350ms.

10.6.4. On receiving `drone:hit` or `drone:missed`, a new entry appears in the log feed.

10.6.5. On receiving `drone:destroyed`, the drone disappears from the map and the target list auto-advances to the next available target.

10.6.6. Next/Prev buttons cycle through the sorted target list. Selection wraps correctly at both ends.

---

## 11. Frontend — Header and Connection Badge

**Depends on:** Steps 3 and 5.
**Output:** A fully implemented `apps/frontend/src/components/layout/Header.tsx`.

### 11.1 Layout

11.1.1. Left zone: the text `TD3` in `primary.main` color at `1.2rem` bold monospace, followed by the full title `TACTICAL DRONE DEFENSE DASHBOARD` in `text.secondary` at small caps styling.

11.1.2. Right zone: the connection status badge, then on mobile viewports the drawer toggle buttons for the left and right panels.

### 11.2 Connection status badge

11.2.1. Read `status` from `useConnectionStore`.

11.2.2. Render a filled circle `●` colored by status: `#00C853` for `Connected`, `#FFB300` for `Degraded`, `#FF1744` for `Offline`. Follow it with the status string in uppercase.

11.2.3. When `Degraded`, apply a CSS blink animation to the circle at 1-second intervals.

### 11.3 Acceptance criteria

11.3.1. Header renders across the full viewport width at all breakpoints.

11.3.2. Connection badge updates in real-time without page interaction.

11.3.3. On mobile, drawer toggle buttons are visible and functional.

---

## 12. Frontend — D3 Telemetry Gauges

**Depends on:** Steps 3 and 9.
**Output:** Four D3-powered gauge components in `apps/frontend/src/components/gauges/`, rendered in the right sidebar below `DroneDetailPanel` when a drone is selected.

### 12.1 Install dependencies

12.1.1. Install `d3` as a production dependency and `@types/d3` as a dev dependency.

### 12.2 File structure

12.2.1. Create the following files under `apps/frontend/src/components/gauges/`:
  - `SpeedGauge.tsx`
  - `AltitudeBar.tsx`
  - `ThreatMeter.tsx`
  - `EngagementProbability.tsx`

### 12.3 D3 component pattern

12.3.1. Every gauge component follows the same pattern: it holds a `ref` to an `SVGSVGElement`, runs all D3 drawing logic inside a `useEffect` that depends on the incoming `value` prop, begins the effect by calling `d3.select(svgRef.current).selectAll('*').remove()` to clear the previous render, then redraws from scratch.

12.3.2. React owns the data binding and the component lifecycle. D3 owns only the SVG drawing. Do not let D3 manage component mount or unmount.

### 12.4 Gauge specifications

12.4.1. `SpeedGauge` renders a D3 arc from 0° to 180° (semicircle). The filled arc spans proportionally from `0` to `value / max` where `max` defaults to `300` km/h. The fill color transitions from `#00C853` at zero to `#EAB308` at midrange to `#EF4444` at maximum using `d3.interpolateRgb`. Label: `{value} KM/H` centered below the arc.

12.4.2. `AltitudeBar` renders a vertical rectangle. Its filled height is proportional to `value / 1000` where 1000m is the maximum. Fill color is `#1E90FF`. Label: `{value}M` above the bar.

12.4.3. `ThreatMeter` renders a horizontal rectangle. Its filled width is proportional to the `value` (0.0 to 1.0). Fill color is interpolated using `d3.interpolateRgb('#00C853', '#FF1744')(value)`. Label: `THREAT {(value * 100).toFixed(0)}%` to the right of the bar.

12.4.4. `EngagementProbability` computes `probability = (1 - distanceMeters / 2000) * 0.85`, clamped to `[0, 1]`. Renders the probability as a large bold percentage and a small arc gauge. Color is red when below `0.5`, amber between `0.5` and `0.75`, green above `0.75`. Label: `ENG. PROB`.

### 12.5 Placement

12.5.1. Render all four gauges stacked vertically at the bottom of `TargetPanel`, visible only when `selectedDroneId` is non-null.

### 12.6 Acceptance criteria

12.6.1. Selecting a drone causes all four gauges to render with the drone's current values.

12.6.2. As telemetry updates arrive (speed and altitude changing), the D3 arcs and bars re-render with updated values. No full component remount occurs — only the inner SVG content is cleared and redrawn.

12.6.3. Deselecting the drone (or drone being destroyed) causes all gauges to unmount cleanly with no console errors.

---

## 13. Backend — Enhanced Drone Behavior

**Depends on:** Step 2.
**Output:** Updated telemetry simulation logic in `apps/backend/src/services/socket-service.ts` replacing random movement with purpose-driven swarm behavior.

### 13.1 Approach vector

13.1.1. On each simulation tick, calculate the bearing from each drone's current position to the platform's position.

13.1.2. Rather than snapping the drone's heading directly to that bearing, nudge it toward the target bearing by a random amount between 5° and 15° per tick. This simulates realistic flight path corrections rather than instant reorientation.

### 13.2 Speed escalation

13.2.1. As a drone's distance to the platform drops below 3km, increase its speed by `+5 km/h` per tick up to a maximum of `250 km/h`.

13.2.2. Above 3km, hold speed within a randomized base range of `80–130 km/h` depending on drone type.

### 13.3 Threat level calculation

13.3.1. Recalculate `threatLevel` on every tick as `1 - (distanceMeters / 5000)`, clamped to `[0, 1]`. A drone at 5km or beyond has threat level `0`. A drone at the platform has threat level `1`.

### 13.4 Automatic status progression

13.4.1. A drone spawns with status `Detected`.

13.4.2. After 3 consecutive ticks within 5km, advance to `Identified`. Emit `drone:status` on the change.

13.4.3. When `threatLevel > 0.5` and distance is under 3km, advance to `Confirmed`. Emit `drone:status`.

13.4.4. When distance is under 2km and status is `Confirmed`, advance to `Engagement Ready`. Emit `drone:status`.

13.4.5. Each status advancement is a one-way progression. A drone cannot revert to a lower status during normal approach.

### 13.5 Evasive maneuver on miss

13.5.1. When the engagement logic in Step 2 resolves a miss for a drone, flag that drone as `evading` in its in-memory state.

13.5.2. While `evading`, add a random jink of ±45° to the drone's heading and increase speed by `+30 km/h`.

13.5.3. After 5 simulation ticks, clear the `evading` flag and resume the normal approach vector behavior.

### 13.6 Swarm formation

13.6.1. When 3 or more drones are active simultaneously, space their approach bearings 120° apart around the platform. New drones that spawn slot into the next available bearing gap rather than approaching from the same direction.

### 13.7 Acceptance criteria

13.7.1. Spawn 3 drones. After 30 seconds on the map, all three drones are visibly moving toward the platform.

13.7.2. Drone statuses automatically advance through `Identified`, `Confirmed`, and `Engagement Ready` as they approach. No manual action is required to trigger progression.

13.7.3. After a missed engagement, the targeted drone visibly changes heading for several ticks before resuming its approach vector.

13.7.4. With 3 active drones, their approach vectors are spread roughly 120° apart rather than clustered.

---

## 14. PWA — Service Worker and Offline Mode

**Depends on:** Step 5.
**Output:** A Workbox-powered service worker, `manifest.json`, IndexedDB offline storage, and an offline banner component.

### 14.1 Install dependencies

14.1.1. Install `vite-plugin-pwa` as a dev dependency.

### 14.2 Vite configuration

14.2.1. Add `VitePWA` to the plugins array in `apps/frontend/vite.config.ts`.

14.2.2. Set `registerType: 'autoUpdate'` so the service worker updates silently when a new build is deployed.

14.2.3. Configure `workbox.globPatterns` to precache all `.js`, `.css`, `.html`, `.ico`, `.png`, `.svg`, and `.woff2` files.

14.2.4. Configure runtime caching with two rules: one for CartoDB map tile URLs using `CacheFirst` strategy with a cache name of `map-tiles`, max 200 entries, and a max age of 86,400 seconds (24 hours); one for all `/api/*` URLs using `NetworkFirst` strategy with a cache name of `api-cache`, max 50 entries, and a 300-second TTL.

### 14.3 Manifest

14.3.1. Set `name` to `Tactical Drone Defense Dashboard`, `short_name` to `TD3`, `theme_color` to `#0F3460`, `background_color` to `#0A0E1A`, `display` to `fullscreen`, and `orientation` to `landscape`.

14.3.2. Include two icon entries: `icon-192.png` at `192x192` and `icon-512.png` at `512x512` with `purpose: 'any maskable'`.

### 14.4 PWA icons

14.4.1. Create `apps/frontend/public/icons/icon-192.png` — 192×192 pixels, dark navy (`#0F3460`) background with a white crosshair or `TD3` lettermark centered.

14.4.2. Create `apps/frontend/public/icons/icon-512.png` — 512×512 pixels, same design.

### 14.5 IndexedDB offline storage

14.5.1. Create `apps/frontend/src/lib/offlineStorage.ts`. It must export three functions: `openDB()` which opens or creates a version-1 IndexedDB database named `td3-offline` with an object store named `telemetry` keyed by `timestamp`; `saveTelemetry(entry: object)` which writes a record to the store; and `getRecentTelemetry()` which retrieves all records and returns the newest 500.

14.5.2. Each write operation must also prune the store so it never exceeds 500 entries. Delete the oldest entries to maintain the cap.

14.5.3. Call `saveTelemetry(drone)` inside the `drone:update` handler in `useSocket.ts` (Step 4.2.7 above).

### 14.6 Offline banner

14.6.1. Create `apps/frontend/src/components/layout/OfflineBanner.tsx`. It renders a fixed-position amber bar across the full top of the screen with the text `⚠ CONNECTION LOST — DISPLAYING LAST KNOWN STATE`.

14.6.2. In `DashboardView.tsx`, subscribe to `connectionStore.status`. Render `OfflineBanner` when status is `Offline`.

### 14.7 Acceptance criteria

14.7.1. Run `npx nx build frontend` and serve the output with a static server. Run the Lighthouse PWA audit. All three PWA checklist items must pass: installable, offline capability, and icons.

14.7.2. Disable the network tab in browser DevTools after the app has loaded. Reload the page. The app loads from cache with no network requests failing.

14.7.3. The offline banner is visible after the network is disabled and the heartbeat watchdog has timed out.

14.7.4. Open the Application tab in DevTools. Under IndexedDB, confirm `td3-offline` / `telemetry` contains drone records.

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

15.2.2. Set Root Directory to `apps/backend`.

15.2.3. Set Build Command to `npm install && npx tsc`.

15.2.4. Set Start Command to `node dist/main.js`.

15.2.5. Add environment variables: `MONGO_URI` from step 15.1.4, `CORS_ORIGIN` set to the Vercel URL (update this after deploying in step 15.3), `NODE_ENV` set to `production`, and `PORT` set to `3000`.

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
