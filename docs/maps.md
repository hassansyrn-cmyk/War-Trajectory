# War Trajectory Mobile (WTM) - Map Designs & Environmental Profiles

Maps in *War Trajectory Mobile* serve as dynamic tactical arenas. This document outlines the physical parameters, environmental hazards, structures, and tactical characteristics of the maps.

---

## 1. Map Layout & Architectural Paradigm

Each map is represented as a 3D horizontal environment, centered around a 2D shooting plane on the X and Y axes.

```
                                [3D Sky / Dynamic Wind]
                                     ~ ~ ~ ~ ~ ~
                                    [Wind Vector]

     [Player A Platform]                                     [Player B Platform]
        +----------+                                            +----------+
        |  Active  |                                            |  Active  |
        | Player A |                                            | Player B |
        +----------+                                            +----------+
              \                                                      /
               \                  [Dynamic Hazard Zone]             /
                \_________________   (e.g., Lava Lake)  ___________/
                                  \___________________/
```

### 1.1 Structural Mechanics
*   **Playable Boundary Width:** 60 to 90 meters along the X-axis.
*   **Vertical Height Ceiling:** 40 meters along the Y-axis (projectiles travelling higher are auto-destroyed).
*   **Platform Heights:** Players are positioned on elevated platforms to encourage high-angle lob shots rather than flat, horizontal firing vectors.

---

## 2. Comprehensive Map Directory

### 2.1 Map Profiles

#### 1. Desert Canyon (MVP Map)
*   **Theme:** Dry sandstone arches, high winds, and deep dust canyons.
*   **Wind profile:** Severe wind velocity limit ($W_{limit} = 15.0 \text{ m/s}$). Rapid wind direction changes between turns.
*   **Tactical Modifier:** Elevated, fragile sandstone bridges that disintegrate if hit by heavy explosives.

#### 2. Volcano Island
*   **Theme:** Volcanic rock plates surrounded by slow-moving lava pools.
*   **Wind profile:** Moderate wind speed ($W_{limit} = 6.0 \text{ m/s}$), with dynamic vertical updrafts caused by heat columns.
*   **Tactical Modifier:** If a projectile falls into the lava pools, it triggers a volcanic rock splash, dealing +30 burn damage to any player standing near the edge.

#### 3. Whispering Forest
*   **Theme:** Giant redwood trees and dense mossy stone cover.
*   **Wind profile:** Low wind speeds ($W_{limit} = 4.0 \text{ m/s}$).
*   **Tactical Modifier:** High leaf canopies block steep lob shots. Players must use lower, flatter trajectories to bypass the leafy obstacles, or use heavy explosive weapons to clear away branches.

#### 4. Ruined Citadel
*   **Theme:** Broken medieval stone towers and hanging chains under a rainy night sky.
*   **Wind profile:** Strong crosswinds ($W_{limit} = 11.0 \text{ m/s}$).
*   **Tactical Modifier:** Features thick stone battlements that provide complete cover. These battlements require multiple hits from heavy projectiles (e.g., iron javelins, throwing axes) to destroy.

#### 5. Neon Cyber-City
*   **Theme:** Rain-slicked holographic streets and towering futuristic billboards.
*   **Wind profile:** Low-to-moderate wind speeds ($W_{limit} = 7.0 \text{ m/s}$).
*   **Tactical Modifier:** Floating hologram advertisements drift across the map, acting as energy barriers that block or redirect projectiles.

#### 6. Low-Gravity Lunar Station
*   **Theme:** Outer space base with star fields and low gravity domes.
*   **Gravity Multiplier:** Gravity is reduced by $60\%$ ($g_{eff} = -3.92 \text{ m/s}^2$).
*   **Wind profile:** Absolutely zero atmosphere ($W_{limit} = 0.0 \text{ m/s}$).
*   **Tactical Modifier:** Projectiles fly much further on flatter, loftier arcs, and characters fly twice as far from explosion knockbacks.

---

## 3. Map Config Asset Structure

In Unity, maps are defined using serializable Scriptable Objects to easily configure environmental parameters.

```csharp
namespace WTM.Maps
{
    using UnityEngine;

    [CreateAssetMenu(fileName = "NewMapConfig", menuName = "WTM/Map Configuration")]
    public class MapConfig : ScriptableObject
    {
        public string mapID;
        public string displayName;

        [Header("Physical Constants")]
        public float gravityScale = 1.0f; // Multiplier on physics gravity
        public float maxWindLimit = 10.0f; // Max absolute speed in m/s
        public float airDensity = 1.225f;  // Affects air friction calculations

        [Header("Environmental Hazards")]
        public bool hasDynamicUpdrafts;
        public float updraftStrength;
        public bool hasAcidLavaHazards;
        public float hazardDamagePerTurn;

        [Header("Visual Configurations")]
        public Material skyboxMaterial;
        public GameObject environmentalVfxPrefab;
        public AudioClip environmentalAmbianceAudio;
    }
}
```
