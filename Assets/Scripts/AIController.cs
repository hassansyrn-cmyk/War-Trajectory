using UnityEngine;

namespace WTM.Core
{
    public class AIController : MonoBehaviour
    {
        public Transform targetTransform;

        [Header("Aiming Performance")]
        public float perfectSpeed = 22f;

        public void PerformTurn()
        {
            if (GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress) return;

            // Perform simple automatic physics calculation with random slight error
            Vector3 diff = targetTransform.position - transform.position;

            // Build simple elevated arc aiming towards the player target
            float targetX = diff.x;
            float targetY = diff.y + 1f;

            // Estimate launch velocities using simple parabolic math
            float g = 9.81f;
            float angleRad = 45f * Mathf.Deg2Rad; // standard arch lobbing

            if (targetX < 0)
            {
                // Mirror angle
                angleRad = 135f * Mathf.Deg2Rad;
            }

            // Simple lob formula: launch speed estimation v^2 = (g * x^2) / (x*sin(2a) - 2y*cos^2(a))
            float term = targetX * Mathf.Sin(2f * angleRad) - 2f * targetY * Mathf.Cos(angleRad) * Mathf.Cos(angleRad);
            float speed = perfectSpeed;

            if (term > 0.05f)
            {
                float calculatedSpeed = Mathf.Sqrt((g * targetX * targetX) / term);
                if (!float.IsNaN(calculatedSpeed) && calculatedSpeed > 2f)
                {
                    speed = Mathf.Clamp(calculatedSpeed, 10f, 32f);
                }
            }

            // Introduce simple error deviation based on dynamic canyons wind
            Vector3 activeWind = GameManager.Instance.currentWind;
            float horizontalOffset = activeWind.x * 0.15f; // offset speed depending on wind speed
            speed -= horizontalOffset * Mathf.Sign(targetX);

            // Add standard AI variance
            speed += Random.Range(-1.5f, 1.5f);

            Vector3 finalVelocity = new Vector3(Mathf.Cos(angleRad), Mathf.Sin(angleRad), 0) * speed;

            // Trigger firing
            TurnManager.Instance.FireProjectile(transform.position + Vector3.up, finalVelocity, false);
        }
    }
}
