# War Trajectory Mobile (WTM) - MVP Scope Document

This document defines the Minimum Viable Product (MVP) scope for *War Trajectory Mobile*. It identifies the essential features, maps, weapons, skills, and technical requirements needed for the launch.

---

## 1. MVP Feature Scope Map

```
                             [WTM MVP Scope]
                                    |
         +-----------------+--------+--------+-----------------+
         |                 |                 |                 |
    [Core Combat]    [Progression]       [Network]         [Monetization]
    - Pull-Back Aim  - Profile XP        - 1v1 PvP         - Rewarded Video Ads
    - 3 MVP Weapons  - 10 Launch Skins   - Photon Fusion   - Basic Coins Shop
    - 2 MVP Skills   - Daily Rewards     - Guest/Google Login
    - 1 Map (Desert) - Leaderboards
```

---

## 2. MVP Content Blueprint

### 2.1 The Launch Map: Desert Canyon
*   **Theme:** Red rock sandstone arches under a dynamic desert sky.
*   **Environment Constraints:** Static sandstone platforms on either side of a deep canyon.
*   **Weather Profile:** High, variable crosswinds ($W_{limit} = 15.0 \text{ m/s}$) to test players' ability to read and adjust to wind drift.

### 2.2 The 3 Core MVP Weapons

1.  **Basic Bow (Arched Family):**
    *   *Role:* Starter precision weapon.
    *   *Physics:* Low weight ($1.0 \text{ kg}$), high launch velocity ($35 \text{ m/s}$), and high wind sensitivity ($1.25$).
    *   *Damage:* 100 base damage, $2.5\times$ headshot multiplier.
2.  **Explosive Rocket (Ballistic Family):**
    *   *Role:* Strategic zone control and cover destruction.
    *   *Physics:* Heavy weight ($4.5 \text{ kg}$), low wind sensitivity ($0.65$), and active rocket thruster acceleration.
    *   *Damage:* 80 direct hit damage, $3.5 \text{ meter}$ splash explosion radius, and dynamic knockback.
3.  **Throwing Axe (Heavy Family):**
    *   *Role:* High-risk lob weapon.
    *   *Physics:* Heavy weight ($2.8 \text{ kg}$), low wind sensitivity ($0.35$), and steep lob-style descent.
    *   *Damage:* 130 base damage, $1.8\times$ headshot multiplier, causing immediate ragdoll on headshot.

### 2.3 The 2 Core MVP Skills

1.  **Shield (Active Defense):**
    *   *Cooldown:* 3 turns.
    *   *Energy Cost:* 40 Energy.
    *   *Effect:* Deploys an energy barrier around the player, reducing all incoming damage by 60% for 1 turn.
2.  **Double Damage (Active Buff):**
    *   *Cooldown:* 4 turns.
    *   *Energy Cost:* 60 Energy.
    *   *Effect:* Doubles the damage of the next shot. Increases weapon weight by 20% due to energy condensation.

### 2.4 The 10 MVP Character Skins
The launch features 10 cosmetic-only character skins split across five themes:
*   **Knights:** Sir Gareth (Common), Dark Templar (Epic).
*   **Samurai:** Kensei Jin (Common), Cherry Ronin (Rare).
*   **Ninjas:** Shadow Hanzo (Common), Viper Kasumi (Legendary).
*   **Futuristic Soldiers:** Major Vance (Common), Apex Spectre (Epic).
*   **Combat Robots:** Sentry X-9 (Common), Omega Mech (Legendary).

---

## 3. Technical & System Requirements

### 3.1 Network Services
*   **Matchmaking & State Sync:** Photon Fusion Cloud.
*   **Authentication & Data Persistence:** PlayFab backend supporting:
    *   *Guest Login* (Device ID).
    *   *Google Sign-In* (Android) and *Apple Sign-In* (iOS).
*   **Leaderboard Services:** PlayFab-tracked Global and Regional Elo rating systems.

### 3.2 Monetization & Ad Providers
*   **Rewarded Video Ads Integration:** Unity Ads or Google Mobile Ads SDK (AdMob).
*   **In-App Purchases (IAP):** Unity IAP SDK configured for Google Play Billing and Apple App Store Purchases.

### 3.3 Target Performance Benchmarks

| Device Tier | Target Framerate | Visual Quality Preset | Memory Footprint |
| :--- | :---: | :---: | :---: |
| **Low-End Devices** (e.g., 3GB RAM) | **30 FPS** | Low (No real-time shadows, simple particle systems) | $< 650 \text{ MB}$ |
| **Mid-Range Devices** (e.g., 4-6GB RAM)| **60 FPS** | Medium (Dynamic lighting, normal map textures) | $< 1.2 \text{ GB}$ |
| **High-End Devices** (e.g., 8GB+ RAM) | **120 FPS** | AAA (Real-time dynamic shadows, high-res textures) | $< 2.0 \text{ GB}$ |
