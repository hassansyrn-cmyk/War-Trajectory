using System.Collections.Generic;
using UnityEngine;

namespace WTM.Core
{
    public class TrajectoryPreview : MonoBehaviour
    {
        public static TrajectoryPreview Instance { get; private set; }

        private LineRenderer lineRenderer;
        private const int MaxSteps = 30;
        private const float TimeStep = 0.08f;

        private void Awake()
        {
            Instance = this;
            lineRenderer = gameObject.AddComponent<LineRenderer>();
            lineRenderer.startWidth = 0.08f;
            lineRenderer.endWidth = 0.02f;
            lineRenderer.material = new Material(Shader.Find("Sprites/Default"));
            lineRenderer.startColor = new Color(1f, 1f, 1f, 0.6f);
            lineRenderer.endColor = new Color(1f, 1f, 1f, 0.1f);
            lineRenderer.positionCount = 0;
        }

        public void ShowPreview(Vector3 origin, Vector3 initialVelocity, WeaponData weaponData, float weightMult)
        {
            lineRenderer.enabled = true;
            List<Vector3> points = new List<Vector3>();

            Vector3 currentPos = origin;
            Vector3 currentVel = initialVelocity;
            Vector3 activeWind = GameManager.Instance != null ? GameManager.Instance.currentWind : Vector3.zero;
            float effectiveMass = weaponData.weightKg * weightMult;

            points.Add(currentPos);

            for (int i = 0; i < MaxSteps; i++)
            {
                // Simple Euler integration matching Projectile fixed update loop
                Vector3 dragForce = -0.5f * weaponData.dragCoefficient * currentVel.magnitude * currentVel;
                Vector3 windForce = weaponData.windSensitivity * (activeWind - currentVel);
                Vector3 gravityForce = new Vector3(0, -9.81f * effectiveMass, 0);

                Vector3 accel = (gravityForce + dragForce + windForce) / effectiveMass;

                currentPos += currentVel * TimeStep;
                currentVel += accel * TimeStep;

                points.Add(currentPos);

                // Stop trajectory if hitting baseline height
                if (currentPos.y < -5f) break;
            }

            lineRenderer.positionCount = points.Count;
            lineRenderer.SetPositions(points.ToArray());
        }

        public void HidePreview()
        {
            lineRenderer.enabled = false;
        }
    }
}
