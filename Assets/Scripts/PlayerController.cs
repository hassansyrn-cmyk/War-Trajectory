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
        }

        private void OnDisable()
        {
            inputActions.Gameplay.Disable();
        }

        private void Update()
        {
            // Process camera keyboard pans
            Vector2 camPan = inputActions.Gameplay.CameraPan.ReadValue();
            if (CameraController.Instance != null)
            {
                CameraController.Instance.ApplyPan(camPan);
            }

            if (!GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress)
            {
                if (isDragging) CancelAimDrag();
                return;
            }

            // Handle touch initiation manually to bypass event subscriptions in the wrapper
            bool isPressing = false;
            Vector2 currentTouchPos = Vector2.zero;

            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.isPressed)
            {
                isPressing = true;
                currentTouchPos = Touchscreen.current.primaryTouch.position.ReadValue();
            }
            else if (Mouse.current != null && Mouse.current.leftButton.isPressed)
            {
                isPressing = true;
                currentTouchPos = Mouse.current.position.ReadValue();
            }

            if (isPressing)
            {
                if (!isDragging)
                {
                    // Touch started
                    if (currentTouchPos.y >= Screen.height * 0.22f)
                    {
                        isDragging = true;
                        dragStartPos = currentTouchPos;
                        dragCurrentPos = dragStartPos;
                    }
                }
                else
                {
                    // Touch dragging
                    dragCurrentPos = currentTouchPos;
                    UpdateAimingPreview();
                }
            }
            else
            {
                if (isDragging)
                {
                    // Touch released
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
            }
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
