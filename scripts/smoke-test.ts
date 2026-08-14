import { ARCHETYPES, Difficulty, MAPS } from "../src/game/entities";
import { GameState, aiChooseAndFire, createGame, fire, movePlayer, selectWeapon, update, useSkill } from "../src/game/engine";
import { SKILLS } from "../src/game/entities";
import { WORLD_WIDTH } from "../src/game/physics";

let totalMatches = 0;
let totalTurnsAcrossMatches = 0;
let errors = 0;
const balanceStats: Record<string, { matches: number; wins: number; turns: number }> = {};

function assertFinite(label: string, v: number, ctx: string) {
  if (!Number.isFinite(v)) {
    console.error(`NON-FINITE VALUE: ${label}=${v} @ ${ctx}`);
    errors++;
  }
}

function randomDrag() {
  const angleDeg = 10 + Math.random() * 70;
  const power = 40 + Math.random() * 220;
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * power, y: -Math.sin(rad) * power };
}

function tickUntil(state: GameState, predicate: () => boolean, maxSeconds = 20) {
  let t = 0;
  const dt = 1 / 60;
  while (!predicate() && t < maxSeconds) {
    update(state, dt);
    t += dt;
  }
}

function playMatch(mapId: string, difficulty: Difficulty, archetypeId: string, seed: number) {
  const map = MAPS.find((m) => m.id === mapId)!;
  const state = createGame(map, difficulty, archetypeId, seed);
  totalMatches++;
  let turns = 0;
  const maxTurns = 400;
  const ctxLabel = `match(${mapId},${difficulty},${archetypeId},${seed})`;

  // Exercise every loadout weapon at least once across the match set by
  // rotating through them, plus exercise movement every other turn.
  let weaponCursor = 0;

  while (state.phase !== "gameOver" && turns < maxTurns) {
    for (const id of ["p1", "p2"] as const) {
      const p = state.players[id];
      assertFinite("hp", p.hp, `${ctxLabel} turn ${turns}`);
      assertFinite("x", p.x, `${ctxLabel} turn ${turns}`);
      assertFinite("stamina", p.stamina, `${ctxLabel} turn ${turns}`);
      if (p.hp < -0.01 || p.hp > p.maxHp + 0.01) {
        console.error(`HP out of range: ${p.hp} for ${id}`);
        errors++;
      }
      if (p.x < -50 || p.x > WORLD_WIDTH + 50) {
        console.error(`Player x out of world bounds: ${p.x}`);
        errors++;
      }
      if (p.stamina < -0.01 || p.stamina > p.maxStamina + 0.01) {
        console.error(`Stamina out of range: ${p.stamina} for ${id}`);
        errors++;
      }
    }
    // Players must never cross sides — p1 starts left/faces right, p2
    // starts right/faces left, and facing never updates after that, so
    // crossing would silently point a player's shots away from the enemy.
    if (state.players.p1.x >= state.players.p2.x) {
      console.error(`Players crossed sides: p1.x=${state.players.p1.x} p2.x=${state.players.p2.x} @ ${ctxLabel} turn ${turns}`);
      errors++;
    }
    for (const h of state.terrain) assertFinite("terrainHeight", h, `terrain @ turn ${turns}`);
    assertFinite("camera.x", state.camera.x, `turn ${turns}`);
    assertFinite("camera.y", state.camera.y, `turn ${turns}`);
    assertFinite("camera.zoom", state.camera.zoom, `turn ${turns}`);
    if (state.camera.zoom <= 0) {
      console.error(`Camera zoom non-positive: ${state.camera.zoom}`);
      errors++;
    }

    if (state.phase === "aiming") {
      const acting = state.turn;

      if (acting === "p1") {
        // Exercise movement in both directions before aiming.
        if (turns % 2 === 0) {
          movePlayer(state, "p1", 1, 0.3 + Math.random() * 0.6);
        } else {
          movePlayer(state, "p1", -1, 0.3 + Math.random() * 0.6);
        }

        if (Math.random() < 0.3) {
          const s = SKILLS[Math.floor(Math.random() * SKILLS.length)];
          useSkill(state, acting, s.id);
        }

        const archetype = ARCHETYPES.find((a) => a.id === state.players.p1.archetype)!;
        const slot = archetype.loadout[weaponCursor % archetype.loadout.length];
        weaponCursor++;
        selectWeapon(state, "p1", slot.weaponId);

        const drag = randomDrag();
        fire(state, "p1", drag.x, drag.y);
      } else {
        aiChooseAndFire(state, "p2");
      }
      turns++;
    }

    tickUntil(state, () => state.phase === "aiming" || state.phase === "gameOver", 25);
  }

  totalTurnsAcrossMatches += turns;
  const stats = balanceStats[archetypeId] ?? { matches: 0, wins: 0, turns: 0 };
  stats.matches += 1;
  stats.wins += state.winner === "p1" ? 1 : 0;
  stats.turns += turns;
  balanceStats[archetypeId] = stats;

  if (turns >= maxTurns) {
    console.error(`Match did not resolve within ${maxTurns} turns (${ctxLabel})`);
    errors++;
  }
  if (state.phase !== "gameOver") {
    console.error(`Match ended without reaching gameOver phase (${ctxLabel}), phase=${state.phase}`);
    errors++;
  }
  if (!state.winner) {
    console.error(`No winner recorded at end of match (${ctxLabel})`);
    errors++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`ASSERTION FAILED: ${message}`);
    errors++;
  }
}

function runTargetedAssertions() {
  const map = MAPS[0];
  const base = createGame(map, "normal", "viking", 1234);
  const ninja = createGame(map, "normal", "ninja", 1234);
  const knight = createGame(map, "normal", "knight", 1234);
  assert(ninja.players.p1.maxStamina > base.players.p1.maxStamina, "ninja should have higher stamina than viking");
  assert(knight.players.p1.maxHp > base.players.p1.maxHp, "knight should have higher health than viking");

  const beforeIllegalSelect = base.selectedWeapon.p1;
  selectWeapon(base, "p1", "rocket");
  assert(base.selectedWeapon.p1 === beforeIllegalSelect, "a player must not select a weapon outside their loadout");

  const normalMove = createGame(map, "normal", "ninja", 2222);
  const frozenMove = createGame(map, "normal", "ninja", 2222);
  frozenMove.players.p1.status.slowTurns = 2;
  const normalX = normalMove.players.p1.x;
  const frozenX = frozenMove.players.p1.x;
  movePlayer(normalMove, "p1", 1, 0.5);
  movePlayer(frozenMove, "p1", 1, 0.5);
  assert(frozenMove.players.p1.x - frozenX < normalMove.players.p1.x - normalX, "freeze must reduce movement distance");

  const standardArcher = createGame(map, "normal", "archer", 3333);
  const scarce = createGame(map, "normal", "archer", 3333, { id: "scarce-test", nameAr: "اختبار", descriptionAr: "", limitedSpecialAmmo: true });
  const finiteAmmo = Object.values(scarce.players.p1.ammo).filter((value) => Number.isFinite(value));
  assert(finiteAmmo.every((value) => value >= 1), "daily modifiers must preserve at least one use of each special weapon");
  assert(scarce.players.p1.ammo.fire === standardArcher.players.p1.ammo.fire - 1, "scarce-ammo challenge must reduce finite ammo by one");
}

runTargetedAssertions();

const difficulties: Difficulty[] = ["easy", "normal", "hard"];

// Cross every archetype with every map at least once, plus a few difficulty
// variations, to exercise every loadout and every terrain sprite mapping.
for (const archetype of ARCHETYPES) {
  for (const map of MAPS) {
    for (const diff of difficulties) {
      playMatch(map.id, diff, archetype.id, 1000 + archetype.id.length * 131 + map.id.length * 911 + diff.length * 7);
    }
  }
}

// A few extra repeats on the default pairing for additional randomized coverage.
for (let i = 0; i < 12; i++) {
  playMatch("desert", "normal", "viking", 5000 + i * 53);
}

console.log(`Matches simulated: ${totalMatches}`);
console.log(`Avg turns per match: ${(totalTurnsAcrossMatches / totalMatches).toFixed(1)}`);
console.log(`Errors: ${errors}`);
console.log("Balance summary:");
for (const [archetypeId, stats] of Object.entries(balanceStats)) {
  console.log(`${archetypeId}: win rate ${((stats.wins / stats.matches) * 100).toFixed(0)}%, avg turns ${(stats.turns / stats.matches).toFixed(1)}`);
}
if (errors > 0) {
  process.exit(1);
} else {
  console.log("SMOKE TEST PASSED");
}
