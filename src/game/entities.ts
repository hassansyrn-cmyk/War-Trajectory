// Core types and static game-content definitions for War Trajectory.

export type PlayerId = "p1" | "p2";
export type ProjectileType = "arrow" | "spear" | "axe" | "grenade" | "rocket" | "fire" | "ice" | "shuriken";
export type HitZone = "head" | "body";
export type GamePhase = "aiming" | "flying" | "resolving" | "gameOver";
export type Difficulty = "easy" | "normal" | "hard";
export type MapEffect = "gust" | "ridge" | "ember";

export interface WeaponDef {
  id: string;
  nameAr: string;
  type: ProjectileType;
  damage: number;
  speedScale: number;
  weightDrag: number;
  gravityScale: number;
  splashRadius: number;
  ammo: number;
  ricochet: boolean;
  burnTurns?: number;
  burnDamagePerTurn?: number;
  slowTurns?: number;
  colorMain: string;
  colorTrail: string;
}

export const WEAPONS: WeaponDef[] = [
  { id: "bow", nameAr: "قوس وسهم", type: "arrow", damage: 16, speedScale: 1.15, weightDrag: 1, gravityScale: 0.92, splashRadius: 0, ammo: Infinity, ricochet: false, colorMain: "#e8dcc0", colorTrail: "rgba(232,220,192,0.55)" },
  { id: "spear", nameAr: "رمح قتالي", type: "spear", damage: 26, speedScale: 1, weightDrag: 0.85, gravityScale: 0.9, splashRadius: 0, ammo: 3, ricochet: false, colorMain: "#c9a678", colorTrail: "rgba(201,166,120,0.5)" },
  { id: "axe", nameAr: "فأس دوّار", type: "axe", damage: 22, speedScale: 0.85, weightDrag: 0.72, gravityScale: 1.1, splashRadius: 0, ammo: 3, ricochet: true, colorMain: "#b8b8c2", colorTrail: "rgba(184,184,194,0.5)" },
  { id: "shuriken", nameAr: "شوريكن", type: "shuriken", damage: 18, speedScale: 1.05, weightDrag: 0.9, gravityScale: 1, splashRadius: 0, ammo: 4, ricochet: true, colorMain: "#c8ccd4", colorTrail: "rgba(200,204,212,0.55)" },
  { id: "grenade", nameAr: "قنبلة يدوية", type: "grenade", damage: 30, speedScale: 0.65, weightDrag: 0.68, gravityScale: 1.2, splashRadius: 46, ammo: 3, ricochet: false, colorMain: "#6b7280", colorTrail: "rgba(107,114,128,0.5)" },
  { id: "rocket", nameAr: "قاذفة صواريخ", type: "rocket", damage: 40, speedScale: 0.85, weightDrag: 0.62, gravityScale: 0.5, splashRadius: 62, ammo: 2, ricochet: false, colorMain: "#ef4444", colorTrail: "rgba(239,68,68,0.55)" },
  { id: "fire", nameAr: "سهم ناري", type: "fire", damage: 14, speedScale: 1.1, weightDrag: 0.95, gravityScale: 0.95, splashRadius: 0, ammo: 3, ricochet: false, burnTurns: 2, burnDamagePerTurn: 6, colorMain: "#f59e0b", colorTrail: "rgba(245,158,11,0.6)" },
  { id: "ice", nameAr: "رمح جليدي", type: "ice", damage: 16, speedScale: 1.1, weightDrag: 0.95, gravityScale: 0.95, splashRadius: 0, ammo: 3, ricochet: false, slowTurns: 2, colorMain: "#67e8f9", colorTrail: "rgba(103,232,249,0.6)" },
  { id: "axe_toss", nameAr: "فأس رمي خفيف", type: "axe", damage: 14, speedScale: 1.12, weightDrag: 0.95, gravityScale: 0.9, splashRadius: 0, ammo: Infinity, ricochet: true, colorMain: "#b8b8c2", colorTrail: "rgba(184,184,194,0.5)" },
  { id: "shuriken_toss", nameAr: "شوريكن خفيف", type: "shuriken", damage: 14, speedScale: 1.18, weightDrag: 0.95, gravityScale: 0.88, splashRadius: 0, ammo: Infinity, ricochet: true, colorMain: "#c8ccd4", colorTrail: "rgba(200,204,212,0.55)" },
  { id: "spear_toss", nameAr: "رمح رمي خفيف", type: "spear", damage: 14, speedScale: 1.08, weightDrag: 0.92, gravityScale: 0.88, splashRadius: 0, ammo: Infinity, ricochet: false, colorMain: "#c9a678", colorTrail: "rgba(201,166,120,0.5)" },
  { id: "grenade_toss", nameAr: "قنبلة خفيفة", type: "grenade", damage: 12, speedScale: 1, weightDrag: 0.85, gravityScale: 0.85, splashRadius: 28, ammo: Infinity, ricochet: false, colorMain: "#6b7280", colorTrail: "rgba(107,114,128,0.5)" },
];

export function weaponById(id: string): WeaponDef {
  const weapon = WEAPONS.find((candidate) => candidate.id === id);
  if (!weapon) throw new Error(`unknown weapon ${id}`);
  return weapon;
}

export interface SkillDef {
  id: string;
  nameAr: string;
  descAr: string;
  cost: number;
  cooldown: number;
}

export const SKILLS: SkillDef[] = [
  { id: "shield", nameAr: "درع طاقة", descAr: "يقلل الضرر الوارد من الضربة القادمة 50%", cost: 2, cooldown: 3 },
  { id: "surge", nameAr: "مضاعفة الضرر", descAr: "يضاعف ضرر إطلاقتك القادمة ×1.75", cost: 2, cooldown: 3 },
];

export interface MapDef {
  id: string;
  nameAr: string;
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  windRange: number;
  roughness: number;
  soilColor: string;
  rockColor: string;
  mountainFar: string;
  mountainNear: string;
  cloudColor: string;
  decoColor: string;
  accentGlow: string;
  terrainSprite: string;
  effect: MapEffect;
  effectLabelAr: string;
  effectDescriptionAr: string;
}

export const MAPS: MapDef[] = [
  {
    id: "desert", nameAr: "الصحراء", skyTop: "#2b3a67", skyBottom: "#e8b96a", groundTop: "#d9a256", groundBottom: "#8a5a2b", windRange: 9, roughness: 0.35,
    soilColor: "#a9723a", rockColor: "#5c3c1f", mountainFar: "#3a4a7a", mountainNear: "#2c3760", cloudColor: "rgba(255,244,222,0.75)", decoColor: "#8a7239", accentGlow: "#ffe6ad", terrainSprite: "platform_desert",
    effect: "gust", effectLabelAr: "عاصفة رملية", effectDescriptionAr: "تهب الرياح بقوة أكبر وتتغير كل دور.",
  },
  {
    id: "mountains", nameAr: "الجبال", skyTop: "#1b2b4b", skyBottom: "#7ea8c9", groundTop: "#6b7d63", groundBottom: "#3c4a37", windRange: 4, roughness: 0.75,
    soilColor: "#4c5c46", rockColor: "#2b3427", mountainFar: "#2a3f5c", mountainNear: "#1c2d45", cloudColor: "rgba(232,240,248,0.8)", decoColor: "#3f5a3a", accentGlow: "#dff0ff", terrainSprite: "platform_grass",
    effect: "ridge", effectLabelAr: "حواف صخرية", effectDescriptionAr: "المنحدرات الحادة تجعل التمركز أكثر أهمية.",
  },
  {
    id: "volcanic", nameAr: "الجزيرة البركانية", skyTop: "#2a1220", skyBottom: "#c9553a", groundTop: "#4a3230", groundBottom: "#231313", windRange: 6, roughness: 0.55,
    soilColor: "#3a2420", rockColor: "#1c1210", mountainFar: "#5c2a2a", mountainNear: "#3a1a1c", cloudColor: "rgba(90,50,40,0.5)", decoColor: "#5c3a28", accentGlow: "#ff8a5c", terrainSprite: "platform_volcanic",
    effect: "ember", effectLabelAr: "جمر بركاني", effectDescriptionAr: "الأسلحة الحارقة تدوم دوراً إضافياً.",
  },
];

export interface LoadoutSlot {
  weaponId: string;
  ammo: number;
}

export interface WarriorArchetype {
  id: string;
  nameAr: string;
  accentColor: string;
  signatureWeapon: string;
  roleAr: string;
  loadout: LoadoutSlot[];
  maxHp: number;
  maxStamina: number;
  moveSpeedMultiplier: number;
  explosionResistance: number;
  signatureDamageBonus: number;
  perkAr: string;
}

export const ARCHETYPES: WarriorArchetype[] = [
  {
    id: "viking", nameAr: "المحارب الفايكنغ", accentColor: "#f4d488", signatureWeapon: "axe", roleAr: "قتال قريب-متوسط بضرر عالٍ", maxHp: 105, maxStamina: 100, moveSpeedMultiplier: 0.96, explosionResistance: 0, signatureDamageBonus: 0.08, perkAr: "ضرر إضافي بالفأس",
    loadout: [{ weaponId: "axe_toss", ammo: Infinity }, { weaponId: "axe", ammo: 3 }, { weaponId: "grenade", ammo: 2 }, { weaponId: "fire", ammo: 2 }],
  },
  {
    id: "archer", nameAr: "رامي الغابة", accentColor: "#facc15", signatureWeapon: "bow", roleAr: "مدى طويل وعناصر متنوعة", maxHp: 95, maxStamina: 100, moveSpeedMultiplier: 1, explosionResistance: 0, signatureDamageBonus: 0.08, perkAr: "ضرر إضافي بالقوس",
    loadout: [{ weaponId: "bow", ammo: Infinity }, { weaponId: "fire", ammo: 3 }, { weaponId: "ice", ammo: 3 }, { weaponId: "shuriken", ammo: 2 }],
  },
  {
    id: "ninja", nameAr: "النينجا", accentColor: "#67e8f9", signatureWeapon: "shuriken", roleAr: "سرعة وضربات عنصرية خفيفة", maxHp: 90, maxStamina: 125, moveSpeedMultiplier: 1.18, explosionResistance: 0, signatureDamageBonus: 0.08, perkAr: "حركة أسرع وشوريكن أقوى",
    loadout: [{ weaponId: "shuriken_toss", ammo: Infinity }, { weaponId: "ice", ammo: 3 }, { weaponId: "fire", ammo: 3 }, { weaponId: "grenade", ammo: 2 }],
  },
  {
    id: "knight", nameAr: "الفارس المدرّع", accentColor: "#e8edf5", signatureWeapon: "spear", roleAr: "دفاع صلب وضربات ثقيلة", maxHp: 115, maxStamina: 85, moveSpeedMultiplier: 0.88, explosionResistance: 0.14, signatureDamageBonus: 0.08, perkAr: "صمود أعلى ومقاومة للانفجارات",
    loadout: [{ weaponId: "spear_toss", ammo: Infinity }, { weaponId: "axe", ammo: 3 }, { weaponId: "grenade", ammo: 2 }, { weaponId: "ice", ammo: 2 }],
  },
  {
    id: "engineer", nameAr: "المهندس", accentColor: "#a3e635", signatureWeapon: "grenade", roleAr: "متفجرات وأضرار منطقة واسعة", maxHp: 100, maxStamina: 95, moveSpeedMultiplier: 0.94, explosionResistance: 0.08, signatureDamageBonus: 0.1, perkAr: "انفجار أوسع وأقوى بالقنابل",
    loadout: [{ weaponId: "grenade_toss", ammo: Infinity }, { weaponId: "rocket", ammo: 2 }, { weaponId: "fire", ammo: 2 }, { weaponId: "ice", ammo: 2 }],
  },
];

export function archetypeById(id: string): WarriorArchetype {
  return ARCHETYPES.find((archetype) => archetype.id === id) ?? ARCHETYPES[0];
}

export function loadoutSlot(archetype: WarriorArchetype, weaponId: string): LoadoutSlot | undefined {
  return archetype.loadout.find((slot) => slot.weaponId === weaponId);
}

export interface StatusEffects {
  burnTurns: number;
  burnDamagePerTurn: number;
  slowTurns: number;
  shieldActive: boolean;
}

export const MAX_STAMINA = 100;

export interface PlayerState {
  id: PlayerId;
  nameAr: string;
  x: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  archetype: string;
  attackPoseUntil: number;
  ammo: Record<string, number>;
  energy: number;
  stamina: number;
  maxStamina: number;
  isMoving: boolean;
  cooldowns: Record<string, number>;
  status: StatusEffects;
  damageMultiplierNext: number;
}

export interface MatchModifier {
  id: string;
  nameAr: string;
  descriptionAr: string;
  windMultiplier?: number;
  headshotMultiplier?: number;
  fragileTerrain?: boolean;
  limitedSpecialAmmo?: boolean;
}

export function challengeForDate(date = new Date()): MatchModifier {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const seed = [...key].reduce((value, char) => value + char.charCodeAt(0), 0);
  const choices: MatchModifier[] = [
    { id: "gust-day", nameAr: "رياح اليوم", descriptionAr: "رياح أقوى بنسبة 35%.", windMultiplier: 1.35 },
    { id: "precision-day", nameAr: "عين الصقر", descriptionAr: "إصابات الرأس تمنح ضرراً أكبر.", headshotMultiplier: 1.35 },
    { id: "fragile-day", nameAr: "أرض هشة", descriptionAr: "تترك الانفجارات حُفراً أعمق.", fragileTerrain: true },
    { id: "scarce-day", nameAr: "ذخيرة شحيحة", descriptionAr: "يُخصم سلاح خاص واحد من العتاد.", limitedSpecialAmmo: true },
  ];
  return choices[seed % choices.length];
}

export function freshAmmo(archetypeId: string, modifier?: MatchModifier): Record<string, number> {
  const archetype = archetypeById(archetypeId);
  const ammo: Record<string, number> = {};
  for (const slot of archetype.loadout) {
    const isSpecial = Number.isFinite(slot.ammo);
    ammo[slot.weaponId] = modifier?.limitedSpecialAmmo && isSpecial ? Math.max(1, slot.ammo - 1) : slot.ammo;
  }
  return ammo;
}

export function freshCooldowns(): Record<string, number> {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, 0]));
}

export function makePlayer(id: PlayerId, nameAr: string, x: number, facing: 1 | -1, archetypeId: string, modifier?: MatchModifier): PlayerState {
  const archetype = archetypeById(archetypeId);
  return {
    id,
    nameAr,
    x,
    hp: archetype.maxHp,
    maxHp: archetype.maxHp,
    facing,
    archetype: archetype.id,
    attackPoseUntil: 0,
    ammo: freshAmmo(archetype.id, modifier),
    energy: 2,
    stamina: archetype.maxStamina,
    maxStamina: archetype.maxStamina,
    isMoving: false,
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
