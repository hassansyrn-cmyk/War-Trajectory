import {
  Difficulty,
  FloatingText,
  GamePhase,
  MapDef,
  Particle,
  PlayerId,
  PlayerState,
  Projectile,
  SKILLS,
  WEAPONS,
  WeaponDef,
  makePlayer,
} from "./entities";
import {
  GRAVITY,
  TERRAIN_SAMPLES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clamp,
  deformTerrain,
  dist,
  generateTerrain,
  simulateTrajectory,
  terrainHeightAt,
} from "./physics";

export const PLAYER_HEIGHT = 44;
export const PLAYER_WIDTH = 22;
export const PLAYER_HIT_RADIUS = 30;
export const HEAD_MULT = 2.2;
export const MAX_DRAG = 230;
export const MAX_LAUNCH_SPEED = 560;
const STEP = 1 / 120;
const RESOLVE_TIME = 0.9;

export interface GameState {
  map: MapDef;
  terrain: number[];
  wind: number;
  turn: PlayerId;
  phase: GamePhase;
  players: Record<PlayerId, PlayerState>;
  selectedWeapon: Record<PlayerId, string>;
  projectile: Projectile | null;
  particles: Particle[];
  floaters: FloatingText[];
  resolveTimer: number;
  winner: PlayerId | null;
  aiControls: PlayerId | null;
  difficulty: Difficulty;
  round: number;
  log: string[];
}

export function weaponById(id: string): WeaponDef {
  const w = WEAPONS.find((w) => w.id === id);
  if (!w) throw new Error("unknown weapon " + id);
  return w;
}

export function opponentOf(id: PlayerId): PlayerId {
  return id === "p1" ? "p2" : "p1";
}

export function playerFeetY(state: GameState, id: PlayerId): number {
  return terrainHeightAt(state.terrain, state.players[id].x);
}

export function headZoneBottom(state: GameState, id: PlayerId): number {
  const feet = playerFeetY(state, id);
  const top = feet - PLAYER_HEIGHT;
  return top + PLAYER_HEIGHT * 0.38;
}

export function createGame(map: MapDef, difficulty: Difficulty, seed = Date.now()): GameState {
  const terrain = generateTerrain(seed, map.roughness);
  const p1x = WORLD_WIDTH * 0.16;
  const p2x = WORLD_WIDTH * 0.84;
  const players: Record<PlayerId, PlayerState> = {
    p1: makePlayer("p1", "أنت", p1x, 1, "#3ba7ff", "#1c4d7a"),
    p2: makePlayer("p2", "الخصم", p2x, -1, "#ff5c5c", "#7a2323"),
  };
  return {
    map,
    terrain,
    wind: randomWind(map.windRange),
    turn: "p1",
    phase: "aiming",
    players,
    selectedWeapon: { p1: "bow", p2: "bow" },
    projectile: null,
    particles: [],
    floaters: [],
    resolveTimer: 0,
    winner: null,
    aiControls: "p2",
    difficulty,
    round: 1,
    log: [],
  };
}

function randomWind(range: number): number {
  return (Math.random() * 2 - 1) * range * 22;
}

export function selectWeapon(state: GameState, playerId: PlayerId, weaponId: string) {
  if (state.phase !== "aiming" || state.turn !== playerId) return;
  const ammo = state.players[playerId].ammo[weaponId];
  if (ammo !== undefined && ammo <= 0) return;
  state.selectedWeapon[playerId] = weaponId;
}

export function canUseSkill(state: GameState, playerId: PlayerId, skillId: string): boolean {
  if (state.phase !== "aiming" || state.turn !== playerId) return false;
  const skill = SKILLS.find((s) => s.id === skillId)!;
  const player = state.players[playerId];
  return player.energy >= skill.cost && player.cooldowns[skillId] <= 0;
}

export function useSkill(state: GameState, playerId: PlayerId, skillId: string, reposDir?: 1 | -1) {
  if (!canUseSkill(state, playerId, skillId)) return;
  const skill = SKILLS.find((s) => s.id === skillId)!;
  const player = state.players[playerId];
  player.energy -= skill.cost;
  player.cooldowns[skillId] = skill.cooldown + 1;

  if (skillId === "shield") {
    player.status.shieldActive = true;
    pushFloater(state, player.x, playerFeetY(state, playerId) - PLAYER_HEIGHT - 14, "درع مفعّل", "#67e8f9");
  } else if (skillId === "surge") {
    player.damageMultiplierNext = 1.75;
    pushFloater(state, player.x, playerFeetY(state, playerId) - PLAYER_HEIGHT - 14, "×1.75 ضرر", "#facc15");
  } else if (skillId === "reposition") {
    const dir = reposDir ?? player.facing;
    const opp = state.players[opponentOf(playerId)];
    const minX = WORLD_WIDTH * 0.06;
    const maxX = WORLD_WIDTH * 0.94;
    let nx = clamp(player.x + dir * 70, minX, maxX);
    if (Math.abs(nx - opp.x) < 60) nx = player.x; // don't overlap opponent
    player.x = nx;
    pushFloater(state, player.x, playerFeetY(state, playerId) - PLAYER_HEIGHT - 14, "تموضع", "#4ade80");
  }
}

export function canFire(state: GameState, playerId: PlayerId): boolean {
  if (state.phase !== "aiming" || state.turn !== playerId) return false;
  const weaponId = state.selectedWeapon[playerId];
  const ammo = state.players[playerId].ammo[weaponId];
  return ammo === undefined || ammo > 0;
}

// dragX/dragY: world-space vector from the player toward the drag point.
export function fire(state: GameState, playerId: PlayerId, dragX: number, dragY: number) {
  if (!canFire(state, playerId)) return;
  const player = state.players[playerId];
  const weapon = weaponById(state.selectedWeapon[playerId]);

  const power = clamp(Math.hypot(dragX, dragY), 0, MAX_DRAG);
  let angle = Math.atan2(-dragY, Math.abs(dragX) < 1 ? 1 : Math.abs(dragX));
  angle = clamp(angle, (5 * Math.PI) / 180, (85 * Math.PI) / 180);
  const speed = (power / MAX_DRAG) * MAX_LAUNCH_SPEED * weapon.speedScale * weapon.weightDrag;

  const feetY = playerFeetY(state, playerId);
  const originY = feetY - PLAYER_HEIGHT * 0.62;
  const originX = player.x + player.facing * (PLAYER_WIDTH * 0.7);

  const vx = Math.cos(angle) * speed * player.facing;
  const vy = -Math.sin(angle) * speed;

  state.projectile = {
    x: originX,
    y: originY,
    vx,
    vy,
    weapon,
    ownerId: playerId,
    trail: [],
    bounces: 0,
  };
  (state.projectile as any).age = 0;

  if (Number.isFinite(player.ammo[weapon.id])) {
    player.ammo[weapon.id] -= 1;
  }
  state.phase = "flying";
}

function pushFloater(state: GameState, x: number, y: number, text: string, color: string) {
  state.floaters.push({ x, y, text, color, life: 1.4, vy: -34 });
}

function spawnBurst(state: GameState, x: number, y: number, color: string, count: number, speed: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.6);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function applyExplosion(state: GameState, impactX: number, impactY: number, weapon: WeaponDef, shooterId: PlayerId) {
  const radius = weapon.splashRadius > 0 ? weapon.splashRadius : PLAYER_HIT_RADIUS;
  const shooter = state.players[shooterId];
  const ids: PlayerId[] = ["p1", "p2"];
  for (const id of ids) {
    const player = state.players[id];
    const feetY = playerFeetY(state, id);
    const centerY = feetY - PLAYER_HEIGHT * 0.5;
    const d = dist(impactX, impactY, player.x, centerY);
    if (d > radius) continue;
    const factor = clamp(1 - d / radius, 0.12, 1);
    const headBottom = feetY - PLAYER_HEIGHT + PLAYER_HEIGHT * 0.38;
    const zone: "head" | "body" = impactY <= headBottom ? "head" : "body";
    const zoneMult = zone === "head" ? HEAD_MULT : 1;
    let dmg = weapon.damage * factor * zoneMult;
    if (id === shooterId) dmg *= 0.6; // self-damage softened
    dmg *= shooter.damageMultiplierNext;
    applyDamage(state, id, dmg, weapon, shooterId, zone);
  }
  shooter.damageMultiplierNext = 1;
}

function applyDamage(state: GameState, targetId: PlayerId, rawDmg: number, weapon: WeaponDef, shooterId: PlayerId, zone: "head" | "body") {
  const target = state.players[targetId];
  let dmg = rawDmg;
  if (target.status.shieldActive) {
    dmg *= 0.5;
    target.status.shieldActive = false;
  }
  dmg = Math.max(0, Math.round(dmg));
  target.hp = clamp(target.hp - dmg, 0, target.maxHp);

  const feetY = playerFeetY(state, targetId);
  pushFloater(state, target.x, feetY - PLAYER_HEIGHT - 10, (zone === "head" ? "🎯 " : "") + "-" + dmg, zone === "head" ? "#facc15" : "#ffffff");
  spawnBurst(state, target.x, feetY - PLAYER_HEIGHT * 0.6, weapon.colorMain, 16, 90);

  if (weapon.burnTurns && dmg > 0) {
    target.status.burnTurns = weapon.burnTurns;
    target.status.burnDamagePerTurn = weapon.burnDamagePerTurn ?? 4;
  }
  if (weapon.slowTurns && dmg > 0) {
    target.status.slowTurns = weapon.slowTurns;
  }

  if (target.hp <= 0 && !state.winner) {
    state.winner = shooterId;
  }
}

function endFlightAsMiss(state: GameState) {
  state.projectile = null;
  beginResolve(state);
}

function handleTerrainImpact(state: GameState, proj: Projectile) {
  const weapon = proj.weapon;
  const shallow = Math.abs(proj.vy) < Math.abs(proj.vx) * 0.55;
  if (weapon.ricochet && shallow && proj.bounces < 2) {
    proj.vy = -proj.vy * 0.48;
    proj.vx *= 0.72;
    proj.bounces += 1;
    proj.y -= 4;
    return;
  }
  const craterRadius = weapon.splashRadius > 0 ? weapon.splashRadius * 0.95 : 15;
  const craterDepth = weapon.splashRadius > 0 ? 30 : 9;
  state.terrain = deformTerrain(state.terrain, proj.x, craterRadius, craterDepth);
  spawnBurst(state, proj.x, proj.y, weapon.colorMain, weapon.splashRadius > 0 ? 26 : 10, weapon.splashRadius > 0 ? 150 : 70);
  applyExplosion(state, proj.x, proj.y, weapon, proj.ownerId);
  state.projectile = null;
  beginResolve(state);
}

function beginResolve(state: GameState) {
  state.phase = state.winner ? "gameOver" : "resolving";
  state.resolveTimer = RESOLVE_TIME;
}

export function update(state: GameState, dtRaw: number) {
  const dt = Math.min(dtRaw, 0.1);

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
  }
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const f = state.floaters[i];
    f.life -= dt;
    f.y += f.vy * dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }

  if (state.phase === "flying" && state.projectile) {
    let remaining = dt;
    let guard = 0;
    while (remaining > 0 && state.projectile && guard < 40) {
      const step = Math.min(STEP, remaining);
      stepProjectile(state, state.projectile, step);
      remaining -= step;
      guard += 1;
    }
  } else if (state.phase === "resolving") {
    state.resolveTimer -= dt;
    if (state.resolveTimer <= 0) {
      if (state.winner) {
        state.phase = "gameOver";
      } else {
        endTurn(state);
      }
    }
  }
}

function stepProjectile(state: GameState, proj: Projectile, dt: number) {
  (proj as any).age += dt;
  proj.vx += state.wind * dt * proj.weapon.gravityScale * 0.4;
  proj.vy += GRAVITY * proj.weapon.gravityScale * dt;
  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
  proj.trail.push({ x: proj.x, y: proj.y });
  if (proj.trail.length > 18) proj.trail.shift();

  if (proj.x < -60 || proj.x > WORLD_WIDTH + 60 || proj.y > WORLD_HEIGHT + 160) {
    endFlightAsMiss(state);
    return;
  }

  const age = (proj as any).age as number;
  const ids: PlayerId[] = ["p1", "p2"];
  for (const id of ids) {
    if (id === proj.ownerId && age < 0.16) continue;
    const player = state.players[id];
    const feetY = playerFeetY(state, id);
    const top = feetY - PLAYER_HEIGHT;
    if (proj.x >= player.x - PLAYER_WIDTH / 2 - 6 && proj.x <= player.x + PLAYER_WIDTH / 2 + 6 && proj.y >= top - 6 && proj.y <= feetY + 6) {
      const headBottom = top + PLAYER_HEIGHT * 0.38;
      const zone: "head" | "body" = proj.y <= headBottom ? "head" : "body";
      if (proj.weapon.splashRadius > 0) {
        spawnBurst(state, proj.x, proj.y, proj.weapon.colorMain, 26, 150);
        state.terrain = deformTerrain(state.terrain, proj.x, proj.weapon.splashRadius * 0.9, 26);
        applyExplosion(state, proj.x, proj.y, proj.weapon, proj.ownerId);
      } else {
        const shooter = state.players[proj.ownerId];
        let dmg = proj.weapon.damage * (zone === "head" ? HEAD_MULT : 1) * shooter.damageMultiplierNext;
        shooter.damageMultiplierNext = 1;
        applyDamage(state, id, dmg, proj.weapon, proj.ownerId, zone);
        spawnBurst(state, proj.x, proj.y, proj.weapon.colorMain, 14, 90);
      }
      state.projectile = null;
      beginResolve(state);
      return;
    }
  }

  const groundY = terrainHeightAt(state.terrain, proj.x);
  if (proj.y >= groundY) {
    handleTerrainImpact(state, proj);
  }
}

function tickStatusForTurnStart(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  if (player.status.burnTurns > 0) {
    const dmg = player.status.burnDamagePerTurn;
    player.hp = clamp(player.hp - dmg, 0, player.maxHp);
    pushFloater(state, player.x, playerFeetY(state, playerId) - PLAYER_HEIGHT - 10, "-" + dmg + " 🔥", "#f59e0b");
    player.status.burnTurns -= 1;
    if (player.hp <= 0 && !state.winner) {
      state.winner = opponentOf(playerId);
    }
  }
  if (player.status.slowTurns > 0) player.status.slowTurns -= 1;
  player.energy = Math.min(5, player.energy + 1);
  for (const s of SKILLS) {
    if (player.cooldowns[s.id] > 0) player.cooldowns[s.id] -= 1;
  }
}

export function endTurn(state: GameState) {
  if (state.winner) {
    state.phase = "gameOver";
    return;
  }
  state.turn = opponentOf(state.turn);
  state.wind = randomWind(state.map.windRange);
  state.selectedWeapon[state.turn] = pickDefaultWeapon(state, state.turn);
  state.phase = "aiming";
  state.round += 1;
  tickStatusForTurnStart(state, state.turn);
  if (state.winner) {
    state.phase = "gameOver";
  }
}

function pickDefaultWeapon(state: GameState, playerId: PlayerId): string {
  const prev = state.selectedWeapon[playerId];
  const ammo = state.players[playerId].ammo[prev];
  if (ammo === undefined || ammo > 0) return prev;
  return "bow";
}

// ---------- AI ----------

const AI_NOISE: Record<Difficulty, number> = { easy: 0.22, normal: 0.11, hard: 0.045 };

export function aiChooseAndFire(state: GameState, playerId: PlayerId) {
  if (state.phase !== "aiming" || state.turn !== playerId) return;
  const player = state.players[playerId];
  const target = state.players[opponentOf(playerId)];

  const affordable = WEAPONS.filter((w) => {
    const ammo = player.ammo[w.id];
    return ammo === undefined || ammo > 0;
  });
  const nonBow = affordable.filter((w) => w.id !== "bow");
  const weapon = nonBow.length > 0 && Math.random() < 0.55 ? nonBow[Math.floor(Math.random() * nonBow.length)] : weaponById("bow");
  state.selectedWeapon[playerId] = weapon.id;

  if (player.energy >= 2 && target.hp < 45 && canUseSkill(state, playerId, "surge")) {
    useSkill(state, playerId, "surge");
  } else if (player.hp < 35 && canUseSkill(state, playerId, "shield")) {
    useSkill(state, playerId, "shield");
  }

  const feetY = playerFeetY(state, playerId);
  const originY = feetY - PLAYER_HEIGHT * 0.62;
  const originX = player.x + player.facing * (PLAYER_WIDTH * 0.7);

  let best: { angle: number; power: number; err: number } | null = null;
  const angles = [20, 30, 40, 50, 60, 70];
  const powers = [0.5, 0.65, 0.8, 0.9, 1.0];
  for (const aDeg of angles) {
    for (const pRatio of powers) {
      const angle = (aDeg * Math.PI) / 180;
      const speed = pRatio * MAX_LAUNCH_SPEED * weapon.speedScale * weapon.weightDrag;
      const vx = Math.cos(angle) * speed * player.facing;
      const vy = -Math.sin(angle) * speed;
      const pts = simulateTrajectory(originX, originY, vx, vy, state.wind, weapon.gravityScale, state.terrain, 260, 1 / 60);
      if (pts.length === 0) continue;
      const last = pts[pts.length - 1];
      let minErr = Infinity;
      for (const p of pts) {
        const d = dist(p.x, p.y, target.x, feetY - PLAYER_HEIGHT * 0.5);
        if (d < minErr) minErr = d;
      }
      const err = Math.min(minErr, dist(last.x, last.y, target.x, feetY - PLAYER_HEIGHT * 0.5));
      if (!best || err < best.err) best = { angle: aDeg, power: pRatio, err };
    }
  }
  if (!best) best = { angle: 45, power: 0.75, err: 0 };

  const noise = AI_NOISE[state.difficulty];
  const angleNoisy = clamp(best.angle + (Math.random() * 2 - 1) * 14 * noise * 4, 8, 82);
  const powerNoisy = clamp(best.power + (Math.random() * 2 - 1) * noise, 0.25, 1);

  const angleRad = (angleNoisy * Math.PI) / 180;
  const dragX = Math.cos(angleRad) * MAX_DRAG * powerNoisy * player.facing;
  const dragY = -Math.sin(angleRad) * MAX_DRAG * powerNoisy;
  fire(state, playerId, dragX, dragY);
}

export { WORLD_WIDTH, WORLD_HEIGHT, TERRAIN_SAMPLES };
