# War Trajectory Mobile (WTM) - Skills & Skins Systems

This document combines our tactical active Skills framework with the custom Skins catalog. It details the skill activation lifecycle, full skill directory, mathematical scaling curves, visual/auditory cosmetic parameters, the 10 core skins, and our custom interactive emote configuration.

---

## 1. Skill Activation Life Cycle

Skills in *War Trajectory Mobile* must execute with complete determinism to maintain esports-level multiplayer fairness. The complete trigger pipeline under Photon Fusion is illustrated below:

```
[Local Player presses Skill UI]
              |
              v
[Local Predicts Visuals (VFX/SFX)]
              |
[Photon Network RPC sent to Server]
              |
              v
[Server Validates energy, cooldown, state]
              |
      +-------+-------+
      |               |
[If VALID]       [If INVALID]
      |               |
      v               v
[Server applies State Change]   [Server sends Rollback/Cancel RPC]
[Sync Var updated on all clients]
```

---

## 2. Active Skill Catalog

| Skill Name | Cooldown (Turns) | Energy Cost | Type | Direct Gameplay Effect |
| :--- | :---: | :---: | :--- | :--- |
| **Shield** | 3 | 40 | Active Defense | Spawns an energy barrier protecting the character from all incoming projectile damage by 60% for 1 turn. |
| **Double Damage** | 4 | 60 | Active Buff | Doubles the damage output of the next projectile fired. Increases weight by 20% due to energy condensation. |
| **Time Slow** | 2 | 25 | Active Utility | Slows down time visually during the player's shooting phase, allowing for more precise alignment. Does not alter physics outcomes. |
| **Healing** | 5 | 50 | Active Recovery | Heals the player's character for +120 HP instantly. Cannot be triggered if health is above 80%. |
| **Teleport** | 4 | 45 | Active Mobility | Teleports the player to a chosen location within a 10-meter radius. Useful to escape hazardous terrain. |
| **Jump Boost** | 3 | 30 | Active Mobility | Temporarily increases the vertical leap capability of the character by 150% for 1 turn. |
| **Energy Blast** | 3 | 35 | Active Utility | Emits a powerful sonic shockwave around the player, pushing away incoming nearby projectiles. |
| **Wind Control** | 4 | 40 | Active Tactical | Reverses or neutralizes the current wind vector ($W_x = -W_x$) for the duration of the current turn. |
| **Headshot Boost**| 4 | 50 | Active Buff | If the next shot lands directly on the opponent's head bone, the headshot damage multiplier increases from $2.5\times$ to $4.0\times$. |
| **Ultimate Blast**| Chg | 100 | Ultimate | Launches a powerful overhead cosmic laser strike from the clouds directly onto the opponent's coordinate. Charged by landing normal attacks. |

---

## 3. Mathematical Balancings & Cooldown Matrices

To maintain tactical balance, Energy is earned through proactive actions:
*   **Base Energy Generation:** +15 Energy per turn automatically.
*   **Skill Damage Gain:** Energy is earned equivalent to $25\%$ of damage dealt.
*   **Underdogs Bonus:** If a player's HP falls below $30\%$, they generate +10 additional energy per turn to facilitate comeback opportunities.

### 3.1 Scaling & Upgrade Systems (Casual Mode Only)
In Casual Mode, players can upgrade skills using Coins. The upgrade scaling follows a strict mathematical matrix:

$$\text{EffectValue}_{\text{Level}} = \text{EffectValue}_{\text{Base}} \times (1 + 0.05 \cdot (\text{Level} - 1))$$
$$\text{UpgradeCost} = 500 \times 1.8^{(\text{Level} - 1)} \text{ Coins}$$

*Max Level = 5.* (Note: This upgrade scale is completely disabled in **Ranked 1v1 Mode** to preserve competitive fairness).

---

## 4. Cosmetic Integrity Charter

To ensure a fair and balanced competitive environment, **all skins are strictly cosmetic**.

```
                           [Player Model Core Prefab]
                                       |
                     +-----------------+-----------------+
                     |                                   |
           [Collider / Hitboxes]                [Visual Mesh Overlay]
           - Identical scale on all skins        - Unique 3D meshes
           - Head: Spherical Collider           - Custom textures, materials
           - Body: Capsule Collider              - Unique Entry/Victory animations
           - Limbs: Capsule Colliders            - Custom particle emitters
```

1.  **Hitbox Uniformity:** Every character skin, regardless of visual size or bulky armor (e.g., heavy combat robots vs. slim ninjas), shares an identical underlying 3D collider setup (head sphere, body capsule, limb capsules). This ensures consistent hit registration.
2.  **No Stat Modifiers:** Skins do not alter health, running speed, aiming preview, gravity scales, or weapon handling.

---

## 5. Character Skin Matrix

Below are the 10 core skins designed for the launch.

| Skin ID | Name | Theme Group | Rarity | Visual Design Description | Entrance VFX / Pose | Victory Animation / Pose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S_KNIGHT_01** | **Sir Gareth** | Knight | Common | Classic iron plate armor with a blue plume and gold trim. | unsheathes sword and raises it to the sky. | Plants his sword into the ground and rests both hands on the hilt. |
| **S_KNIGHT_02** | **Dark Templar** | Knight | Epic | Black obsidian armor with glowing red runic engravings. | Rises from a pool of dark shadow energy. | Raises a glowing red shield as dark lightning strikes behind him. |
| **S_SAMURAI_01**| **Kensei Jin** | Samurai | Common | Red lacquered armor with a traditional Oni kabuto helmet. | Draws katana in a quick slash, leaving a white wind trail. | Sheathes his katana with a crisp click sound. |
| **S_SAMURAI_02**| **Cherry Ronin**| Samurai | Rare | Weathered wooden armor adorned with falling cherry blossom petals. | Meditates under a falling cherry blossom tree. | Plays a wooden flute as cherry blossoms swirl around him. |
| **S_NINJA_01**  | **Shadow Hanzo**| Ninja | Common | Sleek black shinobi outfit with purple glowing eyes. | Drops from the sky in a puff of smoke. | Performs a backflip and throws three smoke pellets at the camera. |
| **S_NINJA_02**  | **Viper Kasumi**| Ninja | Legendary| Neon green bio-armor with snake scale patterns. | Glides in from the side using a neon green energy wingsuit. | Summons a holographic giant green viper that wraps around her. |
| **S_SOLDIER_01**| **Major Vance** | Soldier | Common | Tactical desert camo gear with night-vision goggles. | Rappels down from a military helicopter line. | Performs a crisp military salute as a supply drop lands behind him. |
| **S_SOLDIER_02**| **Apex Spectre**| Soldier | Epic | Active optical camouflage suit with a glowing orange visor. | Materializes from near-perfect invisibility. | Fires an energy flare into the sky and reloads his plasma rifle. |
| **S_ROBOT_01**  | **Sentry X-9** | Robot | Common | Industrial yellow construction robot with visible hydraulic pistons. | Boot-up sequence with spinning fans and steam vents. | Performs a robotic "spin" dance, shooting sparks from his joints. |
| **S_ROBOT_02**  | **Omega Mech** | Robot | Legendary| Sleek white chrome plating with a blue glowing core. | Drops from orbit in a fiery reentry pod. | Floats in the air, charging a blue energy sphere in his chest. |

---

## 6. Emotes System

Each skin includes four expressive emotes that can be triggered in-match to communicate with the opponent.

```
       [Player Input: Swipe up on Chat Icon]
                         |
           +-------------+-------------+
           |                           |
      [1. Taunt Emote]           [2. GG Emote]
      - Anim: Aggressive         - Anim: Respectful
      - SFX: Vocal laugh         - SFX: Polite applause
           |                           |
      [3. Shocked Emote]         [4. Flex Emote]
      - Anim: Dramatic gasp      - Anim: Muscle flexing
      - SFX: Gasps/Screams       - SFX: Energetic cheers
```

### 6.1 Custom Emote Manifest

*   **S_KNIGHT_02 (Dark Templar):**
    *   *Taunt:* "Your doom approaches!" (Points sword forward, red eye-glow intensifies).
    *   *Flex:* Beats chest with his iron fist, producing a metallic clanging sound.
*   **S_NINJA_02 (Viper Kasumi):**
    *   *Taunt:* "Catch me if you can." (Disappears in a green flash, reappearing instantly).
    *   *Flex:* Sits on a floating neon energy kunai, looking bored.
*   **S_ROBOT_02 (Omega Mech):**
    *   *Taunt:* "Calculation: 100% defeat." (Projects a holographic "Zero Percent" chart).
    *   *Flex:* Detaches his arm, spins it like a propeller, and snaps it back on.
