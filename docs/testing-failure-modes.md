# TD3 Failure Scenario Tests

Per Implementation Plan Presentation 11.2. Run each scenario with the app and backend, then record actual results.

## How to run

1. Start backend: `npx nx serve backend`
2. Start frontend: `npx nx serve frontend`
3. Execute each scenario below
4. Record results in the **Actual** columns

---

## Scenarios

| # | Scenario | Expected Debug Panel Behavior | Expected UI Behavior | Actual Debug Panel | Actual UI | Pass/Fail |
|---|----------|-------------------------------|----------------------|--------------------|-----------|-----------|
| 1 | Kill backend WebSocket | TELEMETRY AGE → red after 8s; all event rates → amber 0/10s; RECONNECTS increments | Status bar → OFFLINE red; drone icons freeze at last position | | | |
| 2 | Reconnect after 30s offline | RECONNECTS resets to 0; TELEMETRY AGE recovers green; event rates resume | Status bar → LIVE green; drone icons resume movement | | | |
| 3 | Fire while selected drone transitions away from Engagement Ready | PENDING FIRE stays YES for >2s then turns red | No outcome received; FIRE button re-enables | | | |
| 4 | 5+ drones simultaneously updating | DRONE MAP SIZE correct; event rate `drone:update` matches | No map flickering; target selection stable | | | |
| 5 | Next/Prev rapid cycling | SELECTION MODE → MANUAL; SELECTED ID cycles correctly | Target panel updates without flicker | | | |
| 6 | Switch to Systems View mid-engagement | PENDING FIRE resolves correctly in debug panel after return | Systems View pulse animates engagement path; return restores selection | | | |

---

## 11.3 Validation Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| 11.3.1 All acceptance criteria pass | ✅ | 184 tests pass (Steps 1–10 covered) |
| 11.3.2 Failure scenarios recorded | ⏳ | Template ready; Actual columns require manual run with backend |
| 11.3.3 No console errors in prod build | ⚠️ | Build fails at PWA service worker (terser); pre-existing, not presentation-layer |
| 11.3.4 Lighthouse accessibility | ⏳ | Requires baseline from pre-presentation-layer; run `npx lighthouse` after build |

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-03-21 | Initial template per Implementation Plan Presentation 11.2. |
| 2026-03-21 | 11.3 validation status table added. |
