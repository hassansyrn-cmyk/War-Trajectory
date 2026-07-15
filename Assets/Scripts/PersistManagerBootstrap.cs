using UnityEngine;

namespace WTM.Core
{
    public class PersistManagerBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            // Set up sound manager automatically if it doesn't exist
            if (SoundManager.Instance == null)
            {
                GameObject sm = new GameObject("SoundManager");
                sm.AddComponent<SoundManager>();
            }

            // Create global persistent GameManager
            if (GameManager.Instance == null)
            {
                GameObject gm = new GameObject("GameManager");
                gm.AddComponent<GameManager>();
                DontDestroyOnLoad(gm);
            }
        }
    }
}
