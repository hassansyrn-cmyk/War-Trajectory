# War Trajectory Mobile (WTM) - Monetization & Economy Systems

WTM features a strictly non-pay-to-win (No-P2W) monetization model. This design prioritizes fair competitive play while generating revenue through high-quality cosmetic assets, seasonal Battle Passes, and player-friendly rewarded ads.

---

## 1. Dual-Currency Economy

WTM uses two currencies to separate earned rewards from premium purchases.

```
                                [In-Game Economy]
                                        |
         +------------------------------+------------------------------+
         |                                                             |
   [Coins] (Soft Currency)                                       [Gems] (Hard Premium)
   - Earned via matches, missions                                - Purchased with real currency
   - Used for Common/Rare skins                                  - Used for Legendary skins, BP, XP boosts
   - Max cap: 100,000 Coins                                      - No cap
```

### 1.1 Soft Currency (Coins)
*   **Acquisition:** Awarded at the end of matches, from daily login rewards, and by completing daily/weekly missions.
*   **Utility:** Used to purchase Common and Rare skins, cosmetic crates, and basic emotes.
*   **Cap Limits:** To prevent inflation, players can earn a maximum of 1,500 Coins per day from match completion rewards (missions and level-up rewards bypass this cap).

### 1.2 Hard Premium Currency (Gems)
*   **Acquisition:** Purchased using real money via Google Play Billing / iOS App Store In-App Purchases (IAP). Small amounts are also awarded for completing milestones, achievements, or reaching high tiers in the Battle Pass.
*   **Utility:** Used to purchase the Premium Battle Pass, Legendary/Epic skins, custom entrance/victory VFX, and cosmetic bundles.

---

## 2. Monetization Features

### 2.1 The Seasonal Battle Pass
The Battle Pass runs on a 45-day cycle, featuring 50 tiers of rewards.

*   **Free Track:** Contains Coins, common emotes, Profile Avatars, and occasional cosmetic crates.
*   **Premium Track (Cost: 800 Gems, approx. $7.99 USD):** Unlocks exclusive epic and legendary skins, custom wind trails, unique emotes, and enough Gems to purchase the next season's Battle Pass if fully completed.
*   **Battle Pass Progression:** Players earn Battle Pass XP by playing matches and completing missions:
    $$\text{Tier XP Required} = 500 \text{ (Constant per tier)}$$

### 2.2 Rotational Cosmetic Shop
The shop features a daily and weekly rotating inventory to encourage regular engagement.

```json
{
  "weekly_featured": {
    "bundle_id": "b_viper_legendary",
    "title": "Viper Kasumi Bundle",
    "cost_gems": 1800,
    "discount_pct": 20,
    "contents": [
      "skin_viper_kasumi",
      "emote_viper_flex",
      "vfx_neon_trail"
    ]
  },
  "daily_offers": [
    {
      "offer_id": "d_01",
      "item": "Kensei Jin Skin",
      "cost_coins": 5000
    },
    {
      "offer_id": "d_02",
      "item": "Gold Star Trail VFX",
      "cost_gems": 350
    }
  ]
}
```

---

## 3. Player-Friendly Rewarded Ads

To monetize non-paying players without disrupting their experience, WTM uses rewarded video ads. There are **no forced interstitial ads**.

### 3.1 Rewarded Ad Placements
1.  **Match Reward Doubler:** Players can watch an ad after a match to double their earned Coins and XP (capped at 3 times per day).
2.  **Daily Free Crate:** Watch one ad per day to claim a free Common Crate containing minor cosmetics or Coins.
3.  **Mission Refresh:** Players can watch an ad to swap a daily mission they do not wish to complete (capped at 1 refresh per day).
