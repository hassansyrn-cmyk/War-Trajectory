using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;

namespace WTM.Core
{
    public class MainMenuController : MonoBehaviour
    {
        private Color skyColor = new Color(0.12f, 0.12f, 0.16f); // dark blue/gray modern color scheme

        private void Awake()
        {
            SetupCamera();
            BuildMenuUI();
        }

        private void SetupCamera()
        {
            Camera mainCam = Camera.main;
            if (mainCam == null)
            {
                GameObject camObj = new GameObject("MainCamera");
                camObj.tag = "MainCamera";
                mainCam = camObj.AddComponent<Camera>();
            }

            mainCam.clearFlags = CameraClearFlags.SolidColor;
            mainCam.backgroundColor = skyColor;
        }

        private void BuildMenuUI()
        {
            // Build the main menu canvas system
            GameObject canvObj = new GameObject("MainMenuCanvas");
            Canvas canvas = canvObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvObj.AddComponent<GraphicRaycaster>();

            // Main Title text
            GameObject titleObj = new GameObject("GameTitle");
            titleObj.transform.SetParent(canvObj.transform, false);
            RectTransform titleRt = titleObj.AddComponent<RectTransform>();
            titleRt.anchorMin = new Vector2(0.5f, 0.75f);
            titleRt.anchorMax = new Vector2(0.5f, 0.75f);
            titleRt.anchoredPosition = Vector2.zero;
            titleRt.sizeDelta = new Vector2(600, 80);

            TMP_Text titleText = titleObj.AddComponent<TextMeshProUGUI>();
            titleText.text = "WAR TRAJECTORY\nMOBILE";
            titleText.fontSize = 32;
            titleText.fontStyle = FontStyles.Bold;
            titleText.alignment = TextAlignmentOptions.Center;
            titleText.color = Color.yellow;

            // Subtitle description
            GameObject subtitleObj = new GameObject("Subtitle");
            subtitleObj.transform.SetParent(canvObj.transform, false);
            RectTransform subtitleRt = subtitleObj.AddComponent<RectTransform>();
            subtitleRt.anchorMin = new Vector2(0.5f, 0.60f);
            subtitleRt.anchorMax = new Vector2(0.5f, 0.60f);
            subtitleRt.anchoredPosition = Vector2.zero;
            subtitleRt.sizeDelta = new Vector2(500, 40);

            TMP_Text subText = subtitleObj.AddComponent<TextMeshProUGUI>();
            subText.text = "Competitive 1v1 Physics Tactics MVP Prototype";
            subText.fontSize = 14;
            subText.alignment = TextAlignmentOptions.Center;
            subText.color = Color.gray;

            // 1. Play Button: Player vs AI
            GameObject playBtnObj = CreateButton("PlayBtn", canvObj.transform, "PLAY VS AI", () => StartGame(false));
            SetRect(playBtnObj, new Vector2(0.5f, 0.42f), new Vector2(0.5f, 0.42f), Vector2.zero, new Vector2(250, 45));

            // 2. Training Mode Button
            GameObject trainBtnObj = CreateButton("TrainingBtn", canvObj.transform, "TRAINING MODE", () => StartGame(true));
            SetRect(trainBtnObj, new Vector2(0.5f, 0.30f), new Vector2(0.5f, 0.30f), Vector2.zero, new Vector2(250, 45));

            // Sound and Vibration toggles
            GameObject settingsPanel = new GameObject("SettingsPanel");
            settingsPanel.transform.SetParent(canvObj.transform, false);
            RectTransform settingsPanelRt = settingsPanel.AddComponent<RectTransform>();
            settingsPanelRt.anchorMin = new Vector2(0.5f, 0.15f);
            settingsPanelRt.anchorMax = new Vector2(0.5f, 0.15f);
            settingsPanelRt.anchoredPosition = Vector2.zero;
            settingsPanelRt.sizeDelta = new Vector2(400, 40);

            GameObject sBtnObj = CreateButton("SoundBtn", settingsPanel.transform, "Sound: ON", null);
            SetRect(sBtnObj, new Vector2(0.25f, 0.5f), new Vector2(0.25f, 0.5f), Vector2.zero, new Vector2(140, 35));
            TMP_Text sBtnTxt = sBtnObj.transform.GetChild(0).GetComponent<TMP_Text>();
            sBtnTxt.text = SettingsManager.SoundEnabled ? "Sound: ON" : "Sound: OFF";
            sBtnObj.GetComponent<Button>().onClick.AddListener(() =>
            {
                SettingsManager.SoundEnabled = !SettingsManager.SoundEnabled;
                sBtnTxt.text = SettingsManager.SoundEnabled ? "Sound: ON" : "Sound: OFF";
                if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(440f, 0.1f);
            });

            GameObject vBtnObj = CreateButton("VibrateBtn", settingsPanel.transform, "Vibration: ON", null);
            SetRect(vBtnObj, new Vector2(0.75f, 0.5f), new Vector2(0.75f, 0.5f), Vector2.zero, new Vector2(140, 35));
            TMP_Text vBtnTxt = vBtnObj.transform.GetChild(0).GetComponent<TMP_Text>();
            vBtnTxt.text = SettingsManager.VibrationEnabled ? "Vibration: ON" : "Vibration: OFF";
            vBtnObj.GetComponent<Button>().onClick.AddListener(() =>
            {
                SettingsManager.VibrationEnabled = !SettingsManager.VibrationEnabled;
                vBtnTxt.text = SettingsManager.VibrationEnabled ? "Vibration: ON" : "Vibration: OFF";
                SettingsManager.TriggerVibration();
            });
        }

        private void StartGame(bool isTraining)
        {
            PlayerPrefs.SetInt("WTM_TrainingMode", isTraining ? 1 : 0);
            PlayerPrefs.Save();

            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(500f, 0.15f);
            SceneManager.LoadScene("Game");
        }

        private GameObject CreateButton(string name, Transform parent, string label, System.Action onClickAction)
        {
            GameObject btnObj = new GameObject(name);
            btnObj.AddComponent<RectTransform>();
            btnObj.transform.SetParent(parent, false);

            Image img = btnObj.AddComponent<Image>();
            img.color = new Color(0.18f, 0.20f, 0.24f, 1f);

            Button btn = btnObj.AddComponent<Button>();
            if (onClickAction != null)
            {
                btn.onClick.AddListener(() => onClickAction());
            }

            GameObject labelObj = new GameObject("Label");
            labelObj.AddComponent<RectTransform>();
            labelObj.transform.SetParent(btnObj.transform, false);
            SetRect(labelObj, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            TMP_Text txt = labelObj.AddComponent<TextMeshProUGUI>();
            txt.text = label;
            txt.fontSize = 14;
            txt.alignment = TextAlignmentOptions.Center;
            txt.color = Color.white;

            return btnObj;
        }

        private void SetRect(GameObject obj, Vector2 anchorMin, Vector2 anchorMax, Vector2 anchoredPos, Vector2 sizeDelta)
        {
            RectTransform rt = obj.GetComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = sizeDelta;
        }
    }
}
