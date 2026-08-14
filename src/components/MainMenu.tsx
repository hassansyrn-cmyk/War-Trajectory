import React, { useState } from "react";
import { Difficulty, MAPS, MapDef, challengeForDate } from "../game/entities";
import { SaveData } from "../game/storage";

interface Props {
  save: SaveData;
  onStart: (map: MapDef, difficulty: Difficulty) => void;
  onDaily: (map: MapDef, difficulty: Difficulty) => void;
  onTutorial: () => void;
  onToggleMute: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "سهل" },
  { id: "normal", label: "متوسط" },
  { id: "hard", label: "صعب" },
];

export default function MainMenu({ save, onStart, onDaily, onTutorial, onToggleMute }: Props) {
  const [mapId, setMapId] = useState(save.lastMapId || MAPS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>(save.lastDifficulty || "normal");
  const selectedMap = MAPS.find((map) => map.id === mapId) ?? MAPS[0];
  const daily = challengeForDate();

  return (
    <div className="menu-root">
      <div className="menu-header">
        <h1>War Trajectory</h1>
        <p className="menu-subtitle">لعبة مواجهة مقذوفات تكتيكية — 1 ضد 1</p>
      </div>

      <div className="menu-stats">
        <div className="stat-chip"><span className="stat-value">{save.level}</span><span className="stat-label">المستوى</span></div>
        <div className="stat-chip"><span className="stat-value">{save.wins}</span><span className="stat-label">انتصارات</span></div>
        <div className="stat-chip"><span className="stat-value">{save.losses}</span><span className="stat-label">خسائر</span></div>
        <button className="icon-btn" onClick={onToggleMute} aria-label="كتم الصوت">{save.muted ? "🔇" : "🔊"}</button>
      </div>

      <button className="daily-card" onClick={() => onDaily(selectedMap, difficulty)}>
        <span className="daily-badge">تحدي اليوم</span>
        <span className="daily-title">{daily.nameAr}</span>
        <span className="daily-desc">{daily.descriptionAr}</span>
        <span className="daily-reward">{save.dailyChallengeCompleted ? "مكتمل" : "+30 XP"}</span>
      </button>

      <div className="menu-section">
        <h2>اختر الخريطة</h2>
        <div className="map-grid">
          {MAPS.map((map) => (
            <button key={map.id} className={"map-card" + (map.id === mapId ? " selected" : "")} style={{ background: `linear-gradient(160deg, ${map.skyTop}, ${map.groundTop})` }} onClick={() => setMapId(map.id)}>
              <span>{map.nameAr}</span><small>{map.effectLabelAr}</small>
            </button>
          ))}
        </div>
        <p className="map-effect-note">{selectedMap.effectDescriptionAr}</p>
      </div>

      <div className="menu-section">
        <h2>مستوى الصعوبة</h2>
        <div className="diff-row">
          {DIFFICULTIES.map((item) => <button key={item.id} className={"diff-btn" + (item.id === difficulty ? " selected" : "")} onClick={() => setDifficulty(item.id)}>{item.label}</button>)}
        </div>
      </div>

      <button className="start-btn" onClick={() => onStart(selectedMap, difficulty)}>التالي: اختيار المحارب</button>
      <button className="tutorial-btn" onClick={onTutorial}>تدريب سريع: تعلم التصويب والرياح</button>
      <p className="menu-footer">اسحب لتحديد الزاوية والقوة، تحرك قبل الإطلاق، واختر السلاح المناسب للمسافة والرياح.</p>
    </div>
  );
}
