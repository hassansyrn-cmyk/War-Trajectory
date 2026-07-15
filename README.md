# War Trajectory Mobile (WTM)

War Trajectory Mobile (WTM) is an elite, high-fidelity 3D turn-based tactical physics game designed for Android and iOS devices. This repository contains the complete, fully-playable single-player MVP prototype built in **Unity 2022.3 LTS**.

For complete technical specifications and design layouts, see the **[Official Documentation Suite](docs/README.md)**.

---

## 🚀 Features Implemented in the MVP
1. **Fully Playable Core Loop**:
   - Play as Sir Gareth (or any placeholder class) in a 1v1 turn-based battle against a smart AI.
   - Dynamic canyons desert weather with horizontal and vertical wind drafts updated every turn.
2. **Tactile Touch Drag-to-Aim Controls**:
   - Touch drag-back gesture system designed to keep player sight-lines perfectly clear.
   - Trajectory preview renderer calculating weight, drag force, wind resistance, and gravity forces.
3. **Weapon Selection & Skills**:
   - Equip 3 distinct weapons: **Basic Bow** (light, wind-sensitive), **Explosive Rocket** (heavy, splash damage, dynamic sandstone cover destruction), and **Throwing Axe** (lob-heavy).
   - Use active skills: **Shield** (reduces damage by 60%) and **Double Damage** (applies 2x multiplier but adds 20% weapon weight).
4. **Interactive 3D Canyons Map**:
   - Real-time physics calculations with colliders, custom mass parameters, destructible sandstone blocks, and headshot multipliers.
5. **Polished Dynamic Main Menu & Training Sandbox**:
   - Play vs AI or access a **Training Mode** with immortal stationary targets for testing.
   - Built-in sound manager and haptic vibration engine.

---

## 🛠 Build Instructions

### Local Development Setup
1. Clone this repository.
2. Open the project folder in **Unity Hub** using **Unity 2022.3 LTS** (such as `2022.3.15f1`).
3. Set the target build platform to **Android**.
4. Open `Assets/Scenes/MainMenu.unity` and click **Play** to test inside the Unity Editor! You can use mouse clicks & drags to simulate touch gestures.

### Automated Android Build via GitHub Actions
An automated GitHub Actions workflow is fully set up in `.github/workflows/build.yml` using the **Game-CI** runner pipeline.

To configure automated builds for your fork:
1. Obtain a Unity Personal License (.ulf file) or standard Serial key.
2. Add the following **GitHub Repository Secrets** under Settings -> Secrets and variables -> Actions:
   - `UNITY_EMAIL`: Your Unity registration email.
   - `UNITY_PASSWORD`: Your Unity account password.
   - `UNITY_LICENSE`: The entire content of your `.ulf` license file.
3. The build will execute automatically on pushing to the `main` branch, or can be triggered manually using `workflow_dispatch`.
4. Download the compiled `.apk` direct installer file from the GitHub Actions execution summary artifacts!
