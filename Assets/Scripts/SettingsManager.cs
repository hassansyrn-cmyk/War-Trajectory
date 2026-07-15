using UnityEngine;

namespace WTM.Core
{
    public static class SettingsManager
    {
        private const string SoundKey = "WTM_SoundEnabled";
        private const string VibrationKey = "WTM_VibrationEnabled";

        public static bool SoundEnabled
        {
            get => PlayerPrefs.GetInt(SoundKey, 1) == 1;
            set
            {
                PlayerPrefs.SetInt(SoundKey, value ? 1 : 0);
                PlayerPrefs.Save();
            }
        }

        public static bool VibrationEnabled
        {
            get => PlayerPrefs.GetInt(VibrationKey, 1) == 1;
            set
            {
                PlayerPrefs.SetInt(VibrationKey, value ? 1 : 0);
                PlayerPrefs.Save();
            }
        }

        public static void TriggerVibration()
        {
            if (VibrationEnabled)
            {
#if UNITY_ANDROID && !UNITY_EDITOR
                try
                {
                    using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                    using (AndroidJavaObject currentActivity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity"))
                    using (AndroidJavaObject vibrator = currentActivity.Call<AndroidJavaObject>("getSystemService", "vibrator"))
                    {
                        if (vibrator != null)
                        {
                            vibrator.Call("vibrate", 100L);
                        }
                    }
                }
                catch (System.Exception ex)
                {
                    Debug.LogWarning("Vibration exception: " + ex.Message);
                }
#else
                Debug.Log("[VIBRATE] haptic feedback triggered");
#endif
            }
        }
    }
}
