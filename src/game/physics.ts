// Terrain generation and shared physics helpers.

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 600;
export const GRAVITY = 360; // world units / s^2 (tuned for readable arcs)
export const TERRAIN_SAMPLES = 260;

export function generateTerrain(seed: number, roughness: number): number[] {
  const heights = new Array(TERRAIN_SAMPLES).fill(0);
  let rnd = mulberry32(seed);

  // Midpoint displacement for a natural-looking silhouette.
  const base = new Array(TERRAIN_SAMPLES).fill(WORLD_HEIGHT * 0.62);
  const octaves = 4;
  for (let o = 1; o <= octaves; o++) {
    const freq = o * 2;
    const amp = (WORLD_HEIGHT * 0.16 * roughness) / o;
    const phase = rnd() * Math.PI * 2;
    for (let i = 0; i < TERRAIN_SAMPLES; i++) {
      const t = i / TERRAIN_SAMPLES;
      base[i] += Math.sin(t * Math.PI * freq + phase) * amp;
    }
  }
  // Flatten the outer edges a bit so players don't spawn on a cliff.
  for (let i = 0; i < TERRAIN_SAMPLES; i++) {
    const t = i / TERRAIN_SAMPLES;
    const edgeFalloff = Math.min(1, Math.min(t, 1 - t) * 6);
    heights[i] = WORLD_HEIGHT * 0.62 * (1 - edgeFalloff) + base[i] * edgeFalloff;
    heights[i] = Math.min(Math.max(heights[i], WORLD_HEIGHT * 0.38), WORLD_HEIGHT * 0.86);
  }

  // Light 3-tap smoothing pass so the silhouette reads as a soft rolling
  // curve rather than a jagged sine sum, without flattening real hills.
  const smoothed = heights.slice();
  for (let i = 1; i < TERRAIN_SAMPLES - 1; i++) {
    smoothed[i] = heights[i - 1] * 0.25 + heights[i] * 0.5 + heights[i + 1] * 0.25;
  }
  return smoothed;
}

export interface Decoration {
  x: number;
  type: "grass" | "rock" | "bush";
  size: number;
  flip: boolean;
}

// Deterministic surface decoration placed once per match; individual pieces
// are removed later if an explosion crater consumes their position.
export function generateDecorations(seed: number, count = 26): Decoration[] {
  const rnd = mulberry32(seed + 777);
  const decos: Decoration[] = [];
  for (let i = 0; i < count; i++) {
    const x = WORLD_WIDTH * (0.05 + rnd() * 0.9);
    const roll = rnd();
    const type: Decoration["type"] = roll < 0.55 ? "grass" : roll < 0.8 ? "rock" : "bush";
    decos.push({ x, type, size: 0.7 + rnd() * 0.8, flip: rnd() > 0.5 });
  }
  return decos.sort((a, b) => a.x - b.x);
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function terrainHeightAt(terrain: number[], x: number): number {
  const t = Math.min(Math.max(x / WORLD_WIDTH, 0), 0.999999);
  const idx = t * (TERRAIN_SAMPLES - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, TERRAIN_SAMPLES - 1);
  const frac = idx - i0;
  return terrain[i0] * (1 - frac) + terrain[i1] * frac;
}

export function deformTerrain(terrain: number[], x: number, radius: number, depth: number): number[] {
  const next = terrain.slice();
  for (let i = 0; i < TERRAIN_SAMPLES; i++) {
    const sx = (i / (TERRAIN_SAMPLES - 1)) * WORLD_WIDTH;
    const d = Math.abs(sx - x);
    if (d < radius) {
      const falloff = 1 - d / radius;
      next[i] = Math.min(WORLD_HEIGHT * 0.9, next[i] + depth * falloff);
    }
  }
  return next;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
}

// Ballistic preview used for the aiming dotted-line and for AI shot search.
export function simulateTrajectory(
  startX: number,
  startY: number,
  vx: number,
  vy: number,
  wind: number,
  gravityScale: number,
  terrain: number[],
  maxSteps = 240,
  dt = 1 / 30
): TrajectoryPoint[] {
  const pts: TrajectoryPoint[] = [];
  let x = startX;
  let y = startY;
  let cvx = vx;
  let cvy = vy;
  for (let i = 0; i < maxSteps; i++) {
    cvx += wind * dt * gravityScale * 0.4;
    cvy += GRAVITY * gravityScale * dt;
    x += cvx * dt;
    y += cvy * dt;
    pts.push({ x, y });
    if (x < -40 || x > WORLD_WIDTH + 40) break;
    if (y >= terrainHeightAt(terrain, x)) break;
  }
  return pts;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
