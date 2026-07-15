using System.Collections.Generic;
using UnityEngine;

namespace WTM.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game Modes")]
        public bool isTrainingMode = false;

        [Header("Active States")]
        public WeaponData currentWeapon;
        public SkillData activeShieldSkill;
        public SkillData activeDoubleDamageSkill;

        public float playerHealth = 500f;
        public float aiHealth = 500f;
        public float maxHealth = 500f;

        public bool isPlayerTurn = true;
        public Vector3 currentWind = Vector3.zero;

        // Custom list of weapon options
        public List<WeaponData> weaponsList = new List<WeaponData>();

        // Custom skill states
        public bool playerShieldActive = false;
        public bool aiShieldActive = false;
        public bool nextShotDoubleDamage = false;

        public System.Action OnStateChanged;

        private void Awake()
        {
            Instance = this;
            InitializeGameData();
        }

        private void Start()
        {
            GenerateNewWind();
        }

        private void InitializeGameData()
        {
            // Preset 3 weapons as per design docs
            weaponsList.Add(new WeaponData
            {
                weaponName = "Basic Bow",
                baseDamage = 100f,
                headshotMultiplier = 2.5f,
                weightKg = 1.0f,
                windSensitivity = 1.25f,
                dragCoefficient = 0.005f,
                explosionRadius = 1.5f,
                projectileColor = Color.green
            });

            weaponsList.Add(new WeaponData
            {
                weaponName = "Explosive Rocket",
                baseDamage = 80f,
                headshotMultiplier = 1.0f, // Rocket does splash, less precision headshot
                weightKg = 4.5f,
                windSensitivity = 0.65f,
                dragCoefficient = 0.015f,
                explosionRadius = 3.5f,
                projectileColor = Color.red
            });

            weaponsList.Add(new WeaponData
            {
                weaponName = "Throwing Axe",
                baseDamage = 130f,
                headshotMultiplier = 1.8f,
                weightKg = 2.8f,
                windSensitivity = 0.35f,
                dragCoefficient = 0.02f,
                explosionRadius = 1.0f,
                projectileColor = Color.yellow
            });

            currentWeapon = weaponsList[0];

            activeShieldSkill = new SkillData
            {
                skillName = "Shield",
                description = "Reduces incoming damage by 60% for 1 turn.",
                cooldownTurns = 3,
                currentCooldown = 0,
                damageReductionMultiplier = 0.4f
            };

            activeDoubleDamageSkill = new SkillData
            {
                skillName = "Double Damage",
                description = "Doubles the damage of the next shot (+20% weapon weight).",
                cooldownTurns = 4,
                currentCooldown = 0,
                damageMultiplier = 2.0f,
                weightMultiplier = 1.20f
            };

            // Read game mode from PlayerPrefs or static variables
            isTrainingMode = PlayerPrefs.GetInt("WTM_TrainingMode", 0) == 1;
            if (isTrainingMode)
            {
                aiHealth = 9999f; // Immortal target dummy
                playerHealth = 500f;
            }
        }

        public void GenerateNewWind()
        {
            float limit = 15.0f; // High variable canyon wind
            float wx = Random.Range(-limit, limit);
            float wy = Random.Range(-0.3f * limit, 0.3f * limit);
            currentWind = new Vector3(wx, wy, 0f);
            OnStateChanged?.Invoke();
        }

        public void ApplySkillCooldowns()
        {
            if (activeShieldSkill.currentCooldown > 0) activeShieldSkill.currentCooldown--;
            if (activeDoubleDamageSkill.currentCooldown > 0) activeDoubleDamageSkill.currentCooldown--;
            OnStateChanged?.Invoke();
        }

        public void ApplyDamage(bool targetIsAI, float baseDamage, bool isHeadshot)
        {
            float multiplier = isHeadshot ? currentWeapon.headshotMultiplier : 1.0f;
            float damage = baseDamage * multiplier;

            if (nextShotDoubleDamage)
            {
                damage *= activeDoubleDamageSkill.damageMultiplier;
                nextShotDoubleDamage = false;
            }

            if (targetIsAI)
            {
                if (aiShieldActive)
                {
                    damage *= activeShieldSkill.damageReductionMultiplier;
                    aiShieldActive = false;
                }
                aiHealth = Mathf.Max(0, aiHealth - damage);
                Debug.Log($"AI hit for {damage} damage. HP left: {aiHealth}");
            }
            else
            {
                if (playerShieldActive)
                {
                    damage *= activeShieldSkill.damageReductionMultiplier;
                    playerShieldActive = false;
                }
                playerHealth = Mathf.Max(0, playerHealth - damage);
                Debug.Log($"Player hit for {damage} damage. HP left: {playerHealth}");
            }

            SettingsManager.TriggerVibration();
            OnStateChanged?.Invoke();
        }
    }
}
