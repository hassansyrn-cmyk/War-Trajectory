using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WTM.Core
{
    public class TurnManager : MonoBehaviour
    {
        public static TurnManager Instance { get; private set; }

        public Transform playerTransform;
        public Transform aiTransform;

        [Header("Prefabs")]
        public GameObject projectilePrefab;

        public bool IsActionInProgress { get; private set; } = false;

        private void Awake()
        {
            Instance = this;
        }

        public void FireProjectile(Vector3 origin, Vector3 velocity, bool isPlayer)
        {
            if (IsActionInProgress) return;
            StartCoroutine(FireSequence(origin, velocity, isPlayer));
        }

        private IEnumerator FireSequence(Vector3 origin, Vector3 velocity, bool isPlayer)
        {
            IsActionInProgress = true;

            // Apply weapon weight adjustments if double damage is active
            float weightModifier = 1.0f;
            if (isPlayer && GameManager.Instance.nextShotDoubleDamage)
            {
                weightModifier = GameManager.Instance.activeDoubleDamageSkill.weightMultiplier;
            }

            // Play procedural firing synth sound
            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayTone(350f, 0.25f, 0.4f);
            }

            // Spawn projectile
            GameObject projObj = Instantiate(projectilePrefab, origin, Quaternion.identity);
            Projectile projectile = projObj.GetComponent<Projectile>();

            WeaponData activeWp = GameManager.Instance.currentWeapon;
            projectile.Initialize(velocity, activeWp, weightModifier, isPlayer);

            // Let camera track projectile
            CameraController.Instance.SetTarget(projObj.transform);

            // Wait until projectile is destroyed or finishes
            while (projObj != null)
            {
                yield return null;
            }

            // Bring camera back to next player
            IsActionInProgress = false;

            if (CheckEndConditions())
            {
                yield break;
            }

            // Handover turns
            if (isPlayer)
            {
                if (GameManager.Instance.isTrainingMode)
                {
                    // In training, we reset player turn directly
                    GameManager.Instance.isPlayerTurn = true;
                    GameManager.Instance.GenerateNewWind();
                    GameManager.Instance.ApplySkillCooldowns();
                    CameraController.Instance.SetTarget(playerTransform);
                    GameManager.Instance.OnStateChanged?.Invoke();
                }
                else
                {
                    // Transition to AI turn
                    GameManager.Instance.isPlayerTurn = false;
                    GameManager.Instance.GenerateNewWind();
                    CameraController.Instance.SetTarget(aiTransform);
                    GameManager.Instance.OnStateChanged?.Invoke();

                    // Trigger AI decision after a small delay
                    yield return new WaitForSeconds(1.5f);
                    TriggerAIDecision();
                }
            }
            else
            {
                // Transition to Player turn
                GameManager.Instance.isPlayerTurn = true;
                GameManager.Instance.GenerateNewWind();
                GameManager.Instance.ApplySkillCooldowns();
                CameraController.Instance.SetTarget(playerTransform);
                GameManager.Instance.OnStateChanged?.Invoke();
            }
        }

        private void TriggerAIDecision()
        {
            AIController ai = aiTransform.GetComponent<AIController>();
            if (ai != null)
            {
                ai.PerformTurn();
            }
        }

        public bool CheckEndConditions()
        {
            if (GameManager.Instance.playerHealth <= 0)
            {
                // Player lost
                Bootstrap.Instance.ShowEndGameScreen(false);
                return true;
            }
            else if (!GameManager.Instance.isTrainingMode && GameManager.Instance.aiHealth <= 0)
            {
                // Player won
                Bootstrap.Instance.ShowEndGameScreen(true);
                return true;
            }
            return false;
        }
    }
}
