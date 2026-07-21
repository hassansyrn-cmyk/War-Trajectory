// Loads the game sprite manifest and all referenced images once.
//
// This version supports:
// 1. The expected manifest structure used by the Jules branch.
// 2. The older manifest structure containing warriorSpriteSheets and paths.
// 3. Automatic fallback paths if the manifest is missing or invalid.
// 4. Separate PNG warrior images instead of requiring sprite sheets.
// 5. Relative asset paths compatible with Vite base: "./" and Capacitor.

export interface AssetManifest {
  warriorFrameSize: number;
  warriorFrameOrder: string[];
  warriors: Record<string, string>;
  weapons: Record<string, string>;
  terrain: Record<string, string>;
}

interface LegacyAssetManifest {
  warriorSpriteSheets?: {
    frameWidth?: number;
    frameHeight?: number;
    sheetWidth?: number;
    sheetHeight?: number;
    frames?: string[];
    layout?: string;
  };
  paths?: {
    warriors?: string;
    weapons?: string;
    terrain?: string;
  };
}

const ASSET_ROOT = "assets/";
const MANIFEST_PATH = `${ASSET_ROOT}sprites/manifest.json`;

const DEFAULT_MANIFEST: AssetManifest = {
  warriorFrameSize: 256,
  warriorFrameOrder: ["idle"],
  warriors: {
    viking: "sprites/warriors/viking.png",
    archer: "sprites/warriors/archer.png",
    ninja: "sprites/warriors/ninja.png",
    knight: "sprites/warriors/knight.png",
    engineer: "sprites/warriors/engineer.png",
  },
  weapons: {
    arrow: "sprites/weapons/arrow.png",
    axe: "sprites/weapons/axe.png",
    fire: "sprites/weapons/fire.png",
    grenade: "sprites/weapons/grenade.png",
    ice: "sprites/weapons/ice.png",
    rocket: "sprites/weapons/rocket.png",
    shuriken: "sprites/weapons/shuriken.png",
    spear: "sprites/weapons/spear.png",
  },
  terrain: {
    platform_desert: "sprites/terrain/platform_desert.png",
    platform_grass: "sprites/terrain/platform_grass.png",
    platform_volcanic: "sprites/terrain/platform_volcanic.png",
  },
};

let manifest: AssetManifest | null = null;

const warriorImages = new Map<string, HTMLImageElement>();
const weaponImages = new Map<string, HTMLImageElement>();
const terrainImages = new Map<string, HTMLImageElement>();

const failed = new Set<string>();

let loadPromise: Promise<AssetManifest> | null = null;

function copyDefaultManifest(): AssetManifest {
  return {
    warriorFrameSize: DEFAULT_MANIFEST.warriorFrameSize,
    warriorFrameOrder: [...DEFAULT_MANIFEST.warriorFrameOrder],
    warriors: { ...DEFAULT_MANIFEST.warriors },
    weapons: { ...DEFAULT_MANIFEST.weapons },
    terrain: { ...DEFAULT_MANIFEST.terrain },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false;

  return Object.values(value).every(
    (entry) => typeof entry === "string"
  );
}

function normalizeManifest(raw: unknown): AssetManifest {
  const fallback = copyDefaultManifest();

  if (!isRecord(raw)) {
    return fallback;
  }

  const possibleModernManifest = raw as {
    warriorFrameSize?: unknown;
    warriorFrameOrder?: unknown;
    warriors?: unknown;
    weapons?: unknown;
    terrain?: unknown;
  };

  const hasModernGroups =
    isStringRecord(possibleModernManifest.warriors) &&
    isStringRecord(possibleModernManifest.weapons) &&
    isStringRecord(possibleModernManifest.terrain);

  if (hasModernGroups) {
    return {
      warriorFrameSize:
        typeof possibleModernManifest.warriorFrameSize === "number"
          ? possibleModernManifest.warriorFrameSize
          : fallback.warriorFrameSize,

      warriorFrameOrder:
        Array.isArray(possibleModernManifest.warriorFrameOrder) &&
        possibleModernManifest.warriorFrameOrder.every(
          (entry) => typeof entry === "string"
        )
          ? [...possibleModernManifest.warriorFrameOrder]
          : ["idle"],

      warriors: {
        ...fallback.warriors,
        ...possibleModernManifest.warriors,
      },

      weapons: {
        ...fallback.weapons,
        ...possibleModernManifest.weapons,
      },

      terrain: {
        ...fallback.terrain,
        ...possibleModernManifest.terrain,
      },
    };
  }

  const legacyManifest = raw as LegacyAssetManifest;

  if (
    legacyManifest.warriorSpriteSheets ||
    legacyManifest.paths
  ) {
    return {
      ...fallback,
      warriorFrameSize:
        legacyManifest.warriorSpriteSheets?.frameWidth ??
        fallback.warriorFrameSize,

      // The current warrior files are separate PNG images.
      // Rendering therefore uses the complete image as one idle frame.
      warriorFrameOrder: ["idle"],
    };
  }

  return fallback;
}

function normalizeAssetPath(relativePath: string): string {
  let path = relativePath.trim();

  path = path.replace(/\\/g, "/");

  while (path.startsWith("./")) {
    path = path.slice(2);
  }

  while (path.startsWith("/")) {
    path = path.slice(1);
  }

  if (path.startsWith("public/")) {
    path = path.slice("public/".length);
  }

  if (path.startsWith(ASSET_ROOT)) {
    return path;
  }

  return ASSET_ROOT + path;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img);
      } else {
        reject(new Error(`Loaded image has invalid dimensions: ${src}`));
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.decoding = "async";
    img.src = src;
  });
}

async function loadGroup(
  groupName: "warriors" | "weapons" | "terrain",
  group: Record<string, string>,
  target: Map<string, HTMLImageElement>
): Promise<void> {
  await Promise.all(
    Object.entries(group).map(async ([key, relativePath]) => {
      const failureKey = `${groupName}:${key}`;
      const src = normalizeAssetPath(relativePath);

      try {
        const img = await loadImage(src);
        target.set(key, img);
        failed.delete(failureKey);
      } catch (error) {
        target.delete(key);
        failed.add(failureKey);

        console.warn(
          `[Assets] Failed to load ${groupName} asset "${key}" from "${src}".`,
          error
        );
      }
    })
  );
}

async function fetchManifest(): Promise<AssetManifest> {
  try {
    const response = await fetch(MANIFEST_PATH, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(
        `Manifest request failed with status ${response.status}`
      );
    }

    const rawManifest: unknown = await response.json();
    return normalizeManifest(rawManifest);
  } catch (error) {
    console.warn(
      `[Assets] Could not use "${MANIFEST_PATH}". Default asset paths will be used.`,
      error
    );

    return copyDefaultManifest();
  }
}

export function loadAssets(): Promise<AssetManifest> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    manifest = await fetchManifest();

    warriorImages.clear();
    weaponImages.clear();
    terrainImages.clear();
    failed.clear();

    await Promise.all([
      loadGroup(
        "warriors",
        manifest.warriors,
        warriorImages
      ),
      loadGroup(
        "weapons",
        manifest.weapons,
        weaponImages
      ),
      loadGroup(
        "terrain",
        manifest.terrain,
        terrainImages
      ),
    ]);

    console.log(
      `[Assets] Loading finished. Warriors: ${warriorImages.size}, weapons: ${weaponImages.size}, terrain: ${terrainImages.size}.`
    );

    return manifest;
  })();

  return loadPromise;
}

export function getManifest(): AssetManifest | null {
  return manifest;
}

export function getWarriorSheet(
  archetypeId: string
): HTMLImageElement | undefined {
  return warriorImages.get(archetypeId);
}

export function getWeaponIcon(
  weaponType: string
): HTMLImageElement | undefined {
  return weaponImages.get(weaponType);
}

export function getTerrainSprite(
  spriteKey: string
): HTMLImageElement | undefined {
  return terrainImages.get(spriteKey);
}

export function assetFailed(key: string): boolean {
  return (
    failed.has(key) ||
    failed.has(`warriors:${key}`) ||
    failed.has(`weapons:${key}`) ||
    failed.has(`terrain:${key}`)
  );
}

export function areAssetsLoaded(): boolean {
  return manifest !== null;
}

export function resetAssets(): void {
  manifest = null;
  loadPromise = null;

  warriorImages.clear();
  weaponImages.clear();
  terrainImages.clear();
  failed.clear();
}
