// Core types and static game-content definitions for War Trajectory.

export type PlayerId = "p1" | "p2";
export type ProjectileType = "arrow" | "spear" | "axe" | "grenade" | "rocket" | "fire" | "ice" | "shuriken";
export type HitZone = "head" | "body";
export type GamePhase = "aiming" | "flying" | "resolving" | "gameOver";
export type Difficulty = "easy" | "normal" | "hard";

export interface WeaponDef {
  id: string;
  nameAr: string;
  type: ProjectileType;
  damage: number;
  speedScale: number; // multiplier applied to drag power -> initial velocity
  weightDrag: number; // 0..1, higher = slower max drag speed (heavier weapon)
  gravityScale: number; // multiplier on base gravity for this projectile
  splashRadius: number; // world units, 0 = no splash
  ammo: number; // Infinity for unlimited (bow)
  ricochet: boolean;
  burnTurns?: number;
  burnDamagePerTurn?: number;
  slowTurns?: number;
  colorMain: string;
  colorTrail: string;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: "bow",
    nameAr: "قوس وسهم",
    type: "arrow",
    damage: 16,
    speedScale: 1,
    weightDrag: 1,
    gravityScale: 1,
    splashRadius: 0,
    ammo: Infinity,
    ricochet: false,
    colorMain: "#e8dcc0",
    colorTrail: "rgba(232,220,192,0.55)",
  },
  {
    id: "spear",
    nameAr: "رمح قتالي",
    type: "spear",
    damage: 26,
    speedScale: 1.08,
    weightDrag: 0.82,
    gravityScale: 0.85,
    splashRadius: 0,
    ammo: 3,
    ricochet: false,
    colorMain: "#c9a678",
    colorTrail: "rgba(201,166,120,0.5)",
  },
  {
    id: "axe",
    nameAr: "فأس دوّار",
    type: "axe",
    damage: 22,
    speedScale: 0.95,
    weightDrag: 0.75,
    gravityScale: 1.05,
    splashRadius: 0,
    ammo: 3,
    ricochet: true,
    colorMain: "#b8b8c2",
    colorTrail: "rgba(184,184,194,0.5)",
  },
  {
    id: "shuriken",
    nameAr: "شوريكن",
    type: "shuriken",
    damage: 20,
    speedScale: 1.2,
    weightDrag: 0.98,
    gravityScale: 0.9,
    splashRadius: 0,
    ammo: 4,
    ricochet: true,
    colorMain: "#c8ccd4",
    colorTrail: "rgba(200,204,212,0.55)",
  },
  {
    id: "grenade",
    nameAr: "قنبلة يدوية",
    type: "grenade",
    damage: 30,
    speedScale: 0.72,
    weightDrag: 0.7,
    gravityScale: 1.15,
    splashRadius: 46,
    ammo: 3,
    ricochet: false,
    colorMain: "#6b7280",
    colorTrail: "rgba(107,114,128,0.5)",
  },
  {
    id: "rocket",
    nameAr: "قاذفة صواريخ",
    type: "rocket",
    damage: 40,
    speedScale: 0.62,
    weightDrag: 0.55,
    gravityScale: 0.6,
    splashRadius: 62,
    ammo: 2,
    ricochet: false,
    colorMain: "#ef4444",
    colorTrail: "rgba(239,68,68,0.55)",
  },
  {
    id: "fire",
    nameAr: "سهم ناري",
    type: "fire",
    damage: 14,
    speedScale: 0.98,
    weightDrag: 0.9,
    gravityScale: 1,
    splashRadius: 0,
    ammo: 3,
    ricochet: false,
    burnTurns: 2,
    burnDamagePerTurn: 6,
    colorMain: "#f59e0b",
    colorTrail: "rgba(245,158,11,0.6)",
  },
  {
    id: "ice",
    nameAr: "رمح جليدي",
    type: "ice",
    damage: 16,
    speedScale: 0.98,
    weightDrag: 0.88,
    gravityScale: 1,
    splashRadius: 0,
    ammo: 3,
    ricochet: false,
    slowTurns: 2,
    colorMain: "#67e8f9",
    colorTrail: "rgba(103,232,249,0.6)",
  },
];

export interface SkillDef {
  id: string;
  nameAr: string;
  descAr: string;
  cost: number;
  cooldown: number;
}

export const SKILLS: SkillDef[] = [
  {
    id: "shield",
    nameAr: "درع طاقة",
    descAr: "يقلل الضرر الوارد من الضربة القادمة 50%",
    cost: 2,
    cooldown: 3,
  },
  {
    id: "reposition",
    nameAr: "قفزة معززة",
    descAr: "غيّر موقعك على الأرض قبل التصويب",
    cost: 1,
    cooldown: 2,
  },
  {
    id: "surge",
    nameAr: "مضاعفة الضرر",
    descAr: "يضاعف ضرر إطلاقتك القادمة ×1.75",
    cost: 2,
    cooldown: 3,
  },
];

export interface MapDef {
  id: string;
  nameAr: string;
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  windRange: number; // max abs wind strength
  roughness: number; // terrain jaggedness 0..1
  soilColor: string; // mid-layer material band (fallback if the sprite is unavailable)
  rockColor: string; // deep foundation band (fallback if the sprite is unavailable)
  mountainFar: string; // distant parallax silhouette
  mountainNear: string; // closer parallax silhouette
  cloudColor: string;
  decoColor: string; // grass/bush accent color
  accentGlow: string; // sun/moon + rim-light tint
  terrainSprite: string; // key into the asset manifest's "terrain" entries
}

export const MAPS: MapDef[] = [
  {
    id: "desert",
    nameAr: "الصحراء",
    skyTop: "#2b3a67",
    skyBottom: "#e8b96a",
    groundTop: "#d9a256",
    groundBottom: "#8a5a2b",
    windRange: 9,
    roughness: 0.35,
    soilColor: "#a9723a",
    rockColor: "#5c3c1f",
    mountainFar: "#3a4a7a",
    mountainNear: "#2c3760",
    cloudColor: "rgba(255,244,222,0.75)",
    decoColor: "#8a7239",
    accentGlow: "#ffe6ad",
    terrainSprite: "platform_desert",
  },
  {
    id: "mountains",
    nameAr: "الجبال",
    skyTop: "#1b2b4b",
    skyBottom: "#7ea8c9",
    groundTop: "#6b7d63",
    groundBottom: "#3c4a37",
    windRange: 4,
    roughness: 0.75,
    soilColor: "#4c5c46",
    rockColor: "#2b3427",
    mountainFar: "#2a3f5c",
    mountainNear: "#1c2d45",
    cloudColor: "rgba(232,240,248,0.8)",
    decoColor: "#3f5a3a",
    accentGlow: "#dff0ff",
    terrainSprite: "platform_grass",
  },
  {
    id: "volcanic",
    nameAr: "الجزيرة البركانية",
    skyTop: "#2a1220",
    skyBottom: "#c9553a",
    groundTop: "#4a3230",
    groundBottom: "#231313",
    windRange: 6,
    roughness: 0.55,
    soilColor: "#3a2420",
    rockColor: "#1c1210",
    mountainFar: "#5c2a2a",
    mountainNear: "#3a1a1c",
    cloudColor: "rgba(90,50,40,0.5)",
    decoColor: "#5c3a28",
    accentGlow: "#ff8a5c",
    terrainSprite: "platform_volcanic",
  },
];

export interface WarriorArchetype {
  id: string; // matches the sprite key in the asset manifest exactly (warriors/<id>.png)
  nameAr: string;
  accentColor: string; // used for HUD portrait ring + UI accents only (art now lives in the sprite)
  signatureWeapon: string;
}

export const ARCHETYPES: WarriorArchetype[] = [
  {
    id: "viking",
    nameAr: "المحارب الفايكنغ",
    accentColor: "#f4d488",
    signatureWeapon: "axe",
  },
  {
    id: "archer",
    nameAr: "رامي الغابة",
    accentColor: "#facc15",
    signatureWeapon: "bow",
  },
  {
    id: "ninja",
    nameAr: "النينجا",
    accentColor: "#67e8f9",
    signatureWeapon: "shuriken",
  },
  {
    id: "knight",
    nameAr: "الفارس المدرّع",
    accentColor: "#e8edf5",
    signatureWeapon: "spear",
  },
  {
    id: "engineer",
    nameAr: "المهندس",
    accentColor: "#a3e635",
    signatureWeapon: "grenade",
  },
];

export function archetypeById(id: string): WarriorArchetype {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[0];
}

export interface StatusEffects {
  burnTurns: number;
  burnDamagePerTurn: number;
  slowTurns: number; // affects visual aim wobble only in this build
  shieldActive: boolean;
}

export interface PlayerState {
  id: PlayerId;
  nameAr: string;
  x: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  archetype: string;
  attackPoseUntil: number; // GameState.elapsed timestamp until which the "attack" frame is shown
  ammo: Record<string, number>;
  energy: number;
  cooldowns: Record<string, number>;
  status: StatusEffects;
  damageMultiplierNext: number;
}

export function freshAmmo(): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const w of WEAPONS) rec[w.id] = w.ammo;
  return rec;
}

export function freshCooldowns(): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const s of SKILLS) rec[s.id] = 0;
  return rec;
}

export function makePlayer(
  id: PlayerId,
  nameAr: string,
  x: number,
  facing: 1 | -1,
  archetypeId: string
): PlayerState {
  const archetype = archetypeById(archetypeId);
  return {
    id,
    nameAr,
    x,
    hp: 100,
    maxHp: 100,
    facing,
    archetype: archetype.id,
    attackPoseUntil: 0,
    ammo: freshAmmo(),
    energy: 2,
    cooldowns: freshCooldowns(),
    status: { burnTurns: 0, burnDamagePerTurn: 0, slowTurns: 0, shieldActive: false },
    damageMultiplierNext: 1,
  };
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: WeaponDef;
  ownerId: PlayerId;
  trail: { x: number; y: number }[];
  bounces: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
