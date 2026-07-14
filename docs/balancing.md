# War Trajectory Mobile (WTM) - Balancing Suite

WTM is a competitive, physics-based PvP shooter. This suite details the numerical balance values, flight physics, and upgrade paths to ensure balanced gameplay.

---

## 1. Projectile Physics Properties

Each projectile's in-flight behavior is determined by four variables: Weight, Wind Sensitivity, Air Drag, and Launch Velocity.

```
                              [Projectile Weight]
                                       |
                 +---------------------+---------------------+
                 |                                           |
         [Heavy Weight (e.g., Axe)]                 [Light Weight (e.g., Bow)]
         - Rapid gravity fall                       - Floatier flight path
         - Low wind drift                           - High wind drift
         - High impact kinetic damage               - High headshot accuracy
```

### 1.1 Projectile Balance Matrix

| Projectile ID | Weight (kg) | Wind Sensitivity | Air Drag ($C_d$) | Launch Velocity Max (m/s) | Gravity Scale ($g$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **P_BASIC_ARROW** | 0.8 | 1.25 | 0.002 | 35.0 | 1.00 |
| **P_EXP_ROCKET**  | 4.5 | 0.65 | 0.015 | 22.0 (Active acceleration) | 0.85 |
| **P_THROW_AXE**   | 2.8 | 0.35 | 0.025 | 28.0 | 1.15 |
| **P_HEAVY_JAVELIN**| 3.5 | 0.45 | 0.008 | 30.0 | 1.10 |
| **P_GRENADE**     | 1.8 | 0.85 | 0.010 | 25.0 | 1.00 |
| **P_PLASMA_BOLT** | 0.1 | 0.00 | 0.000 | 45.0 | 1.45 |

---

## 2. Damage & Radius Balance Sheet

To keep the combat flow engaging, damage scaling must account for the ease of landing a shot.

*   **Precision Shots (Bows, Javelins):** No splash radius, but high base damage and a large headshot multiplier to reward precise aiming.
*   **Splash Damage (Rockets, Grenades):** Large splash radius but lower direct hit damage to balance the ease of hitting targets.

### 2.1 Combat Balance Matrix

| Weapon ID | Direct Hit Damage | Splash Radius (m) | Outer Damage Limit | Headshot Multiplier | Balance Intent |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **W_BASIC_BOW** | 100 | 0.0 | 0 | $2.50\times$ | High-precision starter weapon. |
| **W_EXP_ROCKET**| 80 | 3.5 | 20 (at edge) | $1.25\times$ | Strategic zoning and cover destruction. |
| **W_THROW_AXE** | 130 | 0.0 | 0 | $1.80\times$ | High-risk, high-reward lob weapon. |
| **W_SPEAR**     | 120 | 0.0 | 0 | $2.00\times$ | Flat trajectory, easy aiming. |
| **W_GRENADE**   | 70 | 4.0 | 15 (at edge) | $1.10\times$ | Bouncing mechanics for indirect hits. |
| **W_ENERGY_BL** | 140 | 2.5 | 40 (at edge) | $1.50\times$ | High-damage late-game weapon. |

---

## 3. Casual Mode Upgrades (Progression Curve)

Upgrades in Casual Mode are limited to a 5-level cap. **Upgrades are completely disabled in Ranked Mode** to maintain competitive fairness.

### 3.1 Upgrade Progression Formulas

$$\text{Damage}_{\text{Level}} = \text{BaseDamage} \times (1 + 0.06 \cdot (\text{Level} - 1))$$
$$\text{Radius}_{\text{Level}} = \text{BaseRadius} \times (1 + 0.04 \cdot (\text{Level} - 1))$$
$$\text{Upgrade Cost} = 800 \times 1.75^{(\text{Level} - 1)} \text{ Coins}$$

### 3.2 Upgrade Matrix

| Level | Damage Multiplier | Radius Multiplier | Gold Coins Cost | Total Gold Coins Invested |
| :---: | :---: | :---: | :---: | :---: |
| **1 (Base)**| $1.00\times$ | $1.00\times$ | -- | 0 |
| **2** | $1.06\times$ | $1.04\times$ | 800 | 800 |
| **3** | $1.12\times$ | $1.08\times$ | 1,400 | 2,200 |
| **4** | $1.18\times$ | $1.12\times$ | 2,450 | 4,650 |
| **5 (Max)** | $1.24\times$ | $1.16\times$ | 4,288 | 8,938 |
