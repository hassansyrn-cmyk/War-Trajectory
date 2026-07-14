# War Trajectory Mobile (WTM) - Weapons Systems

Weapons in *War Trajectory Mobile* dictate strategic options, flight trajectories, and tactical approaches. This document details weapon behavior, projectile mechanics, structural properties, and classifications.

---

## 1. Weapon Classification Architecture

All weapons in WTM are categorized into five primary families. Each family utilizes distinct physics variables in the ballistics engine, changing how players must read wind, gravity, and distance.

```
                                  [Weapon Families]
                                         |
         +------------------+------------+------------+------------------+
         |                  |                         |                  |
    [1. Arched]        [2. Piercing]             [3. Heavy]         [4. Ballistic]
     - Light Weight     - Medium Weight           - Ultra Heavy      - Dual Launch
     - Wind-Sensitive   - Linear trajectory       - Lob-style        - Fragmenting
     - High Headshot    - High penetration        - High knockback   - High AOE damage
```

### 1.1 The Archetypes
1.  **Arched (Precision Bows):** High flight speed, low gravity-drop factor, highly sensitive to wind drift. Excellent for headshots.
2.  **Piercing (Heavy Javelins & Spears):** Medium weight, ignores light crosswinds, penetrates deep into target shields and remains stuck to the hit bone.
3.  **Heavy (Throwing Axes & Hammers):** High weight, steep descent angle, low wind sensitivity, high impact force causing immediate dynamic fall/ragdoll animations.
4.  **Ballistic & Explosive (Rockets & Grenades):** Complex trajectories. Includes thruster-accelerated flight or ground-bouncing dynamics with area-of-effect (AOE) splash damage and structural terrain destruction.
5.  **Futuristic Energy (Plasma & Beam):** Non-standard paths, such as bouncing off ceilings or creating localized gravity wells that pull the opponent before exploding.

---

## 2. Comprehensive Weapon Manifest (MVP & Beyond)

Below is the structured data set for weapons.

| Weapon ID | Family | Name | Rarity | Weight (kg) | Base Damage | Splash Radius (m) | Special Mechanics & Visual Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W_BASIC_BOW** | Arched | **Basic Bow** | Common | 1.0 | 100 | 0.0 | High headshot multiplier ($2.5\times$). Arrow sticks on hit. Trail: simple white smoke. |
| **W_EXP_ROCKET**| Ballistic | **Explosive Rocket**| Rare | 4.5 | 180 | 3.5 | Constant thruster acceleration. Triggers dynamic knockback. Trail: fire and thick black smoke. |
| **W_THROW_AXE** | Heavy | **Throwing Axe** | Common | 2.5 | 140 | 0.0 | Rotates in flight. Causes 100% ragdoll on headshot. Trail: circular wind ripples. |
| **W_LEG_BOW**   | Arched | **Legendary Bow** | Legendary| 1.2 | 120 | 0.5 | Arrows split into 3 micro-projectiles mid-flight if the screen is tapped. Trail: gold starlight. |
| **W_ELEC_BOW**  | Arched | **Electric Arrow**| Epic | 1.1 | 90 | 1.5 | Disables target's active abilities for 1 turn (Stun effect). Trail: electric blue lightning. |
| **W_FIRE_BOW**  | Arched | **Flame Arrow** | Epic | 1.1 | 95 | 1.0 | Inflicts 20 Burn damage per turn for 3 turns. Trail: glowing orange ember path. |
| **W_ICE_BOW**   | Arched | **Frost Arrow** | Epic | 1.3 | 90 | 2.0 | Decreases target's movement/jump capabilities by 50% for 2 turns. Trail: ice crystals. |
| **W_SPEAR**     | Piercing | **Iron Javelin** | Common | 3.5 | 150 | 0.0 | High shield-piercing multiplier ($1.8\times$). Sticks in terrain or character models. |
| **W_GRENADE**   | Ballistic | **Frag Grenade** | Common | 1.8 | 130 | 4.0 | Bounces off terrain up to 3 times before detonating on a 3-second timer. Trail: green fuse spark. |
| **W_CLUSTER**   | Ballistic | **Cluster Bomb** | Epic | 3.0 | 160 | 6.0 | Splits into 5 mini-bomblets upon impact, creating multiple secondary explosions. |
| **W_ENERGY_BL** | Futuristic| **Plasma Cannon**| Legendary| 5.0 | 200 | 3.0 | Shoots a plasma bolt that ignores wind entirely but experiences high gravitational drop. |

---

## 3. Physical Behavior Parameters

To maintain physical consistency, each weapon asset in Unity contains a `WeaponPhysicsData` scriptable object.

```csharp
[CreateAssetMenu(fileName = "NewWeaponPhysicsData", menuName = "WTM/Weapon Physics Data")]
public class WeaponPhysicsData : ScriptableObject
{
    [Header("Ballistic Properties")]
    public string weaponID;
    public string weaponName;
    public float weightKg;             // Affects gravitational acceleration force
    public float windSensitivity;      // Multiplier for wind drift force vector
    public float launchVelocityMax;    // Max speed when pulling back to max distance (m/s)
    public float dragCoefficient;      // Aerodynamic resistance factor (air friction)

    [Header("Impact Properties")]
    public float baseDamage;
    public float splashRadius;
    public float impulseForce;         // Knockback physics impulse magnitude
    public bool stickOnImpact;         // Arrow-style pinning behavior
    public bool explodeOnImpact;
    public GameObject impactVFXPrefab;
}
```

---

## 4. Ballistic Flight Simulation Formulae

The trajectory of a projectile is calculated every physics step using the following physical model:

Let:
*   $\vec{P}_t$ = Projectile position at time $t$
*   $\vec{V}_t$ = Projectile velocity vector at time $t$
*   $m$ = Mass of the projectile (derived from weight in kg)
*   $\vec{g}$ = Gravity vector ($0, -9.81 \text{ m/s}^2, 0$)
*   $\vec{W}$ = Wind velocity vector ($W_x, W_y, 0$)
*   $C_d$ = Drag coefficient
*   $S_w$ = Wind sensitivity parameter

The forces acting on the projectile are:
1.  **Gravity:** $\vec{F}_{grav} = m \cdot \vec{g}$
2.  **Air Resistance (Drag):** $\vec{F}_{drag} = -\frac{1}{2} C_d \cdot ||\vec{V}_t|| \cdot \vec{V}_t$
3.  **Wind Force:** $\vec{F}_{wind} = S_w \cdot (\vec{W} - \vec{V}_t)$

The net acceleration $\vec{a}_t$ is:
$$\vec{a}_t = \vec{g} - \frac{C_d}{2m} ||\vec{V}_t|| \vec{V}_t + \frac{S_w}{m} (\vec{W} - \vec{V}_t)$$

In Unity's update loop, the trajectory is solved iteratively using the explicit Euler integration method on the server (Photon Fusion client prediction replicates this locally):
$$\vec{V}_{t+dt} = \vec{V}_t + \vec{a}_t \cdot dt$$
$$\vec{P}_{t+dt} = \vec{P}_t + \vec{V}_{t+dt} \cdot dt$$
This produces responsive and physically-accurate wind drift, drag retardation, and curved gravity arcs.
