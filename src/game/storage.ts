import { Difficulty } from "./entities";

const KEY = "war-trajectory-save-v1";

export interface SaveData {
  wins: number;
  losses: number;
  lastMapId: string;
  lastDifficulty: Difficulty;
  lastArchetypeId: string;
  muted: boolean;
}

const DEFAULT_SAVE: SaveData = {
  wins: 0,
  losses: 0,
  lastMapId: "desert",
  lastDifficulty: "normal",
  lastArchetypeId: "viking",
  muted: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function saveSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, etc.) — fail silently
  }
}

export function recordResult(won: boolean) {
  const data = loadSave();
  if (won) data.wins += 1;
  else data.losses += 1;
  saveSave(data);
  return data;
}
