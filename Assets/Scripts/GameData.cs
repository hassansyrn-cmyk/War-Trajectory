using System;
using UnityEngine;

namespace WTM.Core
{
    [Serializable]
    public class WeaponData
    {
        public string weaponName;
        public float baseDamage;
        public float headshotMultiplier;
        public float weightKg;
        public float windSensitivity;
        public float dragCoefficient;
        public float explosionRadius;
        public Color projectileColor;
    }

    [Serializable]
    public class SkillData
    {
        public string skillName;
        public string description;
        public int cooldownTurns;
        public int currentCooldown;
        public float damageMultiplier = 1.0f;
        public float damageReductionMultiplier = 1.0f;
        public float weightMultiplier = 1.0f;
    }
}
