// Centralized asset loader for War Trajectory.
//
// Supports:
// 1. Modern sprite manifest.
// 2. Legacy sprite manifest.
// 3. Default sprite paths.
// 4. Existing warrior sprites as automatic fallback.
// 5. Existing detailed character rigs for compatibility.
// 6. Simplified Viking rig optimized for mobile animation.
// 7. Vite and Capacitor relative asset paths.

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

export interface CharacterRigPartDefinition {
  name: string;
  file: string;
  size: [number, number];
  source_box: [number, number, number, number];
}

export type CharacterRigManifest = Record<
  string,
  CharacterRigPartDefinition[]
>;

export type CharacterRigImages = Record<
  string,
  HTMLImageElement
>;

export type SimpleCharacterPartName =
  | "body"
  | "weapon_arm"
  | "cape"
  | "axe";

export type SimpleCharacterImages = Partial<
  Record<SimpleCharacterPartName, HTMLImageElement>
>;

const ASSET_ROOT = "assets/";

const SPRITE_MANIFEST_PATH =
  `${ASSET_ROOT}sprites/manifest.json`;

const CHARACTER_RIG_ROOT =
  `${ASSET_ROOT}characters/`;

const CHARACTER_RIG_MANIFEST_PATH =
  `${CHARACTER_RIG_ROOT}rig_manifest.json`;

const SIMPLE_VIKING_ID = "viking_simple";

const SIMPLE_VIKING_PATHS: Record<
  SimpleCharacterPartName,
  string
> = {
  body:
    "characters/viking_simple/body.png",

  weapon_arm:
    "characters/viking_simple/weapon_arm.png",

  cape:
    "characters/viking_simple/cape.png",

  axe:
    "characters/viking_simple/axe.png",
};

// The detailed Viking rig remains available temporarily
// so the current renderer continues compiling until render.ts
// is replaced with the simplified renderer.
const PRELOAD_CHARACTER_RIGS = new Set<string>([
  "viking",
]);

const DEFAULT_MANIFEST: AssetManifest = {
  warriorFrameSize: 256,

  warriorFrameOrder: [
    "idle",
  ],

  warriors: {
    viking:
      "sprites/warriors/viking.png",

    archer:
      "sprites/warriors/archer.png",

    ninja:
      "sprites/warriors/ninja.png",

    knight:
      "sprites/warriors/knight.png",

    engineer:
      "sprites/warriors/engineer.png",
  },

  weapons: {
    arrow:
      "sprites/weapons/arrow.png",

    axe:
      "sprites/weapons/axe.png",

    fire:
      "sprites/weapons/fire.png",

    grenade:
      "sprites/weapons/grenade.png",

    ice:
      "sprites/weapons/ice.png",

    rocket:
      "sprites/weapons/rocket.png",

    shuriken:
      "sprites/weapons/shuriken.png",

    spear:
      "sprites/weapons/spear.png",
  },

  terrain: {
    platform_desert:
      "sprites/terrain/platform_desert.png",

    platform_grass:
      "sprites/terrain/platform_grass.png",

    platform_volcanic:
      "sprites/terrain/platform_volcanic.png",
  },
};

let manifest: AssetManifest | null = null;

let characterRigManifest:
  CharacterRigManifest | null = null;

const warriorImages =
  new Map<string, HTMLImageElement>();

const weaponImages =
  new Map<string, HTMLImageElement>();

const terrainImages =
  new Map<string, HTMLImageElement>();

const characterRigImages =
  new Map<
    string,
    Map<string, HTMLImageElement>
  >();

const characterRigDefinitions =
  new Map<
    string,
    Map<
      string,
      CharacterRigPartDefinition
    >
  >();

const characterRigPromises =
  new Map<
    string,
    Promise<boolean>
  >();

const simpleCharacterImages =
  new Map<
    string,
    Map<
      SimpleCharacterPartName,
      HTMLImageElement
    >
  >();

const failed =
  new Set<string>();

let loadPromise:
  Promise<AssetManifest> | null = null;

function copyDefaultManifest():
  AssetManifest {
  return {
    warriorFrameSize:
      DEFAULT_MANIFEST.warriorFrameSize,

    warriorFrameOrder: [
      ...DEFAULT_MANIFEST.warriorFrameOrder,
    ],

    warriors: {
      ...DEFAULT_MANIFEST.warriors,
    },

    weapons: {
      ...DEFAULT_MANIFEST.weapons,
    },

    terrain: {
      ...DEFAULT_MANIFEST.terrain,
    },
  };
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toStringRecord(
  value: unknown
): Record<string, string> | null {
  if (!isRecord(value)) {
    return null;
  }

  const result:
    Record<string, string> = {};

  for (
    const [key, entry] of
    Object.entries(value)
  ) {
    if (typeof entry !== "string") {
      return null;
    }

    result[key] = entry;
  }

  return result;
}

function toStringArray(
  value: unknown
): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (
    !value.every(
      (entry) =>
        typeof entry === "string"
    )
  ) {
    return null;
  }

  return [...value];
}

function isFinitePositiveNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function isNumberTuple(
  value: unknown,
  length: number
): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(
      (entry) =>
        typeof entry === "number" &&
        Number.isFinite(entry)
    )
  );
}

function normalizeManifest(
  raw: unknown
): AssetManifest {
  const fallback =
    copyDefaultManifest();

  if (!isRecord(raw)) {
    return fallback;
  }

  const modernWarriors =
    toStringRecord(raw.warriors);

  const modernWeapons =
    toStringRecord(raw.weapons);

  const modernTerrain =
    toStringRecord(raw.terrain);

  if (
    modernWarriors !== null &&
    modernWeapons !== null &&
    modernTerrain !== null
  ) {
    const modernFrameOrder =
      toStringArray(
        raw.warriorFrameOrder
      );

    return {
      warriorFrameSize:
        isFinitePositiveNumber(
          raw.warriorFrameSize
        )
          ? raw.warriorFrameSize
          : fallback.warriorFrameSize,

      warriorFrameOrder:
        modernFrameOrder !== null &&
        modernFrameOrder.length > 0
          ? modernFrameOrder
          : ["idle"],

      warriors: {
        ...fallback.warriors,
        ...modernWarriors,
      },

      weapons: {
        ...fallback.weapons,
        ...modernWeapons,
      },

      terrain: {
        ...fallback.terrain,
        ...modernTerrain,
      },
    };
  }

  const legacyManifest =
    raw as LegacyAssetManifest;

  const legacyFrameWidth =
    legacyManifest
      .warriorSpriteSheets
      ?.frameWidth;

  return {
    warriorFrameSize:
      isFinitePositiveNumber(
        legacyFrameWidth
      )
        ? legacyFrameWidth
        : fallback.warriorFrameSize,

    warriorFrameOrder: [
      "idle",
    ],

    warriors: {
      ...fallback.warriors,
    },

    weapons: {
      ...fallback.weapons,
    },

    terrain: {
      ...fallback.terrain,
    },
  };
}

function normalizeCharacterRigManifest(
  raw: unknown
): CharacterRigManifest {
  if (!isRecord(raw)) {
    return {};
  }

  const result:
    CharacterRigManifest = {};

  for (
    const [characterId, rawParts] of
    Object.entries(raw)
  ) {
    if (!Array.isArray(rawParts)) {
      continue;
    }

    const parts:
      CharacterRigPartDefinition[] = [];

    for (const rawPart of rawParts) {
      if (!isRecord(rawPart)) {
        continue;
      }

      if (
        typeof rawPart.name !==
          "string" ||
        rawPart.name.trim().length === 0
      ) {
        continue;
      }

      if (
        typeof rawPart.file !==
          "string" ||
        rawPart.file.trim().length === 0
      ) {
        continue;
      }

      if (
        !isNumberTuple(
          rawPart.size,
          2
        ) ||
        !isNumberTuple(
          rawPart.source_box,
          4
        )
      ) {
        continue;
      }

      const width =
        rawPart.size[0];

      const height =
        rawPart.size[1];

      if (
        width <= 0 ||
        height <= 0
      ) {
        continue;
      }

      parts.push({
        name:
          rawPart.name.trim(),

        file:
          rawPart.file.trim(),

        size: [
          rawPart.size[0],
          rawPart.size[1],
        ],

        source_box: [
          rawPart.source_box[0],
          rawPart.source_box[1],
          rawPart.source_box[2],
          rawPart.source_box[3],
        ],
      });
    }

    if (parts.length > 0) {
      result[characterId] =
        parts;
    }
  }

  return result;
}

function normalizeAssetPath(
  relativePath: string
): string {
  let path =
    relativePath.trim();

  path =
    path.replace(/\\/g, "/");

  while (
    path.startsWith("./")
  ) {
    path =
      path.slice(2);
  }

  while (
    path.startsWith("/")
  ) {
    path =
      path.slice(1);
  }

  if (
    path.startsWith("public/")
  ) {
    path =
      path.slice(
        "public/".length
      );
  }

  if (
    path.startsWith(ASSET_ROOT)
  ) {
    return path;
  }

  return ASSET_ROOT + path;
}

function normalizeCharacterRigPath(
  relativePath: string
): string {
  let path =
    relativePath.trim();

  path =
    path.replace(/\\/g, "/");

  while (
    path.startsWith("./")
  ) {
    path =
      path.slice(2);
  }

  while (
    path.startsWith("/")
  ) {
    path =
      path.slice(1);
  }

  if (
    path.startsWith("public/")
  ) {
    path =
      path.slice(
        "public/".length
      );
  }

  if (
    path.startsWith(
      CHARACTER_RIG_ROOT
    )
  ) {
    return path;
  }

  if (
    path.startsWith(ASSET_ROOT)
  ) {
    return path;
  }

  if (
    path.startsWith(
      "characters/"
    )
  ) {
    return ASSET_ROOT + path;
  }

  return (
    CHARACTER_RIG_ROOT +
    path
  );
}

function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        if (
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        ) {
          resolve(image);
        } else {
          reject(
            new Error(
              `Loaded image has invalid dimensions: ${src}`
            )
          );
        }
      };

      image.onerror = () => {
        reject(
          new Error(
            `Failed to load image: ${src}`
          )
        );
      };

      image.decoding = "async";
      image.src = src;
    }
  );
}

async function loadGroup(
  groupName:
    | "warriors"
    | "weapons"
    | "terrain",

  group:
    Record<string, string>,

  target:
    Map<string, HTMLImageElement>
): Promise<void> {
  await Promise.all(
    Object.entries(group).map(
      async (
        [key, relativePath]
      ) => {
        const failureKey =
          `${groupName}:${key}`;

        const source =
          normalizeAssetPath(
            relativePath
          );

        try {
          const image =
            await loadImage(source);

          target.set(
            key,
            image
          );

          failed.delete(
            failureKey
          );
        } catch (error) {
          target.delete(key);

          failed.add(
            failureKey
          );

          console.warn(
            `[Assets] Failed to load ${groupName} asset "${key}" from "${source}".`,
            error
          );
        }
      }
    )
  );
}

async function fetchSpriteManifest():
  Promise<AssetManifest> {
  try {
    const response =
      await fetch(
        SPRITE_MANIFEST_PATH,
        {
          cache: "no-cache",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Manifest request failed with status ${response.status}`
      );
    }

    const rawManifest: unknown =
      await response.json();

    return normalizeManifest(
      rawManifest
    );
  } catch (error) {
    console.warn(
      `[Assets] Could not use "${SPRITE_MANIFEST_PATH}". Default asset paths will be used.`,
      error
    );

    return copyDefaultManifest();
  }
}

async function fetchCharacterRigManifest():
  Promise<CharacterRigManifest> {
  try {
    const response =
      await fetch(
        CHARACTER_RIG_MANIFEST_PATH,
        {
          cache: "no-cache",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Character rig manifest request failed with status ${response.status}`
      );
    }

    const rawManifest: unknown =
      await response.json();

    return normalizeCharacterRigManifest(
      rawManifest
    );
  } catch (error) {
    console.warn(
      `[Assets] Could not use "${CHARACTER_RIG_MANIFEST_PATH}". Detailed character rigs will be disabled.`,
      error
    );

    return {};
  }
}

function registerRigDefinitions(
  rigManifest:
    CharacterRigManifest
): void {
  characterRigDefinitions.clear();

  for (
    const [characterId, parts] of
    Object.entries(rigManifest)
  ) {
    const definitions =
      new Map<
        string,
        CharacterRigPartDefinition
      >();

    for (const part of parts) {
      definitions.set(
        part.name,
        part
      );
    }

    characterRigDefinitions.set(
      characterId,
      definitions
    );
  }
}

export async function loadCharacterRig(
  characterId: string
): Promise<boolean> {
  if (!characterRigManifest) {
    return false;
  }

  const existingPromise =
    characterRigPromises.get(
      characterId
    );

  if (existingPromise) {
    return existingPromise;
  }

  const definitions =
    characterRigManifest[
      characterId
    ];

  if (
    !definitions ||
    definitions.length === 0
  ) {
    failed.add(
      `character-rig:${characterId}`
    );

    return false;
  }

  const promise = (async () => {
    const images =
      new Map<
        string,
        HTMLImageElement
      >();

    let allPartsLoaded = true;

    await Promise.all(
      definitions.map(
        async (part) => {
          const failureKey =
            `character-rig:${characterId}:${part.name}`;

          const source =
            normalizeCharacterRigPath(
              part.file
            );

          try {
            const image =
              await loadImage(
                source
              );

            images.set(
              part.name,
              image
            );

            failed.delete(
              failureKey
            );
          } catch (error) {
            allPartsLoaded = false;

            failed.add(
              failureKey
            );

            console.warn(
              `[Assets] Failed to load detailed rig part "${characterId}/${part.name}" from "${source}".`,
              error
            );
          }
        }
      )
    );

    if (allPartsLoaded) {
      characterRigImages.set(
        characterId,
        images
      );

      failed.delete(
        `character-rig:${characterId}`
      );

      return true;
    }

    characterRigImages.delete(
      characterId
    );

    failed.add(
      `character-rig:${characterId}`
    );

    return false;
  })();

  characterRigPromises.set(
    characterId,
    promise
  );

  return promise;
}

async function preloadEnabledCharacterRigs():
  Promise<void> {
  if (!characterRigManifest) {
    return;
  }

  await Promise.all(
    [
      ...PRELOAD_CHARACTER_RIGS,
    ].map(
      async (characterId) => {
        await loadCharacterRig(
          characterId
        );
      }
    )
  );
}

async function loadSimpleViking():
  Promise<boolean> {
  const images =
    new Map<
      SimpleCharacterPartName,
      HTMLImageElement
    >();

  let allPartsLoaded = true;

  await Promise.all(
    (
      Object.entries(
        SIMPLE_VIKING_PATHS
      ) as [
        SimpleCharacterPartName,
        string,
      ][]
    ).map(
      async (
        [partName, relativePath]
      ) => {
        const failureKey =
          `simple-character:${SIMPLE_VIKING_ID}:${partName}`;

        const source =
          normalizeAssetPath(
            relativePath
          );

        try {
          const image =
            await loadImage(source);

          images.set(
            partName,
            image
          );

          failed.delete(
            failureKey
          );
        } catch (error) {
          allPartsLoaded = false;

          failed.add(
            failureKey
          );

          console.warn(
            `[Assets] Failed to load simplified Viking part "${partName}" from "${source}".`,
            error
          );
        }
      }
    )
  );

  if (allPartsLoaded) {
    simpleCharacterImages.set(
      SIMPLE_VIKING_ID,
      images
    );

    failed.delete(
      `simple-character:${SIMPLE_VIKING_ID}`
    );

    console.log(
      `[Assets] Simplified Viking loaded with ${images.size} parts.`
    );

    return true;
  }

  simpleCharacterImages.delete(
    SIMPLE_VIKING_ID
  );

  failed.add(
    `simple-character:${SIMPLE_VIKING_ID}`
  );

  console.warn(
    "[Assets] Simplified Viking is incomplete. The existing warrior sprite will be used as fallback."
  );

  return false;
}

export function loadAssets():
  Promise<AssetManifest> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const [
      loadedSpriteManifest,
      loadedRigManifest,
    ] = await Promise.all([
      fetchSpriteManifest(),
      fetchCharacterRigManifest(),
    ]);

    manifest =
      loadedSpriteManifest;

    characterRigManifest =
      loadedRigManifest;

    warriorImages.clear();
    weaponImages.clear();
    terrainImages.clear();

    characterRigImages.clear();
    characterRigDefinitions.clear();
    characterRigPromises.clear();

    simpleCharacterImages.clear();
    failed.clear();

    registerRigDefinitions(
      characterRigManifest
    );

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

      preloadEnabledCharacterRigs(),

      loadSimpleViking(),
    ]);

    console.log(
      `[Assets] Loading finished. Warriors: ${warriorImages.size}, weapons: ${weaponImages.size}, terrain: ${terrainImages.size}, detailed rigs: ${characterRigImages.size}, simple characters: ${simpleCharacterImages.size}.`
    );

    return manifest;
  })();

  return loadPromise;
}

export function getManifest():
  AssetManifest | null {
  return manifest;
}

export function getCharacterRigManifest():
  CharacterRigManifest | null {
  return characterRigManifest;
}

export function getWarriorSheet(
  archetypeId: string
): HTMLImageElement | undefined {
  return warriorImages.get(
    archetypeId
  );
}

export function getWeaponIcon(
  weaponType: string
): HTMLImageElement | undefined {
  return weaponImages.get(
    weaponType
  );
}

export function getTerrainSprite(
  spriteKey: string
): HTMLImageElement | undefined {
  return terrainImages.get(
    spriteKey
  );
}

export function getSimpleVikingPart(
  partName:
    SimpleCharacterPartName
): HTMLImageElement | undefined {
  return simpleCharacterImages
    .get(SIMPLE_VIKING_ID)
    ?.get(partName);
}

export function getSimpleCharacterPart(
  characterId: string,
  partName:
    SimpleCharacterPartName
): HTMLImageElement | undefined {
  return simpleCharacterImages
    .get(characterId)
    ?.get(partName);
}

export function getSimpleVikingParts():
  ReadonlyMap<
    SimpleCharacterPartName,
    HTMLImageElement
  > | undefined {
  return simpleCharacterImages.get(
    SIMPLE_VIKING_ID
  );
}

export function isSimpleVikingReady():
  boolean {
  const images =
    simpleCharacterImages.get(
      SIMPLE_VIKING_ID
    );

  if (!images) {
    return false;
  }

  const requiredParts:
    SimpleCharacterPartName[] = [
      "body",
      "weapon_arm",
      "cape",
      "axe",
    ];

  for (
    const partName of
    requiredParts
  ) {
    const image =
      images.get(partName);

    if (
      !image ||
      !image.complete ||
      image.naturalWidth <= 0 ||
      image.naturalHeight <= 0
    ) {
      return false;
    }
  }

  return true;
}

export function simpleVikingFailed():
  boolean {
  return failed.has(
    `simple-character:${SIMPLE_VIKING_ID}`
  );
}

// Compatibility functions for the previous detailed-rig renderer.
// These can be removed after render.ts is converted completely
// to the simplified animation system.

export function getCharacterRigPart(
  characterId: string,
  partName: string
): HTMLImageElement | undefined {
  return characterRigImages
    .get(characterId)
    ?.get(partName);
}

export function getCharacterRigParts(
  characterId: string
): ReadonlyMap<
  string,
  HTMLImageElement
> | undefined {
  return characterRigImages.get(
    characterId
  );
}

export function getCharacterRigPartDefinition(
  characterId: string,
  partName: string
): CharacterRigPartDefinition | undefined {
  return characterRigDefinitions
    .get(characterId)
    ?.get(partName);
}

export function getCharacterRigDefinitions(
  characterId: string
): ReadonlyMap<
  string,
  CharacterRigPartDefinition
> | undefined {
  return characterRigDefinitions.get(
    characterId
  );
}

export function getCharacterRigPartNames(
  characterId: string
): string[] {
  const definitions =
    characterRigDefinitions.get(
      characterId
    );

  if (!definitions) {
    return [];
  }

  return [
    ...definitions.keys(),
  ];
}

export function isCharacterRigAvailable(
  characterId: string
): boolean {
  const definitions =
    characterRigDefinitions.get(
      characterId
    );

  return Boolean(
    definitions &&
    definitions.size > 0
  );
}

export function isCharacterRigReady(
  characterId: string
): boolean {
  const definitions =
    characterRigDefinitions.get(
      characterId
    );

  const images =
    characterRigImages.get(
      characterId
    );

  if (
    !definitions ||
    definitions.size === 0 ||
    !images
  ) {
    return false;
  }

  if (
    images.size !==
    definitions.size
  ) {
    return false;
  }

  for (
    const partName of
    definitions.keys()
  ) {
    const image =
      images.get(partName);

    if (
      !image ||
      !image.complete ||
      image.naturalWidth <= 0 ||
      image.naturalHeight <= 0
    ) {
      return false;
    }
  }

  return true;
}

export function characterRigFailed(
  characterId: string
): boolean {
  return failed.has(
    `character-rig:${characterId}`
  );
}

export function assetFailed(
  key: string
): boolean {
  if (failed.has(key)) {
    return true;
  }

  if (
    failed.has(
      `warriors:${key}`
    )
  ) {
    return true;
  }

  if (
    failed.has(
      `weapons:${key}`
    )
  ) {
    return true;
  }

  if (
    failed.has(
      `terrain:${key}`
    )
  ) {
    return true;
  }

  if (
    failed.has(
      `character-rig:${key}`
    )
  ) {
    return true;
  }

  if (
    failed.has(
      `simple-character:${key}`
    )
  ) {
    return true;
  }

  for (
    const failureKey of failed
  ) {
    if (
      failureKey.startsWith(
        `character-rig:${key}:`
      ) ||
      failureKey.startsWith(
        `simple-character:${key}:`
      )
    ) {
      return true;
    }
  }

  return false;
}

export function areAssetsLoaded():
  boolean {
  return manifest !== null;
}

export function areCharacterRigAssetsLoaded():
  boolean {
  return (
    characterRigManifest !== null
  );
}

export function resetAssets():
  void {
  manifest = null;
  characterRigManifest = null;
  loadPromise = null;

  warriorImages.clear();
  weaponImages.clear();
  terrainImages.clear();

  characterRigImages.clear();
  characterRigDefinitions.clear();
  characterRigPromises.clear();

  simpleCharacterImages.clear();

  failed.clear();
}
