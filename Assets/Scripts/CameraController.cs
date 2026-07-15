using UnityEngine;

namespace WTM.Core
{
    public class CameraController : MonoBehaviour
    {
        public static CameraController Instance { get; private set; }

        private Transform target;
        public float followSpeed = 5.0f;
        public Vector3 offset = new Vector3(0, 2, -15);

        private Vector2 keyboardPan;
        private Vector3 manualOffset;

        private void Awake()
        {
            Instance = this;
        }

        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
            manualOffset = Vector3.zero;
        }

        public void ApplyPan(Vector2 input)
        {
            keyboardPan = input;
        }

        private void LateUpdate()
        {
            // If we have manual WASD/Arrow input, adjust manual offset
            if (keyboardPan.magnitude > 0.05f)
            {
                manualOffset += new Vector3(keyboardPan.x, keyboardPan.y, 0) * Time.deltaTime * 15f;
            }

            if (target != null)
            {
                Vector3 desiredPos = target.position + offset + manualOffset;
                // Clamp horizontal/vertical to keep within map boundaries
                desiredPos.x = Mathf.Clamp(desiredPos.x, -35f, 35f);
                desiredPos.y = Mathf.Clamp(desiredPos.y, -10f, 30f);
                desiredPos.z = -15f;

                transform.position = Vector3.Lerp(transform.position, desiredPos, Time.deltaTime * followSpeed);
            }
        }
    }
}
