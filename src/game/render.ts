import { PlayerId, WeaponDef, archetypeById } from "./entities";
import {
  Camera,
  GameState,
  MAX_DRAG,
  MAX_LAUNCH_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  playerFeetY,
  weaponById,
} from "./engine";
import {
  TERRAIN_SAMPLES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clamp,
  simulateTrajectory,
} from "./physics";
import {
  getManifest,
  getTerrainSprite,
  getWarriorSheet,
  getWeaponIcon,
} from "./assets";

export interface AimState {
  active: boolean;
  dragX: number;
  dragY: number;
}

// Visual drawing size only.
// PLAYER_HEIGHT and PLAYER_WIDTH remain dedicated to gameplay collision math.
const SPRITE_DRAW_SIZE = 108;
const WEAPON_ICON_SIZE = 30;

let frameClock = 0;

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  aim: AimState,
  scale: number,
  offsetX: number,
  offsetY: number
) {
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

  if (state.projectile) {
    drawProjectile(ctx, state);
  }

  drawParticles(ctx, state);
  drawFloaters(ctx, state);

  ctx.restore();

  drawWindIndicator(ctx, state);

  ctx.restore();
}

function applyCamera(
  ctx: CanvasRenderingContext2D,
  cam: Camera
) {
  ctx.translate(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    0,
    WORLD_HEIGHT
  );

  gradient.addColorStop(0, state.map.skyTop);
  gradient.addColorStop(1, state.map.skyBottom);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.save();

  const sunX = WORLD_WIDTH * 0.8;
  const sunY = WORLD_HEIGHT * 0.16;

  const glow = ctx.createRadialGradient(
    sunX,
    sunY,
    4,
    sunX,
    sunY,
    70
  );

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
    const t =
      ((cloudSeed + i * 137 + frameClock * 3) % 1000) /
      1000;

    const cloudX = t * (WORLD_WIDTH + 260) - 130;

    const cloudY =
      WORLD_HEIGHT *
      (0.08 + (((i * 71) % 100) / 100) * 0.16);

    drawCloud(
      ctx,
      cloudX,
      cloudY,
      30 + (i % 3) * 10
    );
  }

  ctx.restore();
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.beginPath();

  ctx.ellipse(
    x,
    y,
    size,
    size * 0.42,
    0,
    0,
    Math.PI * 2
  );

  ctx.ellipse(
    x + size * 0.55,
    y + size * 0.08,
    size * 0.62,
    size * 0.32,
    0,
    0,
    Math.PI * 2
  );

  ctx.ellipse(
    x - size * 0.5,
    y + size * 0.1,
    size * 0.5,
    size * 0.28,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();
}

function hashMap(id: string): number {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash =
      (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  return hash % 1000;
}

function drawParallaxLayers(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  const cameraShift =
    (state.camera.x - WORLD_WIDTH / 2) * -1;

  drawMountainLayer(
    ctx,
    state.map.mountainFar,
    WORLD_HEIGHT * 0.62,
    WORLD_HEIGHT * 0.22,
    cameraShift * 0.04,
    hashMap(state.map.id + "far")
  );

  drawMountainLayer(
    ctx,
    state.map.mountainNear,
    WORLD_HEIGHT * 0.72,
    WORLD_HEIGHT * 0.16,
    cameraShift * 0.09,
    hashMap(state.map.id + "near")
  );
}

function drawMountainLayer(
  ctx: CanvasRenderingContext2D,
  color: string,
  baseY: number,
  amplitude: number,
  shiftX: number,
  seed: number
) {
  ctx.save();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(-40 + shiftX, WORLD_HEIGHT + 4);

  const peaks = 7;

  for (let i = 0; i <= peaks; i++) {
    const x =
      shiftX -
      60 +
      (i / peaks) * (WORLD_WIDTH + 120);

    const noise =
      Math.sin(i * 12.9898 + seed) *
      43758.5453;

    const fraction =
      noise - Math.floor(noise);

    const y =
      baseY -
      amplitude * (0.35 + fraction * 0.65);

    ctx.lineTo(x, y);
  }

  ctx.lineTo(
    WORLD_WIDTH + 40 + shiftX,
    WORLD_HEIGHT + 4
  );

  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function terrainPoints(
  state: GameState
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < TERRAIN_SAMPLES; i++) {
    points.push({
      x:
        (i / (TERRAIN_SAMPLES - 1)) *
        WORLD_WIDTH,
      y: state.terrain[i],
    });
  }

  return points;
}

function clipToTerrainSilhouette(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[]
) {
  ctx.beginPath();

  ctx.moveTo(
    points[0].x,
    WORLD_HEIGHT + 4
  );

  for (const point of points) {
    ctx.lineTo(point.x, point.y);
  }

  ctx.lineTo(
    points[points.length - 1].x,
    WORLD_HEIGHT + 4
  );

  ctx.closePath();
  ctx.clip();
}

function isImageReady(
  image: HTMLImageElement | undefined
): image is HTMLImageElement {
  return Boolean(
    image &&
      image.complete &&
      image.naturalWidth > 0 &&
      image.naturalHeight > 0
  );
}

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  const points = terrainPoints(state);
  const sprite = getTerrainSprite(
    state.map.terrainSprite
  );

  ctx.save();
  clipToTerrainSilhouette(ctx, points);

  if (isImageReady(sprite)) {
    ctx.fillStyle = state.map.rockColor;
    ctx.fillRect(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT + 4
    );

    const topY =
      Math.min(...state.terrain) - 24;

    const bottomY =
      WORLD_HEIGHT + 24;

    ctx.drawImage(
      sprite,
      0,
      0,
      sprite.naturalWidth,
      sprite.naturalHeight,
      0,
      topY,
      WORLD_WIDTH,
      bottomY - topY
    );
  } else {
    fillTerrainBand(
      ctx,
      points,
      WORLD_HEIGHT + 4,
      state.map.rockColor,
      0
    );

    fillTerrainBand(
      ctx,
      points,
      WORLD_HEIGHT + 4,
      state.map.soilColor,
      16
    );

    const gradient = ctx.createLinearGradient(
      0,
      WORLD_HEIGHT * 0.4,
      0,
      WORLD_HEIGHT * 0.4 + 30
    );

    gradient.addColorStop(
      0,
      state.map.groundTop
    );

    gradient.addColorStop(
      1,
      state.map.groundBottom
    );

    fillTerrainBand(
      ctx,
      points,
      WORLD_HEIGHT + 4,
      gradient,
      0,
      10
    );
  }

  ctx.restore();

  ctx.beginPath();

  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });

  ctx.strokeStyle =
    "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();

  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(
        point.x,
        point.y + 1.5
      );
    } else {
      ctx.lineTo(
        point.x,
        point.y + 1.5
      );
    }
  });

  ctx.strokeStyle =
    "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function fillTerrainBand(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  bottomY: number,
  fill: string | CanvasGradient,
  yOffset: number,
  onlyTopThickness = 0
) {
  ctx.beginPath();

  ctx.moveTo(
    points[0].x,
    bottomY
  );

  for (const point of points) {
    ctx.lineTo(
      point.x,
      point.y + yOffset
    );
  }

  ctx.lineTo(
    points[points.length - 1].x,
    bottomY
  );

  ctx.closePath();

  if (onlyTopThickness > 0) {
    ctx.save();
    ctx.clip();

    ctx.beginPath();

    ctx.moveTo(
      points[0].x,
      points[0].y +
        onlyTopThickness +
        40
    );

    for (const point of points) {
      ctx.lineTo(
        point.x,
        point.y +
          onlyTopThickness +
          40
      );
    }

    for (
      let i = points.length - 1;
      i >= 0;
      i--
    ) {
      ctx.lineTo(
        points[i].x,
        points[i].y - 4
      );
    }

    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.restore();
  } else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  for (const decoration of state.decorations) {
    const terrainY = sampleTerrainY(
      state.terrain,
      decoration.x
    );

    ctx.save();
    ctx.translate(
      decoration.x,
      terrainY
    );

    if (decoration.flip) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle =
      state.map.decoColor;

    if (decoration.type === "grass") {
      const size = 6 * decoration.size;

      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();

        ctx.moveTo(
          i * size * 0.6,
          2
        );

        ctx.quadraticCurveTo(
          i * size * 0.6 +
            size * 0.3,
          -size * 0.6,
          i * size * 0.3,
          -size
        );

        ctx.lineTo(
          i * size * 0.15,
          2
        );

        ctx.closePath();
        ctx.fill();
      }
    } else if (
      decoration.type === "rock"
    ) {
      const size = 7 * decoration.size;

      ctx.beginPath();
      ctx.moveTo(-size, 2);
      ctx.lineTo(
        -size * 0.6,
        -size * 0.7
      );
      ctx.lineTo(
        size * 0.2,
        -size * 0.9
      );
      ctx.lineTo(
        size,
        -size * 0.1
      );
      ctx.lineTo(
        size * 0.7,
        2
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle =
        "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const size = 8 * decoration.size;

      ctx.beginPath();

      ctx.ellipse(
        0,
        -size * 0.4,
        size,
        size * 0.62,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.restore();
  }
}

function sampleTerrainY(
  terrain: number[],
  x: number
): number {
  const normalizedX = clamp(
    x / WORLD_WIDTH,
    0,
    0.999999
  );

  const index =
    normalizedX *
    (TERRAIN_SAMPLES - 1);

  const lowerIndex =
    Math.floor(index);

  const upperIndex =
    Math.min(
      lowerIndex + 1,
      TERRAIN_SAMPLES - 1
    );

  const fraction =
    index - lowerIndex;

  return (
    terrain[lowerIndex] *
      (1 - fraction) +
    terrain[upperIndex] *
      fraction
  );
}

function drawWindIndicator(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  const centerX = WORLD_WIDTH / 2;
  const centerY = 24;

  const wind = state.wind;
  const direction = wind >= 0 ? 1 : -1;

  const windDivider =
    state.map.windRange > 0
      ? state.map.windRange * 22
      : 1;

  const strength = Math.min(
    1,
    Math.abs(wind) / windDivider
  );

  ctx.save();

  ctx.globalAlpha = 0.92;
  ctx.fillStyle =
    "rgba(10,14,26,0.6)";

  roundRect(
    ctx,
    centerX - 68,
    centerY - 15,
    136,
    30,
    15
  );

  ctx.fill();

  ctx.fillStyle = "#e8edf5";
  ctx.font = "11px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    "الرياح",
    centerX,
    centerY - 3
  );

  ctx.font = "bold 12px Arial";

  const arrowCount = Math.max(
    1,
    Math.round(strength * 3)
  );

  const arrows =
    direction > 0
      ? "→".repeat(arrowCount)
      : "←".repeat(arrowCount);

  ctx.fillStyle =
    strength > 0.6
      ? "#fca5a5"
      : "#a7f3d0";

  ctx.fillText(
    arrows,
    centerX,
    centerY + 11
  );

  ctx.restore();
}

function getVisualFacing(
  state: GameState,
  id: PlayerId
): 1 | -1 {
  const player = state.players[id];

  const opponent =
    state.players[
      id === "p1" ? "p2" : "p1"
    ];

  if (opponent.x > player.x) {
    return 1;
  }

  if (opponent.x < player.x) {
    return -1;
  }

  return player.facing;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  id: PlayerId
) {
  const player = state.players[id];

  const archetype = archetypeById(
    player.archetype
  );

  const feetY = playerFeetY(
    state,
    id
  );

  const isActive =
    state.turn === id &&
    state.phase !== "gameOver";

  const isDefeated =
    player.hp <= 0;

  const isAttacking =
    !isDefeated &&
    state.elapsed <
      player.attackPoseUntil;

  const image = getWarriorSheet(
    player.archetype
  );

  const imageReady =
    isImageReady(image);

  const visualFacing =
    getVisualFacing(state, id);

  let bobY = 0;

  if (player.isMoving && !isDefeated) {
    bobY = Math.abs(Math.sin(frameClock * 16)) * -3.2;
  } else if (
    isActive &&
    state.phase === "aiming" &&
    !isDefeated
  ) {
    bobY =
      Math.sin(frameClock * 6) *
      1.6;
  }

  ctx.save();

  ctx.globalAlpha =
    isDefeated ? 0.18 : 0.35;

  ctx.fillStyle = "#000000";
  ctx.beginPath();

  ctx.ellipse(
    player.x,
    feetY + 2,
    SPRITE_DRAW_SIZE * 0.28,
    5,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.restore();

  ctx.save();

  if (isActive && !isDefeated) {
    ctx.shadowColor =
      archetype.accentColor;

    ctx.shadowBlur = 18;
  }

  ctx.translate(
    player.x,
    feetY + 2 + bobY
  );

  if (visualFacing === -1) {
    ctx.scale(-1, 1);
  }

  if (isDefeated) {
    ctx.globalAlpha = 0.55;
  } else if (isAttacking) {
    const attackMotion =
      Math.sin(
        clamp(
          (player.attackPoseUntil -
            state.elapsed) *
            16,
          0,
          Math.PI
        )
      );

    ctx.translate(
      attackMotion * 5,
      -attackMotion * 2
    );

    ctx.rotate(
      -0.08 * attackMotion
    );
  }

  if (imageReady) {
    const manifest = getManifest();
    const configuredFrameSize = manifest?.warriorFrameSize ?? 256;

    const isThreeFrameSheet =
      image.naturalWidth >= image.naturalHeight * 2.9 &&
      image.naturalWidth <= image.naturalHeight * 3.1;

    const frameIndex =
      player.hp <= 0
        ? 2
        : state.elapsed < player.attackPoseUntil
          ? 1
          : 0;

    let frameWidth = configuredFrameSize;
    let frameHeight = image.naturalHeight;
    let finalFrameIndex = frameIndex;

    if (isThreeFrameSheet) {
      frameWidth = Math.floor(image.naturalWidth / 3);
      frameHeight = image.naturalHeight;
    } else {
      frameWidth = image.naturalWidth;
      frameHeight = image.naturalHeight;
      finalFrameIndex = 0;
    }

    const sourceX = finalFrameIndex * frameWidth;

    ctx.drawImage(
      image,
      sourceX,
      0,
      frameWidth,
      frameHeight,
      -SPRITE_DRAW_SIZE / 2,
      -SPRITE_DRAW_SIZE,
      SPRITE_DRAW_SIZE,
      SPRITE_DRAW_SIZE
    );
  } else {
    ctx.fillStyle =
      archetype.accentColor;

    roundRect(
      ctx,
      -PLAYER_WIDTH / 2,
      -PLAYER_HEIGHT,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      PLAYER_WIDTH * 0.3
    );

    ctx.fill();

    ctx.save();

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#111827";

    ctx.beginPath();

    ctx.arc(
      0,
      -PLAYER_HEIGHT * 0.82,
      PLAYER_WIDTH * 0.28,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  ctx.restore();

  if (
    player.status.shieldActive &&
    !isDefeated
  ) {
    const shieldPulse =
      1 +
      Math.sin(frameClock * 5) *
        0.025;

    ctx.save();

    ctx.strokeStyle =
      "rgba(103,232,249,0.9)";

    ctx.fillStyle =
      "rgba(103,232,249,0.08)";

    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);

    ctx.beginPath();

    ctx.arc(
      player.x,
      feetY -
        SPRITE_DRAW_SIZE * 0.5 +
        bobY,
      SPRITE_DRAW_SIZE *
        0.58 *
        shieldPulse,
      0,
      Math.PI * 2
    );

    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  if (
    player.status.burnTurns > 0 &&
    !isDefeated
  ) {
    ctx.save();

    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      "🔥",
      player.x +
        SPRITE_DRAW_SIZE * 0.34,
      feetY -
        SPRITE_DRAW_SIZE -
        4 +
        bobY
    );

    ctx.restore();
  }

  if (
    player.status.slowTurns > 0 &&
    !isDefeated
  ) {
    ctx.save();

    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      "❄️",
      player.x -
        SPRITE_DRAW_SIZE * 0.34,
      feetY -
        SPRITE_DRAW_SIZE -
        4 +
        bobY
    );

    ctx.restore();
  }

  const healthBarWidth = 62;

  const healthBarX =
    player.x -
    healthBarWidth / 2;

  const healthBarY =
    feetY -
    SPRITE_DRAW_SIZE -
    20 +
    bobY;

  ctx.save();

  ctx.fillStyle =
    "rgba(10,14,24,0.65)";

  roundRect(
    ctx,
    healthBarX - 2,
    healthBarY - 2,
    healthBarWidth + 4,
    11,
    5
  );

  ctx.fill();

  const healthRatio = clamp(
    player.maxHp > 0
      ? player.hp / player.maxHp
      : 0,
    0,
    1
  );

  const healthColor =
    healthRatio > 0.5
      ? "#4ade80"
      : healthRatio > 0.22
        ? "#facc15"
        : "#f87171";

  if (healthRatio > 0) {
    ctx.fillStyle = healthColor;

    roundRect(
      ctx,
      healthBarX,
      healthBarY,
      healthBarWidth *
        healthRatio,
      7,
      3.5
    );

    ctx.fill();
  }

  ctx.restore();
}

function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  type: WeaponDef["type"],
  colorMain: string,
  size: number
) {
  const icon = getWeaponIcon(type);

  if (isImageReady(icon)) {
    const width =
      icon.naturalWidth ||
      icon.width ||
      size;

    const height =
      icon.naturalHeight ||
      icon.height ||
      size;

    const aspectRatio =
      width / height;

    let drawWidth = size;
    let drawHeight = size;

    if (
      Number.isFinite(aspectRatio) &&
      aspectRatio > 1
    ) {
      drawHeight =
        size / aspectRatio;
    } else if (
      Number.isFinite(aspectRatio) &&
      aspectRatio > 0 &&
      aspectRatio < 1
    ) {
      drawWidth =
        size * aspectRatio;
    }

    ctx.drawImage(
      icon,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
  } else {
    ctx.fillStyle = colorMain;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      size * 0.22,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}

function drawAimGuide(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  playerId: PlayerId,
  aim: AimState
) {
  const player =
    state.players[playerId];

  const feetY = playerFeetY(
    state,
    playerId
  );

  const originY =
    feetY -
    SPRITE_DRAW_SIZE * 0.6;

  const originX =
    player.x +
    player.facing *
      (SPRITE_DRAW_SIZE * 0.22);

  const weapon = weaponById(
    state.selectedWeapon[playerId]
  );

  const powerRatio = clamp(
    Math.hypot(
      aim.dragX,
      aim.dragY
    ) / MAX_DRAG,
    0,
    1
  );

  ctx.save();

  ctx.strokeStyle =
    "rgba(255,255,255,0.85)";

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.moveTo(
    originX,
    originY
  );

  ctx.lineTo(
    originX + aim.dragX,
    originY + aim.dragY
  );

  ctx.stroke();

  const angle = clamp(
    Math.atan2(
      -aim.dragY,
      Math.abs(aim.dragX) < 1
        ? 1
        : Math.abs(aim.dragX)
    ),
    (5 * Math.PI) / 180,
    (85 * Math.PI) / 180
  );

  const speed =
    powerRatio *
    MAX_LAUNCH_SPEED *
    weapon.speedScale *
    weapon.weightDrag;

  const velocityX =
    Math.cos(angle) *
    speed *
    player.facing;

  const velocityY =
    -Math.sin(angle) *
    speed;

  const points = simulateTrajectory(
    originX,
    originY,
    velocityX,
    velocityY,
    state.wind,
    weapon.gravityScale,
    state.terrain,
    26,
    1 / 60
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.7)";

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    if (i % 4 !== 0) {
      continue;
    }

    const trailFade =
      1 - i / points.length;

    ctx.globalAlpha =
      0.25 + trailFade * 0.55;

    ctx.beginPath();

    ctx.arc(
      points[i].x,
      points[i].y,
      2.6,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;

  ctx.fillStyle =
    powerRatio > 0.85
      ? "#f87171"
      : "#e8edf5";

  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";

  ctx.fillText(
    Math.round(powerRatio * 100) +
      "%",
    originX,
    originY - 26
  );

  ctx.restore();
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  const projectile =
    state.projectile!;

  ctx.save();

  for (
    let i = 0;
    i < projectile.trail.length;
    i++
  ) {
    const trailPoint =
      projectile.trail[i];

    ctx.globalAlpha =
      projectile.trail.length > 0
        ? (i /
            projectile.trail.length) *
          0.45
        : 0;

    ctx.fillStyle =
      projectile.weapon.colorTrail;

    ctx.beginPath();

    ctx.arc(
      trailPoint.x,
      trailPoint.y,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;

  ctx.translate(
    projectile.x,
    projectile.y
  );

  if (
    projectile.weapon.type === "axe" ||
    projectile.weapon.type ===
      "shuriken"
  ) {
    ctx.rotate(
      frameClock *
        22 *
        (projectile.vx >= 0 ? 1 : -1)
    );
  } else {
    ctx.rotate(
      Math.atan2(
        projectile.vy,
        projectile.vx
      )
    );
  }

  drawWeaponIcon(
    ctx,
    projectile.weapon.type,
    projectile.weapon.colorMain,
    WEAPON_ICON_SIZE
  );

  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  ctx.save();

  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(
      0,
      particle.life /
        particle.maxLife
    );

    ctx.fillStyle = particle.color;

    ctx.beginPath();

    ctx.arc(
      particle.x,
      particle.y,
      particle.size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFloaters(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  ctx.save();

  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";

  for (const floater of state.floaters) {
    ctx.globalAlpha = Math.max(
      0,
      Math.min(1, floater.life)
    );

    ctx.fillStyle =
      floater.color;

    ctx.fillText(
      floater.text,
      floater.x,
      floater.y
    );
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.max(
    0,
    Math.min(
      radius,
      Math.abs(width) / 2,
      Math.abs(height) / 2
    )
  );

  ctx.beginPath();

  ctx.moveTo(
    x + safeRadius,
    y
  );

  ctx.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    safeRadius
  );

  ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    safeRadius
  );

  ctx.arcTo(
    x,
    y + height,
    x,
    y,
    safeRadius
  );

  ctx.arcTo(
    x,
    y,
    x + width,
    y,
    safeRadius
  );

  ctx.closePath();
}
