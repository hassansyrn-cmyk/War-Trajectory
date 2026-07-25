import React, { useState } from "react";
import { Difficulty, MAPS, MapDef } from "../game/entities";
import { SaveData } from "../game/storage";

interface Props {
  save: SaveData;
  onStart: (map: MapDef, difficulty: Difficulty) => void;
  onToggleMute: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "سهل" },
  { id: "normal", label: "متوسط" },
  { id: "hard", label: "صعب" },
];

export default function MainMenu({ save, onStart, onToggleMute }: Props) {
  const [mapId, setMapId] = useState(save.lastMapId || MAPS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>(save.lastDifficulty || "normal");

  const selectedMap = MAPS.find((m) => m.id === mapId) ?? MAPS[0];

  return (
    <div className="menu-root">
      <div className="menu-header">
        <h1>War Trajectory</h1>
        <p className="menu-subtitle">لعبة مواجهة مقذوفات تكتيكية — 1 ضد 1</p>
      </div>

      <div className="menu-stats">
        <div className="stat-chip">
          <span className="stat-value">{save.wins}</span>
          <span className="stat-label">انتصارات</span>
        </div>
        <div className="stat-chip">
          <span className="stat-value">{save.losses}</span>
          <span className="stat-label">خسائر</span>
        </div>
        <button className="icon-btn" onClick={onToggleMute} aria-label="كتم الصوت">
          {save.muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className="menu-section">
        <h2>اختر الخريطة</h2>
        <div className="map-grid">
          {MAPS.map((m) => (
            <button
              key={m.id}
              className={"map-card" + (m.id === mapId ? " selected" : "")}
              style={{ background: `linear-gradient(160deg, ${m.skyTop}, ${m.groundTop})` }}
              onClick={() => setMapId(m.id)}
            >
              <span>{m.nameAr}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="menu-section">
        <h2>مستوى الصعوبة</h2>
        <div className="diff-row">
          {DIFFICULTIES.map((d) => (
            <button key={d.id} className={"diff-btn" + (d.id === difficulty ? " selected" : "")} onClick={() => setDifficulty(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button className="start-btn" onClick={() => onStart(selectedMap, difficulty)}>
        التالي: اختيار المحارب
      </button>

      <p className="menu-footer">اسحب على الشاشة لضبط زاوية وقوة الإطلاق، ثم حرر إصبعك لإطلاق السلاح نحو الخصم.</p>
    </div>
  );
}
