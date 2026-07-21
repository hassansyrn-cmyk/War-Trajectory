// Loads the sprite manifest and every referenced image once, up front, so
// gameplay code never awaits a network request mid-render. All lookups are
// synchronous after loadAssets() resolves.

export interface AssetManifest {
  warriorFrameSize: number;
  warriorFrameOrder: string[];
  warriors: Record<string, string>;
  weapons: Record<string, string>;
  terrain: Record<string, string>;
}

const ASSET_ROOT = "assets/"; // relative to index.html — matches vite.config's base: "./"
const MANIFEST_PATH = `${ASSET_ROOT}sprites/manifest.json`;

let manifest: AssetManifest | null = null;
const images = new Map<string, HTMLImageElement>();
const failed = new Set<string>();
let loadPromise: Promise<AssetManifest> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadGroup(group: Record<string, string>) {
  await Promise.all(
    Object.entries(group).map(async ([key, relPath]) => {
      try {
        const img = await loadImage(ASSET_ROOT + relPath);
        images.set(key, img);
      } catch {
        // Missing/renamed asset — the caller falls back to procedural
        // drawing for this key rather than crashing the whole game.
        failed.add(key);
      }
    })
  );
}

export function loadAssets(): Promise<AssetManifest> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const res = await fetch(MANIFEST_PATH);
    if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
    const parsed: AssetManifest = await res.json();
    manifest = parsed;
    await Promise.all([loadGroup(parsed.warriors), loadGroup(parsed.weapons), loadGroup(parsed.terrain)]);
    return parsed;
  })();
  return loadPromise;
}

export function getManifest(): AssetManifest | null {
  return manifest;
}

export function getWarriorSheet(archetypeId: string): HTMLImageElement | undefined {
  return images.get(archetypeId);
}

export function getWeaponIcon(weaponType: string): HTMLImageElement | undefined {
  return images.get(weaponType);
}

export function getTerrainSprite(spriteKey: string): HTMLImageElement | undefined {
  return images.get(spriteKey);
}

export function assetFailed(key: string): boolean {
  return failed.has(key);
}
