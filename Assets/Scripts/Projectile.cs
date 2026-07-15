using UnityEngine;

namespace WTM.Core
{
    public class Projectile : MonoBehaviour
    {
        private Vector3 velocity;
        private WeaponData weaponData;
        private float weightMultiplier;
        private bool isPlayerOwned;
        private bool hasCollided = false;

        private const float GravityConstant = -9.81f;

        public void Initialize(Vector3 initialVelocity, WeaponData data, float weightMult, bool isPlayer)
        {
            velocity = initialVelocity;
            weaponData = data;
            weightMultiplier = weightMult;
            isPlayerOwned = isPlayer;

            // Set visual size and color based on weapon
            GetComponent<Renderer>().material.color = data.projectileColor;
            transform.localScale = Vector3.one * (data.explosionRadius * 0.35f);
        }

        private void FixedUpdate()
        {
            if (hasCollided) return;

            // Gather wind vector
            Vector3 activeWind = GameManager.Instance != null ? GameManager.Instance.currentWind : Vector3.zero;

            float effectiveMass = weaponData.weightKg * weightMultiplier;

            // Drag: -0.5 * Cd * Speed * Velocity
            Vector3 dragForce = -0.5f * weaponData.dragCoefficient * velocity.magnitude * velocity;

            // Wind Drift: Sw * (Wind - Velocity)
            Vector3 windForce = weaponData.windSensitivity * (activeWind - velocity);

            // Gravity: Mass * g
            Vector3 gravityForce = new Vector3(0, GravityConstant * effectiveMass, 0);

            // Total force / Mass
            Vector3 acceleration = (gravityForce + dragForce + windForce) / effectiveMass;

            // Update state
            transform.position += velocity * Time.fixedDeltaTime;
            velocity += acceleration * Time.fixedDeltaTime;

            // Safety limit to destroy projectile if falls off map completely
            if (transform.position.y < -20f || transform.position.magnitude > 100f)
            {
                Destroy(gameObject);
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (hasCollided) return;

            // Avoid triggering collision with other triggers or backfire instantly with own team
            if (other.isTrigger) return;

            TriggerCollision(transform.position);
        }

        private void TriggerCollision(Vector3 point)
        {
            hasCollided = true;

            // Produce audio explosion
            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayTone(120f, 0.4f, 0.6f);
            }

            // Create placeholder explosion visual
            GameObject explo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            explo.transform.position = point;
            explo.transform.localScale = Vector3.one * weaponData.explosionRadius;
            explo.GetComponent<Renderer>().material.color = new Color(1.0f, 0.5f, 0f, 0.7f);
            Destroy(explo.GetComponent<Collider>()); // Avoid nested physics triggers
            Destroy(explo, 0.5f);

            // Query hits
            Collider[] hits = Physics.OverlapSphere(point, weaponData.explosionRadius);
            foreach (var h in hits)
            {
                if (h.CompareTag("Player") || h.CompareTag("AI"))
                {
                    bool isTargetAI = h.CompareTag("AI");

                    // Don't inflict friendly damage if not needed, but keep it tactical
                    float dist = Vector3.Distance(point, h.transform.position);
                    float proportion = Mathf.Clamp01(1f - (dist / weaponData.explosionRadius));

                    // Detect if headshot (hit upper half of the model)
                    bool isHeadshot = false;
                    CapsuleCollider cap = h as CapsuleCollider;
                    if (cap != null)
                    {
                        float localHitY = h.transform.InverseTransformPoint(point).y;
                        if (localHitY > cap.height * 0.15f) // Upper region
                        {
                            isHeadshot = true;
                        }
                    }

                    GameManager.Instance.ApplyDamage(isTargetAI, weaponData.baseDamage * proportion, isHeadshot);
                }
                else if (h.CompareTag("Terrain"))
                {
                    // Destructible environment: modify local terrain transforms or heights
                    h.transform.localScale = new Vector3(h.transform.localScale.x, Mathf.Max(0.1f, h.transform.localScale.y - 0.5f), h.transform.localScale.z);
                }
            }

            Destroy(gameObject);
        }
    }
}
