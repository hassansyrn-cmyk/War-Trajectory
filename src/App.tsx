import React, { useEffect, useState } from "react";
import MainMenu from "./components/MainMenu";
import TutorialScreen from "./components/TutorialScreen";
import WarriorSelect from "./components/WarriorSelect";
import GameScreen from "./components/GameScreen";
import { Difficulty, MapDef, MatchModifier, MAPS, challengeForDate } from "./game/entities";
import { loadSave, saveSave } from "./game/storage";
import { loadAssets } from "./game/assets";

type Screen = "menu" | "tutorial" | "select" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [save, setSave] = useState(loadSave());
  const [activeMap, setActiveMap] = useState<MapDef | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>("normal");
  const [activeArchetypeId, setActiveArchetypeId] = useState<string>(save.lastArchetypeId);
  const [activeModifier, setActiveModifier] = useState<MatchModifier | null>(null);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    loadAssets().catch(() => {
      // The renderer keeps its visual fallback if a non-critical sprite is unavailable.
    });
  }, []);

  function prepareMatch(map: MapDef, difficulty: Difficulty, modifier: MatchModifier | null = null) {
    const next = { ...save, lastMapId: map.id, lastDifficulty: difficulty };
    setSave(next);
    saveSave(next);
    setActiveMap(map);
    setActiveDifficulty(difficulty);
    setActiveModifier(modifier);
    setTraining(false);
    setScreen("select");
  }

  function handleConfirmWarrior(archetypeId: string) {
    const next = { ...save, lastArchetypeId: archetypeId };
    setSave(next);
    saveSave(next);
    setActiveArchetypeId(archetypeId);
    setScreen("game");
  }

  function startTraining() {
    setActiveMap(MAPS[0]);
    setActiveDifficulty("easy");
    setActiveArchetypeId("archer");
    setActiveModifier(null);
    setTraining(true);
    setScreen("game");
  }

  function handleExit() {
    setSave(loadSave());
    setTraining(false);
    setScreen("menu");
  }

  function toggleMute() {
    const next = { ...save, muted: !save.muted };
    setSave(next);
    saveSave(next);
  }

  return (
    <div className="app-shell">
      {screen === "menu" && <MainMenu save={save} onStart={(map, difficulty) => prepareMatch(map, difficulty)} onDaily={(map, difficulty) => prepareMatch(map, difficulty, challengeForDate())} onTutorial={() => setScreen("tutorial")} onToggleMute={toggleMute} />}
      {screen === "tutorial" && <TutorialScreen onPractice={startTraining} onExit={() => setScreen("menu")} />}
      {screen === "select" && <WarriorSelect initialArchetypeId={activeArchetypeId} onConfirm={handleConfirmWarrior} onBack={() => setScreen("menu")} />}
      {screen === "game" && activeMap && <GameScreen map={activeMap} difficulty={activeDifficulty} archetypeId={activeArchetypeId} modifier={activeModifier} training={training} muted={save.muted} onExit={handleExit} />}
    </div>
  );
}
