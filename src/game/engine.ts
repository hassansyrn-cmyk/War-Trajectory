import {
  ARCHETYPES,
  Difficulty,
  FloatingText,
  GamePhase,
  MapDef,
  MatchModifier,
  Particle,
  PlayerId,
  PlayerState,
  Projectile,
  SKILLS,
  WEAPONS,
  WeaponDef,
  archetypeById,
  loadoutSlot,
  makePlayer,
  weaponById,
} from "./entities";
import {
  Decoration,
  GRAVITY,
  TERRAIN_SAMPLES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clamp,
  deformTerrain,
  dist,
  generateDecorations,
  generateTerrain,
  simulateTrajectory,
  terrainHeightAt,
} from "./physics";

export const PLAYER_HEIGHT = 64;
export const PLAYER_WIDTH = 30;
export const PLAYER_HIT_RADIUS = 36;
export const HEAD_MULT = 2.2;
export const MAX_DRAG = 295;
export const MAX_LAUNCH_SPEED = 720;
export const MOVE_SPEED = 62; // world units / second while a move button is held
export const MIN_PLAYER_SEPARATION = 90;
const STEP = 1 / 120;
const RESOLVE_TIME = 0.9;
const CAMERA_EASE = 5;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface GameState {
  map: MapDef;
  modifier: MatchModifier | null;
  terrain: number[];
  decorations: Decoration[];
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
  camera: Camera;
  elapsed: number; // monotonic game clock in seconds, used for animation timing
  headshots: number;
}

export { weaponById };

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

function defaultWeaponFor(archetypeId: string): string {
  const archetype = archetypeById(archetypeId);
  return archetype.loadout[0]?.weaponId ?? "bow";
}

export function createGame(
  map: MapDef,
  difficulty: Difficulty,
  playerArchetypeId: string = "viking",
  seed = Date.now(),
  modifier: MatchModifier | null = null
): GameState {
  const terrain = generateTerrain(seed, map.roughness);
  const decorations = generateDecorations(seed);
  const p1x = WORLD_WIDTH * 0.14;
  const p2x = WORLD_WIDTH * 0.86;
  const opponentPool = ARCHETYPES.map((a) => a.id).filter((id) => id !== playerArchetypeId);
  const opponentArchetypeId = opponentPool[Math.abs(Math.floor(seed * 0.0001)) % Math.max(1, opponentPool.length)] ?? playerArchetypeId;
  const players: Record<PlayerId, PlayerState> = {
    p1: makePlayer("p1", "أنت", p1x, 1, playerArchetypeId, modifier ?? undefined),
    p2: makePlayer("p2", "الخصم", p2x, -1, opponentArchetypeId, modifier ?? undefined),
  };
  return {
    map,
    modifier,
    terrain,
    decorations,
    wind: randomWind(map.windRange * (modifier?.windMultiplier ?? 1)),
    turn: "p1",
    phase: "aiming",
    players,
    selectedWeapon: { p1: defaultWeaponFor(playerArchetypeId), p2: defaultWeaponFor(opponentArchetypeId) },
    projectile: null,
    particles: [],
    floaters: [],
    resolveTimer: 0,
    winner: null,
    aiControls: "p2",
    difficulty,
    round: 1,
    log: [],
    camera: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 },
    elapsed: 0,
    headshots: 0,
  };
}

function randomWind(range: number): number {
  return (Math.random() * 2 - 1) * range * 22;
}

export function selectWeapon(state: GameState, playerId: PlayerId, weaponId: string) {
  if (state.phase !== "aiming" || state.turn !== playerId) return;
  const player = state.players[playerId];
  const archetype = archetypeById(player.archetype);
  if (!loadoutSlot(archetype, weaponId)) return; // not in this warrior's loadout
  const ammo = player.ammo[weaponId];
  if (ammo !== undefined && ammo <= 0) return;
  state.selectedWeapon[playerId] = weaponId;
}

export function canUseSkill(state: GameState, playerId: PlayerId, skillId: string): boolean {
  if (state.phase !== "aiming" || state.turn !== playerId) return false;
  const skill = SKILLS.find((s) => s.id === skillId)!;
  const player = state.players[playerId];
  return player.energy >= skill.cost && player.cooldowns[skillId] <= 0;
}

export function useSkill(state: GameState, playerId: PlayerId, skillId: string) {
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
  }
}

// Smooth, stamina-gated movement. Call every frame while a move button/drag
// is held; direction is +1 (right) or -1 (left). Movement is only allowed
// during the player's own aiming phase, drains stamina proportionally to
// distance travelled, and refills fully at the start of each of the
// player's own turns (see tickStatusForTurnStart).
export function movePlayer(state: GameState, playerId: PlayerId, direction: 1 | -1, dt: number): boolean {
  if (state.phase !== "aiming" || state.turn !== playerId) return false;
  const player = state.players[playerId];
  if (player.stamina <= 0) return false;

  const archetype = archetypeById(player.archetype);
  const slowMultiplier = player.status.slowTurns > 0 ? 0.65 : 1;
  const opponent = state.players[opponentOf(playerId)];
  const maxDistance = MOVE_SPEED * dt * archetype.moveSpeedMultiplier * slowMultiplier;
  const staminaLimited = Math.min(maxDistance, player.stamina);
  const minX = WORLD_WIDTH * 0.04;
  const maxX = WORLD_WIDTH * 0.96;

  let nx = clamp(player.x + direction * staminaLimited, minX, maxX);
  if (Math.abs(nx - opponent.x) < MIN_PLAYER_SEPARATION) {
    nx = clamp(opponent.x + MIN_PLAYER_SEPARATION * Math.sign(player.x - opponent.x || -direction), minX, maxX);
  }

  const distanceMoved = Math.abs(nx - player.x);
  if (distanceMoved < 0.001) return false;

  player.x = nx;
  player.stamina = Math.max(0, player.stamina - distanceMoved);
  player.isMoving = true;
  return true;
}

export function canFire(state: GameState, playerId: PlayerId): boolean {
  if (state.phase !== "aiming" || state.turn !== playerId) return false;
  const weaponId = state.selectedWeapon[playerId];
  const ammo = state.players[playerId].ammo[weaponId];
  return ammo === undefined || ammo > 0;
}

function weaponDamageFor(shooter: PlayerState, weapon: WeaponDef): number {
  const archetype = archetypeById(shooter.archetype);
  const signature = weaponById(archetype.signatureWeapon);
  const isSignature = weapon.id === signature.id || weapon.type === signature.type;
  return weapon.damage * (isSignature ? 1 + archetype.signatureDamageBonus : 1);
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
  player.attackPoseUntil = state.elapsed + 0.45;
  player.isMoving = false;
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
  const shooter = state.players[shooterId];
  const shooterArchetype = archetypeById(shooter.archetype);
  const radiusBonus = weapon.splashRadius > 0 && shooterArchetype.id === "engineer" ? 1.1 : 1;
  const radius = (weapon.splashRadius > 0 ? weapon.splashRadius : PLAYER_HIT_RADIUS) * radiusBonus;
  const baseDamage = weaponDamageFor(shooter, weapon);
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
    const zoneMult = zone === "head" ? HEAD_MULT * (state.modifier?.headshotMultiplier ?? 1) : 1;
    let dmg = baseDamage * factor * zoneMult;
    if (id === shooterId) dmg *= 0.6; // self-damage softened
    dmg *= shooter.damageMultiplierNext;
    applyDamage(state, id, dmg, weapon, shooterId, zone);
  }
  shooter.damageMultiplierNext = 1;
}

function applyDamage(state: GameState, targetId: PlayerId, rawDmg: number, weapon: WeaponDef, shooterId: PlayerId, zone: "head" | "body") {
  const target = state.players[targetId];
  let dmg = rawDmg;
  if (weapon.splashRadius > 0) dmg *= 1 - archetypeById(target.archetype).explosionResistance;
  if (target.status.shieldActive) {
    dmg *= 0.5;
    target.status.shieldActive = false;
  }
  dmg = Math.max(0, Math.round(dmg));
  target.hp = clamp(target.hp - dmg, 0, target.maxHp);

  if (zone === "head" && shooterId === "p1" && targetId !== shooterId) state.headshots += 1;
  const feetY = playerFeetY(state, targetId);
  pushFloater(state, target.x, feetY - PLAYER_HEIGHT - 10, (zone === "head" ? "🎯 " : "") + "-" + dmg, zone === "head" ? "#facc15" : "#ffffff");
  spawnBurst(state, target.x, feetY - PLAYER_HEIGHT * 0.6, weapon.colorMain, 16, 90);

  if (weapon.burnTurns && dmg > 0) {
    target.status.burnTurns = weapon.burnTurns + (state.map.effect === "ember" ? 1 : 0);
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
  const craterDepth = (weapon.splashRadius > 0 ? 30 : 9) * (state.modifier?.fragileTerrain ? 1.35 : 1);
  state.terrain = deformTerrain(state.terrain, proj.x, craterRadius, craterDepth);
  state.decorations = state.decorations.filter((d) => Math.abs(d.x - proj.x) > craterRadius * 0.8);
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
  state.elapsed += dt;

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

  updateCamera(state, dt);
}

function updateCamera(state: GameState, dt: number) {
  let targetX: number;
  let targetY: number;
  let targetZoom: number;

  if (state.phase === "flying" && state.projectile) {
    targetX = state.projectile.x;
    targetY = state.projectile.y;
    targetZoom = 1.05;
  } else if (state.phase === "aiming") {
    const active = state.players[state.turn];
    const other = state.players[opponentOf(state.turn)];
    targetX = active.x * 0.68 + other.x * 0.32;
    targetY = (playerFeetY(state, "p1") + playerFeetY(state, "p2")) / 2 - PLAYER_HEIGHT * 0.5;
    targetZoom = 1.14;
  } else {
    const p1 = state.players.p1;
    const p2 = state.players.p2;
    targetX = (p1.x + p2.x) / 2;
    targetY = (playerFeetY(state, "p1") + playerFeetY(state, "p2")) / 2 - PLAYER_HEIGHT * 0.3;
    targetZoom = 1.0;
  }

  const cam = state.camera;
  const ease = Math.min(1, dt * CAMERA_EASE);
  cam.x += (targetX - cam.x) * ease;
  cam.y += (targetY - cam.y) * ease;
  cam.zoom += (targetZoom - cam.zoom) * ease;

  const halfW = WORLD_WIDTH / (2 * cam.zoom);
  const halfH = WORLD_HEIGHT / (2 * cam.zoom);
  cam.x = clamp(cam.x, Math.min(halfW, WORLD_WIDTH - halfW), Math.max(halfW, WORLD_WIDTH - halfW));
  cam.y = clamp(cam.y, Math.min(halfH, WORLD_HEIGHT - halfH), Math.max(halfH, WORLD_HEIGHT - halfH));
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
        const craterScale = state.modifier?.fragileTerrain ? 1.3 : 1;
        state.terrain = deformTerrain(state.terrain, proj.x, proj.weapon.splashRadius * 0.9, 26 * craterScale);
        state.decorations = state.decorations.filter((d) => Math.abs(d.x - proj.x) > proj.weapon.splashRadius * 0.7);
        applyExplosion(state, proj.x, proj.y, proj.weapon, proj.ownerId);
      } else {
        const shooter = state.players[proj.ownerId];
        let dmg = weaponDamageFor(shooter, proj.weapon) * (zone === "head" ? HEAD_MULT * (state.modifier?.headshotMultiplier ?? 1) : 1) * shooter.damageMultiplierNext;
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
  player.stamina = player.maxStamina;
  player.isMoving = false;
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
  state.wind = randomWind(state.map.windRange * (state.modifier?.windMultiplier ?? 1));
  state.selectedWeapon[state.turn] = pickDefaultWeapon(state, state.turn);
  state.phase = "aiming";
  state.round += 1;
  tickStatusForTurnStart(state, state.turn);
  if (state.winner) {
    state.phase = "gameOver";
  }
}

function pickDefaultWeapon(state: GameState, playerId: PlayerId): string {
  const player = state.players[playerId];
  const prev = state.selectedWeapon[playerId];
  const ammo = player.ammo[prev];
  if (ammo === undefined || ammo > 0) return prev;
  return defaultWeaponFor(player.archetype);
}

// ---------- AI ----------

const AI_NOISE: Record<Difficulty, number> = { easy: 0.22, normal: 0.11, hard: 0.045 };

export function aiChooseAndFire(state: GameState, playerId: PlayerId) {
  if (state.phase !== "aiming" || state.turn !== playerId) return;
  const player = state.players[playerId];
  const archetype = archetypeById(player.archetype);
  const target = state.players[opponentOf(playerId)];

  const loadoutWeapons = archetype.loadout.map((slot) => weaponById(slot.weaponId));
  const affordable = loadoutWeapons.filter((w) => {
    const ammo = player.ammo[w.id];
    return ammo === undefined || ammo > 0;
  });
  const basicWeaponId = defaultWeaponFor(player.archetype);
  const nonBasic = affordable.filter((w) => w.id !== basicWeaponId);
  const weapon = nonBasic.length > 0 && Math.random() < 0.55 ? nonBasic[Math.floor(Math.random() * nonBasic.length)] : weaponById(basicWeaponId);
  state.selectedWeapon[playerId] = weapon.id;

  if (player.energy >= 2 && target.hp < 45 && canUseSkill(state, playerId, "surge")) {
    useSkill(state, playerId, "surge");
  } else if (player.hp < 35 && canUseSkill(state, playerId, "shield")) {
    useSkill(state, playerId, "shield");
  }

  // Archetype-aware positioning gives the AI a readable combat personality.
  if (Math.random() < 0.42 && player.stamina > 20) {
    const towardTarget: 1 | -1 = target.x > player.x ? 1 : -1;
    const retreat: 1 | -1 = towardTarget === 1 ? -1 : 1;
    const dir: 1 | -1 = archetype.id === "viking" ? towardTarget : archetype.id === "engineer" ? retreat : Math.random() < 0.58 ? towardTarget : retreat;
    movePlayer(state, playerId, dir, archetype.id === "ninja" ? 0.7 : 0.5);
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
