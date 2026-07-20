// Asset preloader for game sprites. Safe to use in both browser and node contexts.

export interface WarriorAssets {
  viking: HTMLImageElement | null;
  archer: HTMLImageElement | null;
  ninja: HTMLImageElement | null;
  knight: HTMLImageElement | null;
  engineer: HTMLImageElement | null;
}

export interface WeaponAssets {
  arrow: HTMLImageElement | null;
  axe: HTMLImageElement | null;
  fire: HTMLImageElement | null;
  grenade: HTMLImageElement | null;
  ice: HTMLImageElement | null;
  rocket: HTMLImageElement | null;
  shuriken: HTMLImageElement | null;
  spear: HTMLImageElement | null;
}

export interface TerrainAssets {
  desert: HTMLImageElement | null;
  grass: HTMLImageElement | null;
  volcanic: HTMLImageElement | null;
}

export interface GameAssets {
  warriors: WarriorAssets;
  weapons: WeaponAssets;
  terrain: TerrainAssets;
}

export const assets: GameAssets = {
  warriors: {
    viking: null,
    archer: null,
    ninja: null,
    knight: null,
    engineer: null,
  },
  weapons: {
    arrow: null,
    axe: null,
    fire: null,
    grenade: null,
    ice: null,
    rocket: null,
    shuriken: null,
    spear: null,
  },
  terrain: {
    desert: null,
    grass: null,
    volcanic: null,
  },
};

let loadingPromise: Promise<void> | null = null;
const isNode = typeof window === "undefined" || typeof Image === "undefined";

export function loadAllAssets(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  if (isNode) {
    loadingPromise = Promise.resolve();
    return loadingPromise;
  }

  const warriorPaths: Record<keyof WarriorAssets, string> = {
    viking: "/assets/sprites/warriors/viking.png",
    archer: "/assets/sprites/warriors/archer.png",
    ninja: "/assets/sprites/warriors/ninja.png",
    knight: "/assets/sprites/warriors/knight.png",
    engineer: "/assets/sprites/warriors/engineer.png",
  };

  const weaponPaths: Record<keyof WeaponAssets, string> = {
    arrow: "/assets/sprites/weapons/arrow.png",
    axe: "/assets/sprites/weapons/axe.png",
    fire: "/assets/sprites/weapons/fire.png",
    grenade: "/assets/sprites/weapons/grenade.png",
    ice: "/assets/sprites/weapons/ice.png",
    rocket: "/assets/sprites/weapons/rocket.png",
    shuriken: "/assets/sprites/weapons/shuriken.png",
    spear: "/assets/sprites/weapons/spear.png",
  };

  const terrainPaths: Record<keyof TerrainAssets, string> = {
    desert: "/assets/sprites/terrain/platform_desert.png",
    grass: "/assets/sprites/terrain/platform_grass.png",
    volcanic: "/assets/sprites/terrain/platform_volcanic.png",
  };

  const promises: Promise<void>[] = [];

  function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load asset: ${url}`);
        resolve(null);
      };
    });
  }

  // Load warriors
  for (const key of Object.keys(warriorPaths) as (keyof WarriorAssets)[]) {
    const p = loadImage(warriorPaths[key]).then((img) => {
      assets.warriors[key] = img;
    });
    promises.push(p);
  }

  // Load weapons
  for (const key of Object.keys(weaponPaths) as (keyof WeaponAssets)[]) {
    const p = loadImage(weaponPaths[key]).then((img) => {
      assets.weapons[key] = img;
    });
    promises.push(p);
  }

  // Load terrain
  for (const key of Object.keys(terrainPaths) as (keyof TerrainAssets)[]) {
    const p = loadImage(terrainPaths[key]).then((img) => {
      assets.terrain[key] = img;
    });
    promises.push(p);
  }

  loadingPromise = Promise.all(promises).then(() => {
    console.log("All sprites loaded successfully or fallback registered.");
  });

  return loadingPromise;
}
