import { MAPS, Difficulty } from "../src/game/entities";
import { aiChooseAndFire, createGame, fire, GameState, selectWeapon, update, useSkill } from "../src/game/engine";
import { WEAPONS, SKILLS } from "../src/game/entities";

let totalMatches = 0;
let totalTurnsAcrossMatches = 0;
let errors = 0;

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

function playMatch(mapId: string, difficulty: Difficulty, seed: number) {
  const map = MAPS.find((m) => m.id === mapId)!;
  const state = createGame(map, difficulty, seed);
  totalMatches++;
  let turns = 0;
  const maxTurns = 400;

  while (state.phase !== "gameOver" && turns < maxTurns) {
    // sanity: positions & hp always finite and in range
    for (const id of ["p1", "p2"] as const) {
      const p = state.players[id];
      assertFinite("hp", p.hp, `match(${mapId},${difficulty},${seed}) turn ${turns}`);
      assertFinite("x", p.x, `match(${mapId},${difficulty},${seed}) turn ${turns}`);
      if (p.hp < -0.01 || p.hp > p.maxHp + 0.01) {
        console.error(`HP out of range: ${p.hp} for ${id}`);
        errors++;
      }
      if (p.x < -50 || p.x > 1050) {
        console.error(`Player x out of world bounds: ${p.x}`);
        errors++;
      }
    }
    for (const h of state.terrain) assertFinite("terrainHeight", h, `terrain @ turn ${turns}`);

    if (state.phase === "aiming") {
      const acting = state.turn;
      // randomly try a skill first
      if (Math.random() < 0.3) {
        const s = SKILLS[Math.floor(Math.random() * SKILLS.length)];
        useSkill(state, acting, s.id);
      }
      // randomly switch weapon
      if (Math.random() < 0.5) {
        const w = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
        selectWeapon(state, acting, w.id);
      }
      if (acting === "p2") {
        aiChooseAndFire(state, "p2");
      } else {
        const drag = randomDrag();
        fire(state, "p1", drag.x, drag.y);
      }
      turns++;
    }

    tickUntil(state, () => state.phase === "aiming" || state.phase === "gameOver", 25);
  }

  totalTurnsAcrossMatches += turns;

  if (turns >= maxTurns) {
    console.error(`Match did not resolve within ${maxTurns} turns (${mapId}, ${difficulty}, seed ${seed})`);
    errors++;
  }
  if (state.phase !== "gameOver") {
    console.error(`Match ended without reaching gameOver phase (${mapId}, ${difficulty}, seed ${seed}), phase=${state.phase}`);
    errors++;
  }
  if (!state.winner) {
    console.error(`No winner recorded at end of match (${mapId}, ${difficulty}, seed ${seed})`);
    errors++;
  }
}

const difficulties: Difficulty[] = ["easy", "normal", "hard"];
for (const map of MAPS) {
  for (const diff of difficulties) {
    for (let i = 0; i < 8; i++) {
      playMatch(map.id, diff, 1000 + i * 37 + map.id.length * 911);
    }
  }
}

console.log(`Matches simulated: ${totalMatches}`);
console.log(`Avg turns per match: ${(totalTurnsAcrossMatches / totalMatches).toFixed(1)}`);
console.log(`Errors: ${errors}`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log("SMOKE TEST PASSED");
}
