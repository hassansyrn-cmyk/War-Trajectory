using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;

namespace WTM.Core
{
    public class Bootstrap : MonoBehaviour
    {
        public static Bootstrap Instance { get; private set; }

        [Header("Theme Colors")]
        public Color canyonSkyColor = new Color(0.85f, 0.65f, 0.5f); // Red sandstone canyon desert sky
        public Color sandstoneTerrainColor = new Color(0.65f, 0.35f, 0.25f); // Beautiful canyon rock

        [Header("Assets to Generate")]
        public GameObject defaultMaterialHolder;

        // UI references
        private Canvas mainHUDCanvas;
        private TMP_Text turnStatusText;
        private TMP_Text windStatusText;
        private TMP_Text playerHpText;
        private TMP_Text aiHpText;
        private Slider playerHpSlider;
        private Slider aiHpSlider;

        private TMP_Text selectedWeaponText;
        private TMP_Text activeShieldText;
        private TMP_Text activeDoubleText;

        // End game overlay
        private GameObject endGameOverlay;
        private TMP_Text endGameStatusText;

        private void Awake()
        {
            Instance = this;
            SetupCameraAndEnvironment();
            SetupLightingAndMaterials();
            SpawnPlayerAndEnemyAndTerrain();
            BuildHUD();
        }

        private void Start()
        {
            GameManager.Instance.OnStateChanged += UpdateHUDValues;
            UpdateHUDValues();
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnStateChanged -= UpdateHUDValues;
            }
        }

        private void SetupCameraAndEnvironment()
        {
            // Configure main camera dynamically
            Camera mainCam = Camera.main;
            if (mainCam == null)
            {
                GameObject camObj = new GameObject("MainCamera");
                camObj.tag = "MainCamera";
                mainCam = camObj.AddComponent<Camera>();
            }

            mainCam.clearFlags = CameraClearFlags.SolidColor;
            mainCam.backgroundColor = canyonSkyColor;
            mainCam.fieldOfView = 35;
            mainCam.nearClipPlane = 0.3f;
            mainCam.farClipPlane = 1000f;

            // Attach Camera Controller
            if (mainCam.GetComponent<CameraController>() == null)
            {
                mainCam.gameObject.AddComponent<CameraController>();
            }
        }

        private void SetupLightingAndMaterials()
        {
            // Simple light setup to run fast on mobile without complex shadows
            GameObject lightObj = GameObject.Find("DirectionalLight");
            if (lightObj == null)
            {
                lightObj = new GameObject("DirectionalLight");
                Light l = lightObj.AddComponent<Light>();
                l.type = LightType.Directional;
                l.color = new Color(1.0f, 0.95f, 0.9f);
                l.intensity = 1.0f;
                lightObj.transform.rotation = Quaternion.Euler(30, -35, 0);
            }
        }

        private void SpawnPlayerAndEnemyAndTerrain()
        {
            // Build sandstone plateaus & canyons
            CreateSandstonePlatform("CanyonLeft", new Vector3(-12f, -4f, 0f), new Vector3(14f, 8f, 5f));
            CreateSandstonePlatform("CanyonCenterGap", new Vector3(0f, -12f, 0f), new Vector3(10f, 6f, 5f));
            CreateSandstonePlatform("CanyonRight", new Vector3(12f, -3f, 0f), new Vector3(14f, 10f, 5f));

            if (GameManager.Instance.isTrainingMode)
            {
                // Put a static training dummy target in canyon center gaps
                CreateTrainingDummy(new Vector3(0f, -8f, 0f));
            }

            // Create Player Capsule
            GameObject player = CreateCharacter("PlayerCharacter", new Vector3(-10f, 1f, 0f), Color.blue, "Player");
            player.AddComponent<PlayerController>();

            // Create Enemy Capsule
            GameObject enemy = CreateCharacter("EnemyCharacter", new Vector3(10f, 3f, 0f), Color.red, "AI");
            AIController ai = enemy.AddComponent<AIController>();
            ai.targetTransform = player.transform;

            // Inject references to TurnManager
            TurnManager.Instance.playerTransform = player.transform;
            TurnManager.Instance.aiTransform = enemy.transform;

            // Define Projectile Template Prefab
            GameObject pTemplate = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            pTemplate.name = "ProjectileTemplate";
            pTemplate.transform.localScale = Vector3.one * 0.5f;
            pTemplate.GetComponent<Renderer>().material.color = Color.green;
            pTemplate.AddComponent<Rigidbody>().isKinematic = true; // Use custom physics calculations instead of standard PhysX gravity
            pTemplate.AddComponent<Projectile>();

            // Turn template into real runtime prefab setup
            pTemplate.SetActive(false);
            TurnManager.Instance.projectilePrefab = pTemplate;

            // Pin camera target to Player
            CameraController.Instance.SetTarget(player.transform);
        }

        private void CreateSandstonePlatform(string name, Vector3 pos, Vector3 size)
        {
            GameObject block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.tag = "Terrain";
            block.transform.position = pos;
            block.transform.localScale = size;

            // Color block
            Renderer r = block.GetComponent<Renderer>();
            r.material.color = sandstoneTerrainColor;
        }

        private GameObject CreateCharacter(string name, Vector3 pos, Color col, string tag)
        {
            GameObject body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = name;
            body.tag = tag;
            body.transform.position = pos;
            body.transform.localScale = new Vector3(1.2f, 1.5f, 1.2f);

            // Give capsule standard material coloring
            body.GetComponent<Renderer>().material.color = col;

            // RigidBody & Collider configurations
            Rigidbody rb = body.AddComponent<Rigidbody>();
            rb.isKinematic = false;
            rb.constraints = RigidbodyConstraints.FreezeRotation | RigidbodyConstraints.FreezePositionZ;
            rb.mass = 80f;

            // Make it slightly heavy to avoid sliding
            body.GetComponent<CapsuleCollider>().sharedMaterial = new PhysicsMaterial { frictionCombine = PhysicsMaterialCombine.Maximum, dynamicFriction = 1f, staticFriction = 1f };

            return body;
        }

        private void CreateTrainingDummy(Vector3 pos)
        {
            GameObject target = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            target.name = "TargetDummy";
            target.tag = "AI"; // Target acts as AI recipient for damage
            target.transform.position = pos;
            target.transform.localScale = new Vector3(1f, 1f, 1f);
            target.GetComponent<Renderer>().material.color = Color.magenta;

            Rigidbody rb = target.AddComponent<Rigidbody>();
            rb.isKinematic = true;
        }

        private void BuildHUD()
        {
            // Programmatically construct high-fidelity in-game HUD using Canvas system
            GameObject canvObj = new GameObject("InGameHUD");
            mainHUDCanvas = canvObj.AddComponent<Canvas>();
            mainHUDCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvObj.AddComponent<GraphicRaycaster>();

            // 1. Top Panel for Player Info & Turn Banner
            GameObject topPanel = CreateUIObject("TopPanel", canvObj.transform);
            SetRect(topPanel, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0, -60), new Vector2(800, 100));

            // Turn text Status
            GameObject turnStatusObj = CreateUIObject("TurnStatus", topPanel.transform);
            SetRect(turnStatusObj, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0, -15), new Vector2(400, 40));
            turnStatusText = turnStatusObj.AddComponent<TextMeshProUGUI>();
            turnStatusText.fontSize = 24;
            turnStatusText.alignment = TextAlignmentOptions.Center;
            turnStatusText.color = Color.white;
            turnStatusText.text = "YOUR TURN";

            // Wind Text Status
            GameObject windStatusObj = CreateUIObject("WindStatus", topPanel.transform);
            SetRect(windStatusObj, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0, 15), new Vector2(400, 30));
            windStatusText = windStatusObj.AddComponent<TextMeshProUGUI>();
            windStatusText.fontSize = 18;
            windStatusText.alignment = TextAlignmentOptions.Center;
            windStatusText.color = Color.cyan;
            windStatusText.text = "WIND: <--- 5.2 m/s";

            // Player HP display (Left side)
            GameObject playerHpObj = CreateUIObject("PlayerHPLabel", topPanel.transform);
            SetRect(playerHpObj, new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(120, 15), new Vector2(200, 30));
            playerHpText = playerHpObj.AddComponent<TextMeshProUGUI>();
            playerHpText.fontSize = 18;
            playerHpText.text = "PLAYER HP: 500";

            GameObject playerBar = CreateUISlider("PlayerHPSlider", topPanel.transform, new Vector2(120, -15), new Vector2(200, 20));
            playerHpSlider = playerBar.GetComponent<Slider>();

            // AI HP display (Right side)
            GameObject aiHpObj = CreateUIObject("AIHPLabel", topPanel.transform);
            SetRect(aiHpObj, new Vector2(1f, 0.5f), new Vector2(1f, 0.5f), new Vector2(-120, 15), new Vector2(200, 30));
            aiHpText = aiHpObj.AddComponent<TextMeshProUGUI>();
            aiHpText.fontSize = 18;
            aiHpText.alignment = TextAlignmentOptions.Right;
            aiHpText.text = "ENEMY HP: 500";

            GameObject aiBar = CreateUISlider("AIHPSlider", topPanel.transform, new Vector2(-120, -15), new Vector2(200, 20));
            aiHpSlider = aiBar.GetComponent<Slider>();

            // 2. Settings button (Top Left corner)
            GameObject settingsBtnObj = CreateUIButton("SettingsBtn", canvObj.transform, "Settings (S)", () => ToggleSettingsMenu(true));
            SetRect(settingsBtnObj, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(60, -40), new Vector2(100, 40));

            // 3. Bottom HUD Deck (Action & Weapon Deck)
            GameObject bottomDeck = CreateUIObject("BottomDeck", canvObj.transform);
            SetRect(bottomDeck, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0, 50), new Vector2(900, 90));
            Image deckBg = bottomDeck.AddComponent<Image>();
            deckBg.color = new Color(0.12f, 0.12f, 0.15f, 0.85f);

            // Left side: Weapons selectors
            GameObject weaponDeckTitle = CreateUIObject("WpTitle", bottomDeck.transform);
            SetRect(weaponDeckTitle, new Vector2(0.15f, 0.8f), new Vector2(0.15f, 0.8f), new Vector2(0, 0), new Vector2(250, 20));
            TMP_Text wpTitleTxt = weaponDeckTitle.AddComponent<TextMeshProUGUI>();
            wpTitleTxt.fontSize = 12;
            wpTitleTxt.color = Color.yellow;
            wpTitleTxt.alignment = TextAlignmentOptions.Center;
            wpTitleTxt.text = "SELECT WEAPON";

            GameObject wpSelectorObj = CreateUIButton("BtnBow", bottomDeck.transform, "Bow", () => SelectWeapon(0));
            SetRect(wpSelectorObj, new Vector2(0.08f, 0.35f), new Vector2(0.08f, 0.35f), new Vector2(0, 0), new Vector2(75, 40));

            GameObject wp2Obj = CreateUIButton("BtnRocket", bottomDeck.transform, "Rocket", () => SelectWeapon(1));
            SetRect(wp2Obj, new Vector2(0.17f, 0.35f), new Vector2(0.17f, 0.35f), new Vector2(0, 0), new Vector2(75, 40));

            GameObject wp3Obj = CreateUIButton("BtnAxe", bottomDeck.transform, "Axe", () => SelectWeapon(2));
            SetRect(wp3Obj, new Vector2(0.26f, 0.35f), new Vector2(0.26f, 0.35f), new Vector2(0, 0), new Vector2(75, 40));

            GameObject activeWpLabel = CreateUIObject("ActiveWeaponLabel", bottomDeck.transform);
            SetRect(activeWpLabel, new Vector2(0.40f, 0.5f), new Vector2(0.40f, 0.5f), new Vector2(0, 0), new Vector2(150, 40));
            selectedWeaponText = activeWpLabel.AddComponent<TextMeshProUGUI>();
            selectedWeaponText.fontSize = 14;
            selectedWeaponText.alignment = TextAlignmentOptions.Center;
            selectedWeaponText.color = Color.white;

            // Right side: Skills selections
            GameObject skillsTitle = CreateUIObject("SkillTitle", bottomDeck.transform);
            SetRect(skillsTitle, new Vector2(0.70f, 0.8f), new Vector2(0.70f, 0.8f), new Vector2(0, 0), new Vector2(300, 20));
            TMP_Text skTitleTxt = skillsTitle.AddComponent<TextMeshProUGUI>();
            skTitleTxt.fontSize = 12;
            skTitleTxt.color = Color.yellow;
            skTitleTxt.alignment = TextAlignmentOptions.Center;
            skTitleTxt.text = "TACTICAL SKILLS";

            GameObject skillShieldBtn = CreateUIButton("SkillShieldBtn", bottomDeck.transform, "Shield", TriggerShieldSkill);
            SetRect(skillShieldBtn, new Vector2(0.62f, 0.35f), new Vector2(0.62f, 0.35f), new Vector2(0, 0), new Vector2(90, 40));
            activeShieldText = skillShieldBtn.transform.GetChild(0).GetComponent<TMP_Text>();

            GameObject skillDmgBtn = CreateUIButton("SkillDmgBtn", bottomDeck.transform, "Double Dmg", TriggerDoubleDamageSkill);
            SetRect(skillDmgBtn, new Vector2(0.74f, 0.35f), new Vector2(0.74f, 0.35f), new Vector2(0, 0), new Vector2(90, 40));
            activeDoubleText = skillDmgBtn.transform.GetChild(0).GetComponent<TMP_Text>();

            // Emote action
            GameObject emoteBtn = CreateUIButton("EmoteBtn", bottomDeck.transform, "Emote ☺", SendEmote);
            SetRect(emoteBtn, new Vector2(0.86f, 0.35f), new Vector2(0.86f, 0.35f), new Vector2(0, 0), new Vector2(80, 40));

            // Helper text for mobile actions
            GameObject helperTextObj = CreateUIObject("HelperText", canvObj.transform);
            SetRect(helperTextObj, new Vector2(0.5f, 0.25f), new Vector2(0.5f, 0.25f), new Vector2(0, 0), new Vector2(600, 30));
            TMP_Text helperText = helperTextObj.AddComponent<TextMeshProUGUI>();
            helperText.fontSize = 16;
            helperText.alignment = TextAlignmentOptions.Center;
            helperText.color = new Color(1, 1, 1, 0.75f);
            helperText.text = "Drag back anywhere on upper screen & release to shoot!";

            // 4. Create Settings overlay (Starts inactive)
            BuildSettingsOverlay(canvObj.transform);

            // 5. Build end game overlay
            BuildEndGameOverlay(canvObj.transform);
        }

        private void BuildSettingsOverlay(Transform parent)
        {
            GameObject overlay = CreateUIObject("SettingsOverlay", parent);
            SetRect(overlay, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(400, 300));
            Image bg = overlay.AddComponent<Image>();
            bg.color = new Color(0.1f, 0.1f, 0.12f, 0.98f);
            overlay.SetActive(false);
            defaultMaterialHolder = overlay; // Borrow reference

            // Title
            GameObject titleObj = CreateUIObject("Title", overlay.transform);
            SetRect(titleObj, new Vector2(0.5f, 0.85f), new Vector2(0.5f, 0.85f), Vector2.zero, new Vector2(300, 40));
            TMP_Text t = titleObj.AddComponent<TextMeshProUGUI>();
            t.fontSize = 24;
            t.alignment = TextAlignmentOptions.Center;
            t.color = Color.yellow;
            t.text = "SETTINGS";

            // Sound Toggle
            GameObject sToggleBtn = CreateUIButton("SoundToggleBtn", overlay.transform, "Sound: ON", null);
            SetRect(sToggleBtn, new Vector2(0.5f, 0.6f), new Vector2(0.5f, 0.6f), Vector2.zero, new Vector2(250, 40));
            TMP_Text soundBtnTxt = sToggleBtn.transform.GetChild(0).GetComponent<TMP_Text>();
            soundBtnTxt.text = SettingsManager.SoundEnabled ? "Sound: ON" : "Sound: OFF";
            sToggleBtn.GetComponent<Button>().onClick.AddListener(() =>
            {
                SettingsManager.SoundEnabled = !SettingsManager.SoundEnabled;
                soundBtnTxt.text = SettingsManager.SoundEnabled ? "Sound: ON" : "Sound: OFF";
                if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(440f, 0.1f);
            });

            // Vibration Toggle
            GameObject vToggleBtn = CreateUIButton("VibrationToggleBtn", overlay.transform, "Vibration: ON", null);
            SetRect(vToggleBtn, new Vector2(0.5f, 0.4f), new Vector2(0.5f, 0.4f), Vector2.zero, new Vector2(250, 40));
            TMP_Text vibBtnTxt = vToggleBtn.transform.GetChild(0).GetComponent<TMP_Text>();
            vibBtnTxt.text = SettingsManager.VibrationEnabled ? "Vibration: ON" : "Vibration: OFF";
            vToggleBtn.GetComponent<Button>().onClick.AddListener(() =>
            {
                SettingsManager.VibrationEnabled = !SettingsManager.VibrationEnabled;
                vibBtnTxt.text = SettingsManager.VibrationEnabled ? "Vibration: ON" : "Vibration: OFF";
                SettingsManager.TriggerVibration();
            });

            // Close Settings
            GameObject closeBtn = CreateUIButton("CloseSettingsBtn", overlay.transform, "Resume Game", () => ToggleSettingsMenu(false));
            SetRect(closeBtn, new Vector2(0.5f, 0.18f), new Vector2(0.5f, 0.18f), Vector2.zero, new Vector2(250, 40));
        }

        private void BuildEndGameOverlay(Transform parent)
        {
            endGameOverlay = CreateUIObject("EndGameOverlay", parent);
            SetRect(endGameOverlay, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(450, 320));
            Image bg = endGameOverlay.AddComponent<Image>();
            bg.color = new Color(0.08f, 0.08f, 0.1f, 0.98f);
            endGameOverlay.SetActive(false);

            GameObject titleObj = CreateUIObject("StatusText", endGameOverlay.transform);
            SetRect(titleObj, new Vector2(0.5f, 0.75f), new Vector2(0.5f, 0.75f), Vector2.zero, new Vector2(400, 50));
            endGameStatusText = titleObj.AddComponent<TextMeshProUGUI>();
            endGameStatusText.fontSize = 32;
            endGameStatusText.alignment = TextAlignmentOptions.Center;
            endGameStatusText.color = Color.white;

            // Restart Button
            GameObject restartBtn = CreateUIButton("RestartBtn", endGameOverlay.transform, "Battle Again", RestartMatch);
            SetRect(restartBtn, new Vector2(0.5f, 0.45f), new Vector2(0.5f, 0.45f), Vector2.zero, new Vector2(250, 45));

            // Return menu
            GameObject returnBtn = CreateUIButton("ReturnBtn", endGameOverlay.transform, "Quit to Main Menu", LoadMainMenu);
            SetRect(returnBtn, new Vector2(0.5f, 0.25f), new Vector2(0.5f, 0.25f), Vector2.zero, new Vector2(250, 45));
        }

        public void ShowEndGameScreen(bool won)
        {
            endGameOverlay.SetActive(true);
            if (won)
            {
                endGameStatusText.text = "VICTORY!";
                endGameStatusText.color = Color.green;
                if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(520f, 0.6f, 0.5f);
            }
            else
            {
                endGameStatusText.text = "DEFEATED";
                endGameStatusText.color = Color.red;
                if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(180f, 0.6f, 0.5f);
            }
        }

        private void ToggleSettingsMenu(bool open)
        {
            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(440f, 0.1f);
            defaultMaterialHolder.SetActive(open);
        }

        private void SelectWeapon(int idx)
        {
            if (!GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress) return;
            GameManager.Instance.currentWeapon = GameManager.Instance.weaponsList[idx];
            GameManager.Instance.OnStateChanged?.Invoke();
            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(400f + (idx * 50), 0.15f);
        }

        private void TriggerShieldSkill()
        {
            if (!GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress) return;
            if (GameManager.Instance.activeShieldSkill.currentCooldown > 0) return;

            GameManager.Instance.playerShieldActive = true;
            GameManager.Instance.activeShieldSkill.currentCooldown = GameManager.Instance.activeShieldSkill.cooldownTurns;
            GameManager.Instance.OnStateChanged?.Invoke();

            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(600f, 0.3f);
        }

        private void TriggerDoubleDamageSkill()
        {
            if (!GameManager.Instance.isPlayerTurn || TurnManager.Instance.IsActionInProgress) return;
            if (GameManager.Instance.activeDoubleDamageSkill.currentCooldown > 0) return;

            GameManager.Instance.nextShotDoubleDamage = true;
            GameManager.Instance.activeDoubleDamageSkill.currentCooldown = GameManager.Instance.activeDoubleDamageSkill.cooldownTurns;
            GameManager.Instance.OnStateChanged?.Invoke();

            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(800f, 0.3f);
        }

        private void SendEmote()
        {
            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(900f, 0.1f, 0.3f);
            // Spawn temporary emoji text above character
            GameObject textEmoji = new GameObject("EmojiPopup");
            textEmoji.transform.position = TurnManager.Instance.playerTransform.position + Vector3.up * 3f;
            TextMeshPro emojiComp = textEmoji.AddComponent<TextMeshPro>();
            emojiComp.text = "☺ GG!";
            emojiComp.fontSize = 5;
            emojiComp.alignment = TextAlignmentOptions.Center;
            emojiComp.color = Color.yellow;
            Destroy(textEmoji, 2.0f);
        }

        private void RestartMatch()
        {
            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(300f, 0.2f);
            SceneManager.LoadScene("Game");
        }

        private void LoadMainMenu()
        {
            if (SoundManager.Instance != null) SoundManager.Instance.PlayTone(200f, 0.2f);
            SceneManager.LoadScene("MainMenu");
        }

        private void UpdateHUDValues()
        {
            if (GameManager.Instance == null) return;

            // Update wind status text
            float wx = GameManager.Instance.currentWind.x;
            string dirStr = wx > 0 ? "--->" : "<---";
            windStatusText.text = $"WIND: {dirStr} {Mathf.Abs(wx):F1} m/s";

            // Update Turn header banner
            if (GameManager.Instance.isPlayerTurn)
            {
                turnStatusText.text = "YOUR TURN";
                turnStatusText.color = Color.green;
            }
            else
            {
                turnStatusText.text = "ENEMY TURN";
                turnStatusText.color = Color.red;
            }

            // Update health bars
            playerHpText.text = $"PLAYER HP: {Mathf.RoundToInt(GameManager.Instance.playerHealth)}";
            playerHpSlider.value = GameManager.Instance.playerHealth / GameManager.Instance.maxHealth;

            if (GameManager.Instance.isTrainingMode)
            {
                aiHpText.text = "TARGET DUMMY";
                aiHpSlider.value = 1f;
            }
            else
            {
                aiHpText.text = $"ENEMY HP: {Mathf.RoundToInt(GameManager.Instance.aiHealth)}";
                aiHpSlider.value = GameManager.Instance.aiHealth / GameManager.Instance.maxHealth;
            }

            // Update bottom weapon / skill texts
            selectedWeaponText.text = $"{GameManager.Instance.currentWeapon.weaponName}\nWt: {GameManager.Instance.currentWeapon.weightKg} kg";

            activeShieldText.text = GameManager.Instance.activeShieldSkill.currentCooldown > 0
                ? $"Shield ({GameManager.Instance.activeShieldSkill.currentCooldown})"
                : "Shield";

            activeDoubleText.text = GameManager.Instance.activeDoubleDamageSkill.currentCooldown > 0
                ? $"Double ({GameManager.Instance.activeDoubleDamageSkill.currentCooldown})"
                : "Double";

            if (GameManager.Instance.playerShieldActive)
            {
                activeShieldText.text = "Shield ACTIVE";
            }
            if (GameManager.Instance.nextShotDoubleDamage)
            {
                activeDoubleText.text = "Double ACTIVE";
            }
        }

        // --- Helper Methods to programmatically build neat UI elements ---
        private GameObject CreateUIObject(string name, Transform parent)
        {
            GameObject obj = new GameObject(name);
            obj.AddComponent<RectTransform>();
            obj.transform.SetParent(parent, false);
            return obj;
        }

        private void SetRect(GameObject obj, Vector2 anchorMin, Vector2 anchorMax, Vector2 anchoredPos, Vector2 sizeDelta)
        {
            RectTransform rt = obj.GetComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = sizeDelta;
        }

        private GameObject CreateUIButton(string name, Transform parent, string label, System.Action onClickAction)
        {
            GameObject btnObj = CreateUIObject(name, parent);
            Image img = btnObj.AddComponent<Image>();
            img.color = new Color(0.2f, 0.22f, 0.25f, 1f);

            Button btn = btnObj.AddComponent<Button>();
            if (onClickAction != null)
            {
                btn.onClick.AddListener(() => onClickAction());
            }

            GameObject labelObj = CreateUIObject("Label", btnObj.transform);
            SetRect(labelObj, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            TMP_Text txt = labelObj.AddComponent<TextMeshProUGUI>();
            txt.text = label;
            txt.fontSize = 14;
            txt.alignment = TextAlignmentOptions.Center;
            txt.color = Color.white;

            return btnObj;
        }

        private GameObject CreateUISlider(string name, Transform parent, Vector2 pos, Vector2 size)
        {
            GameObject sliderObj = CreateUIObject(name, parent);
            SetRect(sliderObj, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), pos, size);

            Slider slider = sliderObj.AddComponent<Slider>();

            GameObject bgObj = CreateUIObject("Background", sliderObj.transform);
            SetRect(bgObj, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            Image bgImg = bgObj.AddComponent<Image>();
            bgImg.color = new Color(0.15f, 0.15f, 0.15f, 1f);

            GameObject fillArea = CreateUIObject("Fill Area", sliderObj.transform);
            SetRect(fillArea, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            GameObject fillObj = CreateUIObject("Fill", fillArea.transform);
            SetRect(fillObj, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            Image fillImg = fillObj.AddComponent<Image>();
            fillImg.color = Color.red;

            slider.fillRect = fillObj.GetComponent<RectTransform>();
            slider.value = 1f;

            return sliderObj;
        }
    }
}
