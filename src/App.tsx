import React, { useState } from "react";
import MainMenu from "./components/MainMenu";
import GameScreen from "./components/GameScreen";
import { Difficulty, MapDef } from "./game/entities";
import { loadSave, saveSave } from "./game/storage";

type Screen = "menu" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [save, setSave] = useState(loadSave());
  const [activeMap, setActiveMap] = useState<MapDef | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>("normal");

  function handleStart(map: MapDef, difficulty: Difficulty) {
    const next = { ...save, lastMapId: map.id, lastDifficulty: difficulty };
    setSave(next);
    saveSave(next);
    setActiveMap(map);
    setActiveDifficulty(difficulty);
    setScreen("game");
  }

  function handleExit() {
    setSave(loadSave());
    setScreen("menu");
  }

  function toggleMute() {
    const next = { ...save, muted: !save.muted };
    setSave(next);
    saveSave(next);
  }

  return (
    <div className="app-shell">
      {screen === "menu" && <MainMenu save={save} onStart={handleStart} onToggleMute={toggleMute} />}
      {screen === "game" && activeMap && <GameScreen map={activeMap} difficulty={activeDifficulty} muted={save.muted} onExit={handleExit} />}
    </div>
  );
}
