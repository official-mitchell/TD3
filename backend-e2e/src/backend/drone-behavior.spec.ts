/**
 * 13.7 Acceptance criteria for enhanced drone behavior.
 * Requires backend running at BASE_URL (default localhost:3333).
 * Run: nx run backend:serve (in one terminal), then nx run backend-e2e:e2e
 */
import axios from 'axios';

const BASE_URL = process.env.TEST_API_URL ?? 'http://localhost:3333';
const PLATFORM_POS = { lat: 25.905310475056915, lng: 51.543824178558054 };

function haversineDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371e3;
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function bearingFromPlatform(
  platform: { lat: number; lng: number },
  drone: { lat: number; lng: number }
): number {
  const φ1 = (platform.lat * Math.PI) / 180;
  const φ2 = (drone.lat * Math.PI) / 180;
  const λ1 = (platform.lng * Math.PI) / 180;
  const λ2 = (drone.lng * Math.PI) / 180;
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

async function isBackendUp(): Promise<boolean> {
  try {
    const res = await axios.get(`${BASE_URL}/api/health`, { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

describe('13.7 Drone behavior acceptance criteria', () => {
  beforeAll(async () => {
    const up = await isBackendUp();
    if (!up) {
      console.warn(
        'Backend not reachable at',
        BASE_URL,
        '- skipping drone behavior e2e tests. Run: nx run backend:serve'
      );
    }
  }, 5000);

  it('13.7.1: Spawn 3 drones, after 30s all moving toward platform', async () => {
    const up = await isBackendUp();
    if (!up) return;

    await axios.post(`${BASE_URL}/api/drones/clear`);
    await axios.post(`${BASE_URL}/api/drones/test-types`);

    const initial = await axios.get(`${BASE_URL}/api/drones`);
    const drones = initial.data
      .filter((d: { status: string }) => !['Hit', 'Destroyed'].includes(d.status))
      .slice(0, 3);
    expect(drones.length).toBeGreaterThanOrEqual(3);

    const initialDistances = drones.map((d: { position: { lat: number; lng: number } }) =>
      haversineDistance(PLATFORM_POS, d.position)
    );

    await new Promise((r) => setTimeout(r, 32000)); /* ~16 ticks at 2s */

    const after = await axios.get(`${BASE_URL}/api/drones`);
    const afterDrones = drones.map(
      (d: { droneId: string }) => after.data.find((x: { droneId: string }) => x.droneId === d.droneId)
    ).filter(Boolean);

    let movedCloser = 0;
    for (let i = 0; i < drones.length; i++) {
      const beforeDist = initialDistances[i];
      const afterD = afterDrones.find(
        (a: { droneId: string }) => a.droneId === drones[i].droneId
      );
      if (afterD && !['Hit', 'Destroyed'].includes(afterD.status)) {
        const afterDist = haversineDistance(PLATFORM_POS, afterD.position);
        if (afterDist < beforeDist - 50) movedCloser++;
      }
    }
    expect(movedCloser).toBeGreaterThanOrEqual(2);
  }, 45000);

  it('13.7.2: Drone statuses auto-advance through Identified, Confirmed, Engagement Ready', async () => {
    const up = await isBackendUp();
    if (!up) return;

    await axios.post(`${BASE_URL}/api/drones/clear`);
    await axios.post(`${BASE_URL}/api/drones/test-targets`);

    await new Promise((r) => setTimeout(r, 25000)); /* ~12 ticks */

    const res = await axios.get(`${BASE_URL}/api/drones/status`);
    const statuses = res.data.drones.map((d: { status: string }) => d.status);
    const advanced = statuses.filter((s: string) =>
      ['Identified', 'Confirmed', 'Engagement Ready'].includes(s)
    );
    expect(advanced.length).toBeGreaterThanOrEqual(1);
  }, 35000);

  it('13.7.4: With 3+ drones, approach vectors spread ~120° apart', async () => {
    const up = await isBackendUp();
    if (!up) return;

    await axios.post(`${BASE_URL}/api/drones/clear`);
    await axios.post(`${BASE_URL}/api/drones/test-types`);

    await new Promise((r) => setTimeout(r, 15000)); /* ~7 ticks */

    const res = await axios.get(`${BASE_URL}/api/drones`);
    const active = res.data
      .filter((d: { status: string }) => !['Hit', 'Destroyed'].includes(d.status))
      .slice(0, 3);

    if (active.length < 3) return;

    const bearings = active
      .map((d: { position: { lat: number; lng: number } }) =>
        bearingFromPlatform(PLATFORM_POS, d.position)
      )
      .sort((a: number, b: number) => a - b);

    const gaps = [
      (bearings[1] - bearings[0] + 360) % 360,
      (bearings[2] - bearings[1] + 360) % 360,
      (bearings[0] - bearings[2] + 360) % 360,
    ];
    const minGap = Math.min(...gaps);
    const maxGap = Math.max(...gaps);
    expect(minGap).toBeGreaterThan(60);
    expect(maxGap).toBeLessThan(180);
  }, 25000);

  it('13.7.5: Drone movement is consistent with heading (no jitter)', async () => {
    const up = await isBackendUp();
    if (!up) return;

    await axios.post(`${BASE_URL}/api/drones/clear`);
    await axios.post(`${BASE_URL}/api/drones/test-types`);

    const snap1 = await axios.get(`${BASE_URL}/api/drones`);
    const drones1 = snap1.data
      .filter((d: { status: string }) => !['Hit', 'Destroyed'].includes(d.status))
      .slice(0, 3);

    await new Promise((r) => setTimeout(r, 2000)); /* ~125 ticks at 16ms */

    const snap2 = await axios.get(`${BASE_URL}/api/drones`);
    let consistentCount = 0;
    for (const d1 of drones1) {
      const d2 = snap2.data.find((x: { droneId: string }) => x.droneId === d1.droneId);
      if (!d2 || ['Hit', 'Destroyed'].includes(d2.status)) continue;

      const dist = haversineDistance(d1.position, d2.position);
      if (dist < 1) continue; /* stationary */

      const bearing = bearingFromPlatform(d1.position, d2.position);
      const heading = d2.heading ?? d1.heading ?? 0;
      let diff = Math.abs(bearing - heading);
      if (diff > 180) diff = 360 - diff;
      /* Movement direction should align with heading within 30° (allows arc turns) */
      if (diff < 30 || diff > 330) consistentCount++;
    }
    expect(consistentCount).toBeGreaterThanOrEqual(2);
  }, 15000);
});
