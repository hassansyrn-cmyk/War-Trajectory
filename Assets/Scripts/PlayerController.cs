using UnityEngine;
using UnityEngine.InputSystem;

namespace WTM.Core
{
    public class PlayerController : MonoBehaviour
    {
        public static PlayerController Instance { get; private set; }

        private WTMInputActions inputActions;
        private bool isDragging = false;
        private Vector2 dragStartPos;
        private Vector2 dragCurrentPos;

        [Header("Aim Settings")]
        public float maxDragDistance = 200f;
        public float maxLaunchVelocity = 30f;

        private void Awake()
        {
            Instance = this;
            inputActions = new WTMInputActions();
        }

        private void OnEnable()
        {
            inputActions.Gameplay.Enable();
            inputActions.Gameplay.TouchPress.started += OnTouchStart;
            inputActions.Gameplay.TouchPress.canceled += OnTouchEnd;
        }

        private void OnDisable()
        {
            inputActions.Gameplay.TouchPress.started -= OnTouchStart;
            inputActions.Gameplay.TouchPress.canceled -= OnTouchEnd;
            inputActions.Gameplay.Disable();
        }

        private void Update()
        {
            // Process camera keyboard pans
            Vector2 camPan = inputActions.Gameplay.CameraPan.ReadValue<Vector2>();
            if (CameraController.Instance != null)
            {
                CameraController.Instance.ApplyPan(camPan);
            }

            if (!GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress)
            {
                if (isDragging) CancelAimDrag();
                return;
            }

            if (isDragging)
            {
                dragCurrentPos = inputActions.Gameplay.TouchPosition.ReadValue<Vector2>();
                UpdateAimingPreview();
            }
        }

        private void OnTouchStart(InputAction.CallbackContext context)
        {
            if (!GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress) return;

            // Reject touch starting in bottom Action Deck zone to prevent firing when pressing UI buttons
            Vector2 touchStart = inputActions.Gameplay.TouchPosition.ReadValue<Vector2>();
            if (touchStart.y < Screen.height * 0.22f) return;

            isDragging = true;
            dragStartPos = touchStart;
            dragCurrentPos = dragStartPos;
        }

        private void OnTouchEnd(InputAction.CallbackContext context)
        {
            if (!isDragging) return;
            isDragging = false;

            Vector2 pullVec = dragStartPos - dragCurrentPos;
            float dragDist = Mathf.Min(pullVec.magnitude, maxDragDistance);
            float pct = dragDist / maxDragDistance;

            if (pct >= 0.05f)
            {
                Vector3 launchVel = CalculateLaunchVelocity(pullVec.normalized, pct);
                TurnManager.Instance.FireProjectile(transform.position + Vector3.up, launchVel, true);
            }

            CancelAimDrag();
        }

        private void CancelAimDrag()
        {
            isDragging = false;
            if (TrajectoryPreview.Instance != null)
            {
                TrajectoryPreview.Instance.HidePreview();
            }
        }

        private void UpdateAimingPreview()
        {
            Vector2 pullVec = dragStartPos - dragCurrentPos;
            float dragDist = Mathf.Min(pullVec.magnitude, maxDragDistance);
            float pct = dragDist / maxDragDistance;

            if (pct >= 0.05f)
            {
                Vector3 launchVel = CalculateLaunchVelocity(pullVec.normalized, pct);
                float weightMult = GameManager.Instance.nextShotDoubleDamage ? GameManager.Instance.activeDoubleDamageSkill.weightMultiplier : 1.0f;

                if (TrajectoryPreview.Instance != null)
                {
                    TrajectoryPreview.Instance.ShowPreview(transform.position + Vector3.up, launchVel, GameManager.Instance.currentWeapon, weightMult);
                }
            }
            else
            {
                if (TrajectoryPreview.Instance != null)
                {
                    TrajectoryPreview.Instance.HidePreview();
                }
            }
        }

        private Vector3 CalculateLaunchVelocity(Vector2 dir, float forcePct)
        {
            float mag = forcePct * maxLaunchVelocity;
            return new Vector3(dir.x, dir.y, 0f) * mag;
        }
    }
}
