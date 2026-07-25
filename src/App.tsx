import React, { useEffect, useState } from "react";
import MainMenu from "./components/MainMenu";
import WarriorSelect from "./components/WarriorSelect";
import GameScreen from "./components/GameScreen";
import { Difficulty, MapDef } from "./game/entities";
import { loadSave, saveSave } from "./game/storage";
import { loadAssets } from "./game/assets";

type Screen = "menu" | "select" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [save, setSave] = useState(loadSave());
  const [activeMap, setActiveMap] = useState<MapDef | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>("normal");
  const [activeArchetypeId, setActiveArchetypeId] = useState<string>(save.lastArchetypeId);

  useEffect(() => {
    // Fire-and-forget: by the time the player taps "start match" the sprite
    // sheets are usually already cached. GameScreen still gates on this
    // promise itself in case the player is fast.
    loadAssets().catch(() => {
      // Missing/renamed asset files — the renderer falls back to simple
      // shapes per-sprite rather than blocking the whole game.
    });
  }, []);

  function handlePickMapDifficulty(map: MapDef, difficulty: Difficulty) {
    const next = { ...save, lastMapId: map.id, lastDifficulty: difficulty };
    setSave(next);
    saveSave(next);
    setActiveMap(map);
    setActiveDifficulty(difficulty);
    setScreen("select");
  }

  function handleConfirmWarrior(archetypeId: string) {
    const next = { ...save, lastArchetypeId: archetypeId };
    setSave(next);
    saveSave(next);
    setActiveArchetypeId(archetypeId);
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
      {screen === "menu" && <MainMenu save={save} onStart={handlePickMapDifficulty} onToggleMute={toggleMute} />}
      {screen === "select" && (
        <WarriorSelect initialArchetypeId={activeArchetypeId} onConfirm={handleConfirmWarrior} onBack={() => setScreen("menu")} />
      )}
      {screen === "game" && activeMap && (
        <GameScreen map={activeMap} difficulty={activeDifficulty} archetypeId={activeArchetypeId} muted={save.muted} onExit={handleExit} />
      )}
    </div>
  );
}
