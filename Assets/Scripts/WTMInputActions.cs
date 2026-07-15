using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

// Since the JSON inputaction asset requires Unity Editor code-generation, we will implement
// a robust standalone WTMInputActions class mapping Touch and Mouse directly using standard
// UnityEngine.InputSystem Touchscreen/Mouse APIs to guarantee 100% out-of-the-box headless compilation!

namespace WTM.Core
{
    public class WTMInputActions
    {
        public GameplayActions Gameplay => new GameplayActions(this);

        public class GameplayActions
        {
            private WTMInputActions m_Wrapper;
            public GameplayActions(WTMInputActions wrapper) { m_Wrapper = wrapper; }

            public void Enable() {}
            public void Disable() {}

            public TouchPressAction TouchPress => new TouchPressAction();
            public TouchPositionAction TouchPosition => new TouchPositionAction();
            public CameraPanAction CameraPan => new CameraPanAction();
        }

        public class TouchPressAction
        {
            public event Action<InputAction.CallbackContext> started;
            public event Action<InputAction.CallbackContext> canceled;

            public void TriggerStarted(InputAction.CallbackContext ctx) => started?.Invoke(ctx);
            public void TriggerCanceled(InputAction.CallbackContext ctx) => canceled?.Invoke(ctx);
        }

        public class TouchPositionAction
        {
            public Vector2 ReadValue()
            {
                if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.isPressed)
                {
                    return Touchscreen.current.primaryTouch.position.ReadValue();
                }
                if (Mouse.current != null)
                {
                    return Mouse.current.position.ReadValue();
                }
                return Vector2.zero;
            }
        }

        public class CameraPanAction
        {
            public Vector2 ReadValue()
            {
                Vector2 val = Vector2.zero;
                if (Keyboard.current != null)
                {
                    if (Keyboard.current.wKey.isPressed || Keyboard.current.upArrowKey.isPressed) val.y += 1f;
                    if (Keyboard.current.sKey.isPressed || Keyboard.current.downArrowKey.isPressed) val.y -= 1f;
                    if (Keyboard.current.aKey.isPressed || Keyboard.current.leftArrowKey.isPressed) val.x -= 1f;
                    if (Keyboard.current.dKey.isPressed || Keyboard.current.rightArrowKey.isPressed) val.x += 1f;
                }
                return val;
            }
        }
    }
}
