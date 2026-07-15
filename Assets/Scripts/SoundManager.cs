using UnityEngine;

namespace WTM.Core
{
    public class SoundManager : MonoBehaviour
    {
        public static SoundManager Instance { get; private set; }

        private AudioSource audioSource;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                audioSource = gameObject.AddComponent<AudioSource>();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void PlaySound(AudioClip clip, float volume = 1.0f)
        {
            if (clip != null && SettingsManager.SoundEnabled)
            {
                audioSource.PlayOneShot(clip, volume);
            }
        }

        public void PlayTone(float frequency, float duration, float volume = 0.5f)
        {
            if (!SettingsManager.SoundEnabled) return;

            // Generate a simple procedural synth note so we don't rely on loaded audio assets
            GameObject synth = new GameObject("ProceduralTone");
            AudioSource source = synth.AddComponent<AudioSource>();
            source.clip = CreateSineWaveClip(frequency, duration);
            source.volume = volume;
            source.Play();
            Destroy(synth, duration + 0.1f);
        }

        private AudioClip CreateSineWaveClip(float frequency, float duration)
        {
            int sampleRate = 44100;
            int samplesCount = (int)(sampleRate * duration);
            float[] data = new float[samplesCount];

            for (int i = 0; i < samplesCount; i++)
            {
                data[i] = Mathf.Sin(2 * Mathf.PI * frequency * i / sampleRate);
            }

            AudioClip clip = AudioClip.Create("SineWave", samplesCount, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
