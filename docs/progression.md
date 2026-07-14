# War Trajectory Mobile (WTM) - Player Progression Systems

To drive retention and reward player skill, WTM features a robust, tiered progression loop. This document outlines the progression formulas, XP curves, reward structures, daily engagement loops, and competitive ranking divisions.

---

## 1. Character Progression & XP Mathematical Curve

WTM features a dedicated profile leveling structure scaling from Level 1 to Level 100. The experience point (XP) requirement curve scales progressively to prevent rapid, unsatisfying leveling at higher ranks.

### 1.1 Progression Curve Formulas
The required experience points ($XP_{\text{req}}$) to transition from current level $L$ to $L+1$ is calculated using the following polynomial exponential model:

$$XP_{\text{req}}(L) = \text{BaseXP} \times L^{1.5}$$

To add depth, we introduce a step-scaling modifier $M(L)$ to ensure the early game (levels 1-10) is fast-paced, while the late-game feels rewarding:

$$XP_{\text{req}}(L) = \lfloor \text{BaseXP} \times L^{1.5} \times M(L) \rfloor$$

Where:
*   $\text{BaseXP} = 1000$
*   $M(L)$ is defined as:
    *   For $1 \leq L \leq 10$: $M(L) = 0.8$ (Onboarding stage)
    *   For $11 \leq L \leq 50$: $M(L) = 1.0$ (Regular progression)
    *   For $51 \leq L \leq 100$: $M(L) = 1.25$ (Endgame stage)

### 1.2 Sample XP Curve (Levels 1 to 100)

| Level | Base Calculation ($1000 \times L^{1.5}$) | Step Modifier $M(L)$ | Exact XP Required | Total Cumulative XP |
| :---: | :--- | :---: | :--- | :--- |
| **1** | $1000 \times 1.0 = 1000$ | 0.80 | **800** | 800 |
| **2** | $1000 \times 2.8 = 2828$ | 0.80 | **2,262** | 3,062 |
| **3** | $1000 \times 5.1 = 5196$ | 0.80 | **4,156** | 7,218 |
| **5** | $1000 \times 11.1 = 11180$ | 0.80 | **8,944** | 24,116 |
| **10**| $1000 \times 31.6 = 31622$ | 0.80 | **25,297** | 108,793 |
| **11**| $1000 \times 36.4 = 36482$ | 1.00 | **36,482** | 145,275 |
| **25**| $1000 \times 125.0 = 125000$ | 1.00 | **125,000** | 1,820,350 |
| **50**| $1000 \times 353.5 = 353553$ | 1.00 | **353,553** | 10,210,400 |
| **51**| $1000 \times 364.2 = 364212$ | 1.25 | **455,265** | 10,665,665 |
| **75**| $1000 \times 649.5 = 649519$ | 1.25 | **811,898** | 34,220,110 |
| **100**| $1000 \times 1000.0 = 1000000$| 1.25 | **1,250,000**| 71,402,120 |

---

## 2. Matchmaking Rewards Blueprint

XP is awarded at the end of matches based on performance to incentivize clean, precise, and strategic play.

```
                  [Match Over Triggered]
                            |
           +----------------+----------------+
           |                                 |
     [Match Result]                  [Accolades Earned]
     - Win:  +300 XP                 - Headshot:   +50 XP each
     - Loss: +100 XP                 - Multihit:   +40 XP each
                                     - Underdog:   +75 XP
                                     - Flawless Win: +150 XP
```

### 2.1 Reward Definitions
*   **Win Reward:** +300 XP, +25 Coins, +10 Ranked Points (if Ranked).
*   **Loss Reward:** +100 XP, +8 Coins, -8 Ranked Points (if Ranked).
*   **Headshot Accolade:** +50 XP per headshot.
*   **Multi-Hit Accolade:** +40 XP (hitting multiple targets or triggers).
*   **Underdog Bonus:** +75 XP (won against an opponent 5+ levels higher).
*   **Flawless Win:** +150 XP (won with 100% starting health).

---

## 3. Engagement Systems

### 3.1 Daily Login Matrix
To build consistent daily play habits, players can claim rewards from a progressive 7-day login track. Missing a day resets the track to Day 1.

*   **Day 1:** 200 Coins
*   **Day 2:** 1x Common Weapon Crate
*   **Day 3:** 400 Coins + 10 Gems
*   **Day 4:** 2x Shield Ability Cards
*   **Day 5:** 600 Coins + 25 Gems
*   **Day 6:** 1x Rare Skin Crate
*   **Day 7:** 1000 Coins + 50 Gems + Legendary Avatar Frame

### 3.2 Dynamic Mission Structure
Missions refresh daily and weekly to encourage varied gameplay styles.

```json
{
  "daily_missions": [
    {
      "id": "d_01",
      "task": "Land 3 Headshots in Ranked Matches",
      "xp_reward": 500,
      "gold_reward": 150
    },
    {
      "id": "d_02",
      "task": "Deal 1,500 total damage using the Throwing Axe",
      "xp_reward": 400,
      "gold_reward": 100
    }
  ],
  "weekly_missions": [
    {
      "id": "w_01",
      "task": "Win 10 Ranked Matches",
      "xp_reward": 2500,
      "gold_reward": 1000,
      "gem_reward": 50
    }
  ]
}
```

---

## 4. Ranked Progression Divisions

The competitive ladder is divided into tiers based on **Ranked Points (RP)**. Players start at 0 RP in Bronze V.

```
  [Bronze] -> [Silver] -> [Gold] -> [Platinum] -> [Diamond] -> [Apex Champion]
   0-999      1k-1.9k    2k-2.9k    3k-3.9k      4k-4.9k         5k+
```

### 4.1 Tier Thresholds & Rules
1.  **Bronze (I - V):** 0 – 999 RP. No point loss on defeat.
2.  **Silver (I - V):** 1000 – 1999 RP. Moderate loss on defeat (-4 RP).
3.  **Gold (I - V):** 2000 – 2999 RP. Standard loss on defeat (-8 RP).
4.  **Platinum (I - V):** 3000 – 3999 RP. High loss on defeat (-12 RP).
5.  **Diamond (I - V):** 4000 – 4999 RP. Extreme loss on defeat (-16 RP).
6.  **Apex Champion (Top 500 Global):** 5000+ RP. Decay active (must play 3 matches per week or lose 50 RP daily).
