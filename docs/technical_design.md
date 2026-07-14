# War Trajectory Mobile (WTM) - Technical Design Document (TDD)

This document details the game's architecture, network implementation, and physics integration for Unity 3D using C# and Photon Fusion.

---

## 1. Network Topology: Client-Side Prediction & Server Reconciliation

For PvP matches, WTM uses a server-authoritative model with Photon Fusion to prevent cheating, such as unauthorized damage modifications or trajectory manipulation.

```
       [Client A (Local)]                       [Server]                         [Client B]
               |                                   |                                  |
     [Input: Pull & Shoot]                         |                                  |
               |                                   |                                  |
   (Predicts local flight path)                    |                                  |
               |--- Send NetworkInput ------------>|                                  |
               |                               [Simulates]                            |
               |                               [Determines Hit]                       |
               |<-- Broadcast State Sync -----------|--------------------------------->|
               |                                   |                           (Renders Result)
         [Reconciles]                              |                                  |
```

### 1.1 High-Fidelity Physics Synchronization
Because wind, gravity, and angles require precise synchronization across clients, physics simulations run entirely inside Photon Fusion's `FixedUpdateNetwork` tick loop.
*   **Predictive Simulation:** The shooting client predicts and renders the projectile's movement locally in real-time, providing immediate visual feedback.
*   **State Updates:** Every network tick, the server broadcasts the authoritative position and velocity vectors.
*   **Reconciliation:** If the client's local prediction drifts from the server's state by more than a minor threshold ($\epsilon \ge 0.05 \text{ meters}$), the client snaps the projectile to the server's coordinates and recalculates the trajectory.

---

## 2. Server-Authoritative Ballistics & Physics Controller (C# Template)

Below is the complete C# implementation for the network-synchronized projectile physics controller in Unity.

```csharp
using UnityEngine;
using Fusion;

namespace WTM.Physics
{
    [RequireComponent(typeof(NetworkTransform))]
    public class NetworkProjectile : NetworkBehaviour
    {
        [Header("Projectile Custom Properties")]
        [SerializeField] private float weightKg = 1.0f;
        [SerializeField] private float windSensitivity = 1.0f;
        [SerializeField] private float dragCoefficient = 0.005f;
        [SerializeField] private float explosionRadius = 3.5f;
        [SerializeField] private float baseDamage = 100f;
        [SerializeField] private GameObject explosionVfxPrefab;

        [Networked] private Vector3 NetworkedVelocity { get; set; }
        [Networked] private NetworkBool HasExploded { get; set; }

        private const float GravityConstant = -9.81f;

        public void InitializeProjectile(Vector3 launchVelocity)
        {
            if (Object.HasStateAuthority)
            {
                NetworkedVelocity = launchVelocity;
                HasExploded = false;
            }
        }

        public override void FixedUpdateNetwork()
        {
            if (HasExploded) return;

            // Retrieve the active turn's wind vector from the server manager
            Vector3 activeWind = NetworkWindManager.Instance != null
                ? NetworkWindManager.Instance.GetActiveWindVector()
                : Vector3.zero;

            // Calculate Ballistic Forces
            Vector3 gravityForce = new Vector3(0, GravityConstant * weightKg, 0);

            // Drag Force: -0.5 * Cd * VelocityMagnitude * VelocityVector
            Vector3 dragForce = -0.5f * dragCoefficient * NetworkedVelocity.magnitude * NetworkedVelocity;

            // Wind Drift Force: Sw * (WindVector - VelocityVector)
            Vector3 windDriftForce = windSensitivity * (activeWind - NetworkedVelocity);

            // Net Acceleration: F_net / Mass
            Vector3 netAcceleration = (gravityForce + dragForce + windDriftForce) / weightKg;

            // Update Position and Velocity deterministically across ticks
            transform.position += NetworkedVelocity * Runner.DeltaTime;
            NetworkedVelocity += netAcceleration * Runner.DeltaTime;

            // Check for impacts on the server
            if (Object.HasStateAuthority)
            {
                CheckForCollision();
            }
        }

        private void CheckForCollision()
        {
            // Simple overlap sphere cast matching the projectile radius
            Collider[] hitColliders = UnityEngine.Physics.OverlapSphere(transform.position, 0.15f);
            if (hitColliders.Length > 0)
            {
                // Ensure we don't collide with triggers or ourselves
                foreach (var hit in hitColliders)
                {
                    if (hit.isTrigger || hit.gameObject == this.gameObject) continue;

                    TriggerExplosion(transform.position);
                    break;
                }
            }
        }

        private void TriggerExplosion(Vector3 point)
        {
            HasExploded = true;

            // Spawn explosion particles on all clients
            if (explosionVfxPrefab != null)
            {
                Runner.Spawn(explosionVfxPrefab, point, Quaternion.identity);
            }

            // Apply explosion force and damage
            Collider[] victims = UnityEngine.Physics.OverlapSphere(point, explosionRadius);
            foreach (var victim in victims)
            {
                // Calculate damage drop-off based on distance
                float distance = Vector3.Distance(point, victim.transform.position);
                float damageProportion = Mathf.Clamp01(1f - (distance / explosionRadius));
                float finalDamage = baseDamage * damageProportion;

                var healthComponent = victim.GetComponent<NetworkPlayerHealth>();
                if (healthComponent != null)
                {
                    healthComponent.ApplyDamage(finalDamage, victim.transform.position - point);
                }
            }

            // Despawn projectile on the server
            Runner.Despawn(Object);
        }
    }
}
```

---

## 3. Network Player Health & Hitbox Resolution

To support localized head, body, and limb damage, character hitboxes are broken down into distinct layers.

```csharp
using UnityEngine;
using Fusion;

namespace WTM.Physics
{
    public class NetworkPlayerHealth : NetworkBehaviour
    {
        public enum HitboxType { Head, Body, Limbs }

        [Networked] public float CurrentHealth { get; set; } = 500f;
        [Networked] public NetworkBool IsDead { get; set; }

        [SerializeField] private float headshotMultiplier = 2.5f;
        [SerializeField] private float limbMultiplier = 0.6f;

        [Rpc(RpcSources.StateAuthority, RpcTargets.All)]
        public void RPC_PlayHitVFX(Vector3 forceVector)
        {
            // Instantiates blood or impact sparks and triggers the dynamic hit reaction animation
        }

        public void ApplyDamage(float rawDamage, Vector3 explosionForceVector)
        {
            if (!Object.HasStateAuthority || IsDead) return;

            CurrentHealth -= rawDamage;
            if (CurrentHealth <= 0)
            {
                CurrentHealth = 0;
                IsDead = true;
                TriggerRagdoll();
            }
        }

        public void RegisterHitboxStrike(HitboxType type, float projectileBaseDamage)
        {
            if (!Object.HasStateAuthority) return;

            float calculatedDamage = projectileBaseDamage;
            switch (type)
            {
                case HitboxType.Head:
                    calculatedDamage *= headshotMultiplier;
                    break;
                case HitboxType.Limbs:
                    calculatedDamage *= limbMultiplier;
                    break;
                case HitboxType.Body:
                    // Base damage is applied directly
                    break;
            }

            ApplyDamage(calculatedDamage, Vector3.zero);
        }

        private void TriggerRagdoll()
        {
            // Disables the Animator component and enables active rigidbodies on bone transforms
        }
    }
}
```
