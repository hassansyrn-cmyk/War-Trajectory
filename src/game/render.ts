import { PlayerId, WeaponDef, archetypeById } from "./entities";
import { Camera, GameState, MAX_DRAG, MAX_LAUNCH_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH, playerFeetY, weaponById } from "./engine";
import { TERRAIN_SAMPLES, WORLD_HEIGHT, WORLD_WIDTH, clamp, simulateTrajectory } from "./physics";
import { getManifest, getTerrainSprite, getWarriorSheet, getWeaponIcon } from "./assets";

export interface AimState {
  active: boolean;
  dragX: number;
  dragY: number;
}

// Visual (not gameplay-hitbox) size of a drawn warrior — independent from
// PLAYER_HEIGHT/PLAYER_WIDTH, which stay purely for collision math.
const SPRITE_DRAW_SIZE = 108;
const WEAPON_ICON_SIZE = 30;

let frameClock = 0;

export function draw(ctx: CanvasRenderingContext2D, state: GameState, aim: AimState, scale: number, offsetX: number, offsetY: number) {
  frameClock += 1 / 60;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawSky(ctx, state);
  drawParallaxLayers(ctx, state);

  ctx.save();
  applyCamera(ctx, state.camera);

  drawTerrain(ctx, state);
  drawDecorations(ctx, state);

  const activePlayer = state.players[state.turn];
  drawPlayer(ctx, state, "p1");
  drawPlayer(ctx, state, "p2");

  if (aim.active && state.phase === "aiming") {
    drawAimGuide(ctx, state, activePlayer.id, aim);
  }

  if (state.projectile) drawProjectile(ctx, state);

  drawParticles(ctx, state);
  drawFloaters(ctx, state);

  ctx.restore();

  drawWindIndicator(ctx, state);

  ctx.restore();
}

function applyCamera(ctx: CanvasRenderingContext2D, cam: Camera) {
  ctx.translate(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

function drawSky(ctx: CanvasRenderingContext2D, state: GameState) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  g.addColorStop(0, state.map.skyTop);
  g.addColorStop(1, state.map.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.save();
  const sunX = WORLD_WIDTH * 0.8;
  const sunY = WORLD_HEIGHT * 0.16;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
  glow.addColorStop(0, state.map.accentGlow);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#fff7e0";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = state.map.cloudColor;
  const cloudSeed = hashMap(state.map.id);
  for (let i = 0; i < 5; i++) {
    const t = ((cloudSeed + i * 137 + frameClock * 3) % 1000) / 1000;
    const cx = t * (WORLD_WIDTH + 260) - 130;
    const cy = WORLD_HEIGHT * (0.08 + ((i * 71) % 100) / 100 * 0.16);
    drawCloud(ctx, cx, cy, 30 + (i % 3) * 10);
  }
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.55, y + size * 0.08, size * 0.62, size * 0.32, 0, 0, Math.PI * 2);
  ctx.ellipse(x - size * 0.5, y + size * 0.1, size * 0.5, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function hashMap(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 1000;
}

function drawParallaxLayers(ctx: CanvasRenderingContext2D, state: GameState) {
  const camShift = (state.camera.x - WORLD_WIDTH / 2) * -1;
  drawMountainLayer(ctx, state.map.mountainFar, WORLD_HEIGHT * 0.62, WORLD_HEIGHT * 0.22, camShift * 0.04, hashMap(state.map.id + "far"));
  drawMountainLayer(ctx, state.map.mountainNear, WORLD_HEIGHT * 0.72, WORLD_HEIGHT * 0.16, camShift * 0.09, hashMap(state.map.id + "near"));
}

function drawMountainLayer(ctx: CanvasRenderingContext2D, color: string, baseY: number, amp: number, shiftX: number, seed: number) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-40 + shiftX, WORLD_HEIGHT + 4);
  const peaks = 7;
  for (let i = 0; i <= peaks; i++) {
    const x = shiftX - 60 + (i / peaks) * (WORLD_WIDTH + 120);
    const n = Math.sin(i * 12.9898 + seed) * 43758.5453;
    const frac = n - Math.floor(n);
    const y = baseY - amp * (0.35 + frac * 0.65);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD_WIDTH + 40 + shiftX, WORLD_HEIGHT + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------- Terrain (sprite-textured, falls back to flat-color bands) ----------

function terrainPoints(state: GameState) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < TERRAIN_SAMPLES; i++) {
    pts.push({ x: (i / (TERRAIN_SAMPLES - 1)) * WORLD_WIDTH, y: state.terrain[i] });
  }
  return pts;
}

function clipToTerrainSilhouette(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, WORLD_HEIGHT + 4);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(pts[pts.length - 1].x, WORLD_HEIGHT + 4);
  ctx.closePath();
  ctx.clip();
}

function drawTerrain(ctx: CanvasRenderingContext2D, state: GameState) {
  const pts = terrainPoints(state);
  const sprite = getTerrainSprite(state.map.terrainSprite);

  ctx.save();
  clipToTerrainSilhouette(ctx, pts);

  if (sprite) {
    // Fallback fill first in case the source art's aspect ratio leaves any
    // gap once stretched, then the real artwork stretched across the whole
    // deformable silhouette's bounding box. As craters dig down, the clip
    // region follows the live terrain curve, naturally revealing the
    // lower/rockier part of the source art at that spot.
    ctx.fillStyle = state.map.rockColor;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT + 4);
    const topY = Math.min(...state.terrain) - 24;
    const bottomY = WORLD_HEIGHT + 24;
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, 0, topY, WORLD_WIDTH, bottomY - topY);
  } else {
    fillTerrainBand(ctx, pts, WORLD_HEIGHT + 4, state.map.rockColor, 0);
    fillTerrainBand(ctx, pts, WORLD_HEIGHT + 4, state.map.soilColor, 16);
    const g = ctx.createLinearGradient(0, WORLD_HEIGHT * 0.4, 0, WORLD_HEIGHT * 0.4 + 30);
    g.addColorStop(0, state.map.groundTop);
    g.addColorStop(1, state.map.groundBottom);
    fillTerrainBand(ctx, pts, WORLD_HEIGHT + 4, g, 0, 10);
  }
  ctx.restore();

  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + 1.5) : ctx.lineTo(p.x, p.y + 1.5)));
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function fillTerrainBand(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  bottomY: number,
  fill: string | CanvasGradient,
  yOffset: number,
  onlyTopThickness = 0
) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, bottomY);
  for (const p of pts) ctx.lineTo(p.x, p.y + yOffset);
  ctx.lineTo(pts[pts.length - 1].x, bottomY);
  ctx.closePath();
  if (onlyTopThickness > 0) {
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + onlyTopThickness + 40);
    for (const p of pts) ctx.lineTo(p.x, p.y + onlyTopThickness + 40);
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y - 4);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function drawDecorations(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const d of state.decorations) {
    const y = sampleTerrainY(state.terrain, d.x);
    ctx.save();
    ctx.translate(d.x, y);
    if (d.flip) ctx.scale(-1, 1);
    ctx.fillStyle = state.map.decoColor;
    if (d.type === "grass") {
      const s = 6 * d.size;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.6, 2);
        ctx.quadraticCurveTo(i * s * 0.6 + s * 0.3, -s * 0.6, i * s * 0.3, -s);
        ctx.lineTo(i * s * 0.15, 2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (d.type === "rock") {
      const s = 7 * d.size;
      ctx.beginPath();
      ctx.moveTo(-s, 2);
      ctx.lineTo(-s * 0.6, -s * 0.7);
      ctx.lineTo(s * 0.2, -s * 0.9);
      ctx.lineTo(s, -s * 0.1);
      ctx.lineTo(s * 0.7, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const s = 8 * d.size;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.4, s, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function sampleTerrainY(terrain: number[], x: number): number {
  const t = clamp(x / WORLD_WIDTH, 0, 0.999999);
  const idx = t * (TERRAIN_SAMPLES - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, TERRAIN_SAMPLES - 1);
  const frac = idx - i0;
  return terrain[i0] * (1 - frac) + terrain[i1] * frac;
}

function drawWindIndicator(ctx: CanvasRenderingContext2D, state: GameState) {
  const cx = WORLD_WIDTH / 2;
  const cy = 24;
  const w = state.wind;
  const dir = w >= 0 ? 1 : -1;
  const strength = Math.min(1, Math.abs(w) / (state.map.windRange * 22));
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(10,14,26,0.6)";
  roundRect(ctx, cx - 68, cy - 15, 136, 30, 15);
  ctx.fill();
  ctx.fillStyle = "#e8edf5";
  ctx.font = "11px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("الرياح", cx, cy - 3);
  ctx.font = "bold 12px Arial";
  const arrow = dir > 0 ? "→".repeat(Math.max(1, Math.round(strength * 3))) : "←".repeat(Math.max(1, Math.round(strength * 3)));
  ctx.fillStyle = strength > 0.6 ? "#fca5a5" : "#a7f3d0";
  ctx.fillText(arrow, cx, cy + 11);
  ctx.restore();
}

// ---------- Warriors (sprite sheet: Idle | Attack | Defeated) ----------

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, id: PlayerId) {
  const player = state.players[id];
  const archetype = archetypeById(player.archetype);
  const feetY = playerFeetY(state, id);
  const isActive = state.turn === id && state.phase !== "gameOver";

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(player.x, feetY + 2, SPRITE_DRAW_SIZE * 0.28, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const sheet = getWarriorSheet(player.archetype);
  const manifest = getManifest();
  const frameSize = manifest?.warriorFrameSize ?? 256;
  const frameIndex = player.hp <= 0 ? 2 : state.elapsed < player.attackPoseUntil ? 1 : 0;

  ctx.save();
  if (isActive) {
    ctx.shadowColor = archetype.accentColor;
    ctx.shadowBlur = 18;
  }
  ctx.translate(player.x, feetY + 2);
  if (player.facing === -1) ctx.scale(-1, 1);

  if (sheet) {
    ctx.drawImage(
      sheet,
      frameIndex * frameSize,
      0,
      frameSize,
      frameSize,
      -SPRITE_DRAW_SIZE / 2,
      -SPRITE_DRAW_SIZE,
      SPRITE_DRAW_SIZE,
      SPRITE_DRAW_SIZE
    );
  } else {
    // Fallback silhouette so the match stays playable even if a sprite
    // failed to load (missing file, bad path, offline first load, etc.).
    ctx.fillStyle = archetype.accentColor;
    roundRect(ctx, -PLAYER_WIDTH / 2, -PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH * 0.3);
    ctx.fill();
  }
  ctx.restore();

  if (player.status.shieldActive) {
    ctx.save();
    ctx.strokeStyle = "rgba(103,232,249,0.9)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(player.x, feetY - SPRITE_DRAW_SIZE * 0.5, SPRITE_DRAW_SIZE * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (player.status.burnTurns > 0) {
    ctx.save();
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🔥", player.x + SPRITE_DRAW_SIZE * 0.34, feetY - SPRITE_DRAW_SIZE - 4);
    ctx.restore();
  }
  if (player.status.slowTurns > 0) {
    ctx.save();
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("❄️", player.x - SPRITE_DRAW_SIZE * 0.34, feetY - SPRITE_DRAW_SIZE - 4);
    ctx.restore();
  }

  const barW = 62;
  const barX = player.x - barW / 2;
  const barY = feetY - SPRITE_DRAW_SIZE - 20;
  ctx.save();
  ctx.fillStyle = "rgba(10,14,24,0.65)";
  roundRect(ctx, barX - 2, barY - 2, barW + 4, 11, 5);
  ctx.fill();
  const hpRatio = Math.max(0, player.hp / player.maxHp);
  const hpColor = hpRatio > 0.5 ? "#4ade80" : hpRatio > 0.22 ? "#facc15" : "#f87171";
  ctx.fillStyle = hpColor;
  roundRect(ctx, barX, barY, barW * hpRatio, 7, 3.5);
  ctx.fill();
  ctx.restore();
}

// ---------- Weapon projectile rendering ----------
// Icons come from the manifest's weapon sprites, keyed by projectile TYPE
// (arrow/axe/fire/grenade/ice/rocket/shuriken/spear). Axe and shuriken spin
// continuously in flight; everything else aligns with its velocity vector.
// Falls back to a plain dot if an icon failed to load.

function drawWeaponIcon(ctx: CanvasRenderingContext2D, type: WeaponDef["type"], colorMain: string, size: number) {
  const icon = getWeaponIcon(type);
  if (icon) {
    ctx.drawImage(icon, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = colorMain;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAimGuide(ctx: CanvasRenderingContext2D, state: GameState, playerId: PlayerId, aim: AimState) {
  const player = state.players[playerId];
  const feetY = playerFeetY(state, playerId);
  const originY = feetY - SPRITE_DRAW_SIZE * 0.6;
  const originX = player.x + player.facing * (SPRITE_DRAW_SIZE * 0.22);

  const weapon = weaponById(state.selectedWeapon[playerId]);
  const powerRatio = clamp(Math.hypot(aim.dragX, aim.dragY) / MAX_DRAG, 0, 1);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + aim.dragX, originY + aim.dragY);
  ctx.stroke();

  // Dotted preview arc — mirrors engine.fire() exactly (same angle clamp,
  // same weapon speed/weight, same facing lock) and reuses the shared
  // simulateTrajectory function so the preview can never drift from the
  // real flight physics used in engine.ts. Deliberately short (per the
  // design brief: hint at the shot, never reveal the full path).
  const angle = clamp(
    Math.atan2(-aim.dragY, Math.abs(aim.dragX) < 1 ? 1 : Math.abs(aim.dragX)),
    (5 * Math.PI) / 180,
    (85 * Math.PI) / 180
  );
  const speed = powerRatio * MAX_LAUNCH_SPEED * weapon.speedScale * weapon.weightDrag;
  const vx = Math.cos(angle) * speed * player.facing;
  const vy = -Math.sin(angle) * speed;
  const points = simulateTrajectory(originX, originY, vx, vy, state.wind, weapon.gravityScale, state.terrain, 26, 1 / 60);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < points.length; i++) {
    if (i % 4 === 0) {
      const t = 1 - i / points.length;
      ctx.globalAlpha = 0.25 + t * 0.55;
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = powerRatio > 0.85 ? "#f87171" : "#e8edf5";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(Math.round(powerRatio * 100) + "%", originX, originY - 26);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, state: GameState) {
  const proj = state.projectile!;
  ctx.save();
  for (let i = 0; i < proj.trail.length; i++) {
    const t = proj.trail[i];
    ctx.globalAlpha = (i / proj.trail.length) * 0.45;
    ctx.fillStyle = proj.weapon.colorTrail;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.translate(proj.x, proj.y);
  if (proj.weapon.type === "axe" || proj.weapon.type === "shuriken") {
    ctx.rotate(frameClock * 22 * (proj.vx >= 0 ? 1 : -1));
  } else {
    ctx.rotate(Math.atan2(proj.vy, proj.vx));
  }
  drawWeaponIcon(ctx, proj.weapon.type, proj.weapon.colorMain, WEAPON_ICON_SIZE);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
