import React, { useState } from "react";
import { ARCHETYPES, WEAPONS } from "../game/entities";

interface Props {
  initialArchetypeId: string;
  onConfirm: (archetypeId: string) => void;
  onBack: () => void;
}

export default function WarriorSelect({ initialArchetypeId, onConfirm, onBack }: Props) {
  const [index, setIndex] = useState(Math.max(0, ARCHETYPES.findIndex((a) => a.id === initialArchetypeId)));
  const archetype = ARCHETYPES[index];

  function go(delta: number) {
    setIndex((i) => (i + delta + ARCHETYPES.length) % ARCHETYPES.length);
  }

  return (
    <div className="select-root">
      <div className="select-header">
        <button className="icon-btn" onClick={onBack} aria-label="رجوع">
          ‹
        </button>
        <h1>اختر محاربك</h1>
        <span style={{ width: 30 }} />
      </div>

      <div className="select-preview">
        <button className="nav-btn" onClick={() => go(-1)} aria-label="السابق">
          ‹
        </button>
        <div
          className="portrait-large"
          style={{
            backgroundImage: `url(assets/sprites/warriors/${archetype.id}.png)`,
            boxShadow: `0 0 0 3px ${archetype.accentColor}, 0 0 30px ${archetype.accentColor}55`,
          }}
        />
        <button className="nav-btn" onClick={() => go(1)} aria-label="التالي">
          ›
        </button>
      </div>

      <div className="select-info">
        <h2>{archetype.nameAr}</h2>
        <p className="select-role">{archetype.roleAr}</p>
      </div>

      <div className="select-loadout">
        <h3>الأسلحة</h3>
        <div className="loadout-row">
          {archetype.loadout.map((slot) => {
            const w = WEAPONS.find((w) => w.id === slot.weaponId)!;
            return (
              <div key={slot.weaponId} className="loadout-chip">
                <span className="weapon-icon" style={{ backgroundColor: w.colorMain, backgroundImage: `url(assets/sprites/weapons/${w.type}.png)` }} />
                <span className="loadout-chip-name">{w.nameAr}</span>
                <span className="loadout-chip-ammo">{Number.isFinite(slot.ammo) ? slot.ammo : "∞ أساسي"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="select-dots">
        {ARCHETYPES.map((a, i) => (
          <button
            key={a.id}
            className={"select-dot" + (i === index ? " active" : "")}
            style={i === index ? { background: a.accentColor } : undefined}
            onClick={() => setIndex(i)}
            aria-label={a.nameAr}
          />
        ))}
      </div>

      <button className="start-btn" onClick={() => onConfirm(archetype.id)}>
        اختر {archetype.nameAr}
      </button>
    </div>
  );
}
