import { PlayerId, PlayerState } from "./entities";
import { GameState, MAX_DRAG, MAX_LAUNCH_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH, playerFeetY, weaponById } from "./engine";
import { TERRAIN_SAMPLES, WORLD_HEIGHT, WORLD_WIDTH, clamp, simulateTrajectory } from "./physics";

export interface AimState {
  active: boolean;
  dragX: number;
  dragY: number;
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, aim: AimState, scale: number, offsetX: number, offsetY: number) {
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawSky(ctx, state);
  drawTerrain(ctx, state);
  drawWindIndicator(ctx, state);

  const activePlayer = state.players[state.turn];
  drawPlayer(ctx, state, "p1");
  drawPlayer(ctx, state, "p2");

  if (aim.active && state.phase === "aiming") {
    drawAimGuide(ctx, state, activePlayer, aim);
  }

  if (state.projectile) drawProjectile(ctx, state);

  drawParticles(ctx, state);
  drawFloaters(ctx, state);

  ctx.restore();
}

function drawSky(ctx: CanvasRenderingContext2D, state: GameState) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  g.addColorStop(0, state.map.skyTop);
  g.addColorStop(1, state.map.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#fff7e0";
  ctx.beginPath();
  ctx.arc(WORLD_WIDTH * 0.82, WORLD_HEIGHT * 0.18, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTerrain(ctx: CanvasRenderingContext2D, state: GameState) {
  const g = ctx.createLinearGradient(0, WORLD_HEIGHT * 0.35, 0, WORLD_HEIGHT);
  g.addColorStop(0, state.map.groundTop);
  g.addColorStop(1, state.map.groundBottom);

  ctx.beginPath();
  ctx.moveTo(0, WORLD_HEIGHT + 4);
  for (let i = 0; i < TERRAIN_SAMPLES; i++) {
    const x = (i / (TERRAIN_SAMPLES - 1)) * WORLD_WIDTH;
    ctx.lineTo(x, state.terrain[i]);
  }
  ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT + 4);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < TERRAIN_SAMPLES; i++) {
    const x = (i / (TERRAIN_SAMPLES - 1)) * WORLD_WIDTH;
    if (i === 0) ctx.moveTo(x, state.terrain[i]);
    else ctx.lineTo(x, state.terrain[i]);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawWindIndicator(ctx: CanvasRenderingContext2D, state: GameState) {
  const cx = WORLD_WIDTH / 2;
  const cy = 26;
  const w = state.wind;
  const dir = w >= 0 ? 1 : -1;
  const strength = Math.min(1, Math.abs(w) / (state.map.windRange * 22));
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(15,20,35,0.55)";
  roundRect(ctx, cx - 74, cy - 16, 148, 32, 16);
  ctx.fill();
  ctx.fillStyle = "#e8edf5";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("الرياح", cx, cy - 2);
  ctx.font = "bold 12px Arial";
  const arrow = dir > 0 ? "→".repeat(Math.max(1, Math.round(strength * 3))) : "←".repeat(Math.max(1, Math.round(strength * 3)));
  ctx.fillStyle = strength > 0.6 ? "#fca5a5" : "#a7f3d0";
  ctx.fillText(arrow, cx, cy + 12);
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, id: PlayerId) {
  const player = state.players[id];
  const feetY = playerFeetY(state, id);
  const top = feetY - PLAYER_HEIGHT;
  const isActive = state.turn === id && state.phase !== "gameOver";

  ctx.save();
  if (isActive) {
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 18;
  }

  // legs
  ctx.fillStyle = player.colorDark;
  ctx.fillRect(player.x - PLAYER_WIDTH / 2 + 3, feetY - 12, 6, 12);
  ctx.fillRect(player.x + PLAYER_WIDTH / 2 - 9, feetY - 12, 6, 12);

  // body
  ctx.fillStyle = player.color;
  roundRect(ctx, player.x - PLAYER_WIDTH / 2, top + PLAYER_HEIGHT * 0.32, PLAYER_WIDTH, PLAYER_HEIGHT * 0.56, 6);
  ctx.fill();

  // head
  const headCY = top + PLAYER_HEIGHT * 0.18;
  ctx.beginPath();
  ctx.arc(player.x, headCY, PLAYER_HEIGHT * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = "#f2c9a0";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = player.colorDark;
  ctx.stroke();

  // weapon indicator arm
  ctx.strokeStyle = player.colorDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, top + PLAYER_HEIGHT * 0.42);
  ctx.lineTo(player.x + player.facing * 14, top + PLAYER_HEIGHT * 0.42 - 4);
  ctx.stroke();

  ctx.restore();

  if (player.status.shieldActive) {
    ctx.save();
    ctx.strokeStyle = "rgba(103,232,249,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, (top + feetY) / 2, PLAYER_HEIGHT * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (player.status.burnTurns > 0) {
    ctx.save();
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🔥", player.x + 16, top - 4);
    ctx.restore();
  }
  if (player.status.slowTurns > 0) {
    ctx.save();
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("❄️", player.x - 16, top - 4);
    ctx.restore();
  }

  // health bar
  const barW = 56;
  const barX = player.x - barW / 2;
  const barY = top - 22;
  ctx.save();
  ctx.fillStyle = "rgba(10,14,24,0.6)";
  roundRect(ctx, barX - 2, barY - 2, barW + 4, 10, 4);
  ctx.fill();
  const hpRatio = Math.max(0, player.hp / player.maxHp);
  const hpColor = hpRatio > 0.5 ? "#4ade80" : hpRatio > 0.22 ? "#facc15" : "#f87171";
  ctx.fillStyle = hpColor;
  roundRect(ctx, barX, barY, barW * hpRatio, 6, 3);
  ctx.fill();
  ctx.restore();
}

function drawAimGuide(ctx: CanvasRenderingContext2D, state: GameState, player: PlayerState, aim: AimState) {
  const feetY = playerFeetY(state, player.id);
  const originY = feetY - PLAYER_HEIGHT * 0.62;
  const originX = player.x + player.facing * (PLAYER_WIDTH * 0.7);

  const weapon = weaponById(state.selectedWeapon[player.id]);
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
  // real flight physics used in engine.ts.
  const angle = clamp(
    Math.atan2(-aim.dragY, Math.abs(aim.dragX) < 1 ? 1 : Math.abs(aim.dragX)),
    (5 * Math.PI) / 180,
    (85 * Math.PI) / 180
  );
  const speed = powerRatio * MAX_LAUNCH_SPEED * weapon.speedScale * weapon.weightDrag;
  const vx = Math.cos(angle) * speed * player.facing;
  const vy = -Math.sin(angle) * speed;
  const points = simulateTrajectory(originX, originY, vx, vy, state.wind, weapon.gravityScale, state.terrain, 90, 1 / 60);

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (let i = 0; i < points.length; i++) {
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
    ctx.globalAlpha = (i / proj.trail.length) * 0.5;
    ctx.fillStyle = proj.weapon.colorTrail;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = proj.weapon.colorMain;
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
  ctx.fill();
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
