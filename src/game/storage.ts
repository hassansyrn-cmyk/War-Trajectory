import { Difficulty } from "./entities";

const KEY = "war-trajectory-save-v2";
const LEGACY_KEY = "war-trajectory-save-v1";

export interface SaveData {
  wins: number;
  losses: number;
  lastMapId: string;
  lastDifficulty: Difficulty;
  lastArchetypeId: string;
  muted: boolean;
  xp: number;
  level: number;
  totalMatches: number;
  archetypeXp: Record<string, number>;
  achievements: string[];
  dailyChallengeKey: string;
  dailyChallengeCompleted: boolean;
}

const DEFAULT_SAVE: SaveData = {
  wins: 0,
  losses: 0,
  lastMapId: "desert",
  lastDifficulty: "normal",
  lastArchetypeId: "viking",
  muted: false,
  xp: 0,
  level: 1,
  totalMatches: 0,
  archetypeXp: {},
  achievements: [],
  dailyChallengeKey: "",
  dailyChallengeCompleted: false,
};

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1);
}

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function normalize(data: Partial<SaveData>): SaveData {
  const currentDay = dayKey();
  const next: SaveData = {
    ...DEFAULT_SAVE,
    ...data,
    archetypeXp: data.archetypeXp ?? {},
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
  };
  next.level = levelForXp(next.xp);
  if (next.dailyChallengeKey !== currentDay) {
    next.dailyChallengeKey = currentDay;
    next.dailyChallengeCompleted = false;
  }
  return next;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return normalize({});
    return normalize(JSON.parse(raw));
  } catch {
    return normalize({});
  }
}

export function saveSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalize(data)));
  } catch {
    // storage unavailable (private mode, etc.) — fail silently
  }
}

export interface MatchReward {
  won: boolean;
  archetypeId: string;
  headshots?: number;
  dailyChallenge?: boolean;
}

export function recordResult(reward: MatchReward): SaveData {
  const data = loadSave();
  data.totalMatches += 1;
  if (reward.won) data.wins += 1;
  else data.losses += 1;

  const earnedXp = 24 + (reward.won ? 36 : 0) + Math.min(3, reward.headshots ?? 0) * 8 + (reward.dailyChallenge && !data.dailyChallengeCompleted ? 30 : 0);
  data.xp += earnedXp;
  data.archetypeXp[reward.archetypeId] = (data.archetypeXp[reward.archetypeId] ?? 0) + earnedXp;

  const achievements = new Set(data.achievements);
  if (data.totalMatches >= 1) achievements.add("first-match");
  if (data.wins >= 5) achievements.add("five-wins");
  if ((reward.headshots ?? 0) >= 2) achievements.add("double-headshot");
  if (Object.keys(data.archetypeXp).length >= 5) achievements.add("all-warriors");
  if (reward.dailyChallenge) data.dailyChallengeCompleted = true;

  data.achievements = [...achievements];
  data.level = levelForXp(data.xp);
  saveSave(data);
  return data;
}

export const ACHIEVEMENTS: Record<string, { nameAr: string; descriptionAr: string }> = {
  "first-match": { nameAr: "أول معركة", descriptionAr: "أكمل أول مباراة." },
  "five-wins": { nameAr: "قائد الساحة", descriptionAr: "حقق خمس انتصارات." },
  "double-headshot": { nameAr: "دقة قاتلة", descriptionAr: "حقق إصابتين بالرأس في مباراة." },
  "all-warriors": { nameAr: "قائد الفريق", descriptionAr: "استخدم المحاربين الخمسة." },
};
