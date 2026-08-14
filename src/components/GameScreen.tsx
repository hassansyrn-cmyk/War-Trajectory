import React, { useEffect, useRef, useState } from "react";
import { Difficulty, MapDef, MatchModifier, SKILLS, archetypeById } from "../game/entities";
import {
  GameState,
  aiChooseAndFire,
  canFire,
  canUseSkill,
  createGame,
  fire,
  movePlayer,
  selectWeapon,
  update as engineUpdate,
  useSkill,
  weaponById,
} from "../game/engine";
import { draw } from "../game/render";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../game/physics";
import * as audio from "../game/audio";
import { recordResult } from "../game/storage";
import { loadAssets } from "../game/assets";

interface Props {
  map: MapDef;
  difficulty: Difficulty;
  archetypeId: string;
  modifier: MatchModifier | null;
  training: boolean;
  muted: boolean;
  onExit: () => void;
}

interface Viewport {
  cssScale: number;
  cssOffsetX: number;
  cssOffsetY: number;
  deviceScale: number;
  deviceOffsetX: number;
  deviceOffsetY: number;
}

export default function GameScreen({ map, difficulty, archetypeId, modifier, training, muted, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<GameState>(createGame(map, difficulty, archetypeId, Date.now(), modifier));
  const viewportRef = useRef<Viewport>({ cssScale: 1, cssOffsetX: 0, cssOffsetY: 0, deviceScale: 1, deviceOffsetX: 0, deviceOffsetY: 0 });
  const aimRef = useRef({ active: false, dragX: 0, dragY: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const moveDirRef = useRef<1 | -1 | 0>(0);
  const aiTimerRef = useRef<number | null>(null);
  const aiScheduledRoundRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const resultRecordedRef = useRef(false);
  const lastUiSyncRef = useRef(0);

  const [, setTick] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAssets()
      .catch(() => {
        /* renderer falls back to simple shapes per-sprite */
      })
      .finally(() => {
        if (!cancelled) setAssetsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const unlock = () => audio.unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resize() {
      const rect = container!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      canvas!.style.width = rect.width + "px";
      canvas!.style.height = rect.height + "px";
      const fitScale = Math.min(rect.width / WORLD_WIDTH, rect.height / WORLD_HEIGHT);
      const cssOffsetX = (rect.width - WORLD_WIDTH * fitScale) / 2;
      const cssOffsetY = (rect.height - WORLD_HEIGHT * fitScale) / 2;
      viewportRef.current = {
        cssScale: fitScale,
        cssOffsetX,
        cssOffsetY,
        deviceScale: fitScale * dpr,
        deviceOffsetX: cssOffsetX * dpr,
        deviceOffsetY: cssOffsetY * dpr,
      };
    }
    resize();
    // ResizeObserver catches layout changes from the drawer expanding/
    // collapsing too, not just real window resizes.
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("orientationchange", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    };
  }, []);

  useEffect(() => {
    if (!assetsReady) return;
    function loop(ts: number) {
      const state = stateRef.current;
      const last = lastTsRef.current ?? ts;
      const dt = Math.min((ts - last) / 1000, 0.1);
      lastTsRef.current = ts;

      const prevPhase = state.phase;

      // Continuous hold-to-walk movement, resolved before physics/camera so
      // the same frame's aim guide reflects the latest position.
      state.players.p1.isMoving = false;
      state.players.p2.isMoving = false;
      if (moveDirRef.current !== 0) {
        const moved = movePlayer(state, "p1", moveDirRef.current, dt);
        if (moved && Math.random() < 0.15) audio.sfxDraw();
      }

      engineUpdate(state, dt);

      if (prevPhase === "flying" && !state.projectile && state.phase === "resolving") {
        audio.sfxImpact();
      }
      if (state.phase === "gameOver" && !resultRecordedRef.current) {
        resultRecordedRef.current = true;
        const playerWon = state.winner === "p1";
        if (!training) recordResult({ won: playerWon, archetypeId, headshots: state.headshots, dailyChallenge: Boolean(modifier) });
        if (playerWon) audio.sfxWin();
        else audio.sfxLose();
      }
      if (state.turn === "p2" && state.phase === "aiming" && aiScheduledRoundRef.current !== state.round) {
        aiScheduledRoundRef.current = state.round;
        const delay = 650 + Math.random() * 700;
        aiTimerRef.current = window.setTimeout(() => {
          if (stateRef.current.phase === "aiming" && stateRef.current.turn === "p2") {
            aiChooseAndFire(stateRef.current, "p2");
            audio.sfxFire(0.7);
          }
        }, delay);
      }
      if (state.turn === "p1" && state.phase === "aiming" && aiScheduledRoundRef.current !== state.round) {
        aiScheduledRoundRef.current = state.round;
        audio.sfxTurn();
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const vp = viewportRef.current;
        draw(ctx, state, aimRef.current, vp.deviceScale, vp.deviceOffsetX, vp.deviceOffsetY);
      }

      if (ts - lastUiSyncRef.current > 110) {
        lastUiSyncRef.current = ts;
        setTick((t) => (t + 1) % 1000000);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsReady]);

  function screenToWorldDelta(dxCss: number, dyCss: number) {
    const vp = viewportRef.current;
    return { x: dxCss / vp.cssScale, y: dyCss / vp.cssScale };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const state = stateRef.current;
    if (!assetsReady || state.turn !== "p1" || state.phase !== "aiming" || drawerOpen) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    aimRef.current = { active: true, dragX: 0, dragY: 0 };
    audio.unlockAudio();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!aimRef.current.active) return;
    const dxCss = e.clientX - dragStartRef.current.x;
    const dyCss = e.clientY - dragStartRef.current.y;
    const delta = screenToWorldDelta(dxCss, dyCss);
    aimRef.current = { active: true, dragX: delta.x, dragY: delta.y };
  }

  function onPointerUp() {
    if (!aimRef.current.active) return;
    const state = stateRef.current;
    const { dragX, dragY } = aimRef.current;
    aimRef.current = { active: false, dragX: 0, dragY: 0 };
    if (Math.hypot(dragX, dragY) < 8) return;
    if (canFire(state, "p1")) {
      fire(state, "p1", dragX, dragY);
      audio.sfxFire(0.7);
    }
  }

  function startMove(dir: 1 | -1) {
    if (!assetsReady) return;
    moveDirRef.current = dir;
    audio.unlockAudio();
  }

  function stopMove() {
    moveDirRef.current = 0;
  }

  const state = stateRef.current;
  const p1 = state.players.p1;
  const p2 = state.players.p2;
  const p1Archetype = archetypeById(p1.archetype);
  const p2Archetype = archetypeById(p2.archetype);
  const myTurn = state.turn === "p1" && state.phase === "aiming";
  const selectedWeaponId = state.selectedWeapon.p1;
  const selectedWeapon = weaponById(selectedWeaponId);
  const selectedAmmo = p1.ammo[selectedWeaponId];
  const staminaRatio = Math.max(0, p1.stamina / p1.maxStamina);

  function handleSelectWeapon(id: string) {
    if (!myTurn) return;
    selectWeapon(state, "p1", id);
    audio.sfxDraw();
    setDrawerOpen(false);
  }

  function handleSkill(id: string) {
    if (!myTurn || !canUseSkill(state, "p1", id)) return;
    useSkill(state, "p1", id);
    audio.sfxSkill();
  }

  function rematch() {
    stateRef.current = createGame(map, difficulty, archetypeId, Date.now(), modifier);
    resultRecordedRef.current = false;
    aiScheduledRoundRef.current = -1;
    moveDirRef.current = 0;
    setDrawerOpen(false);
  }

  return (
    <div className="game-root">
      <div className="rotate-prompt">
        <span className="rotate-prompt-icon">📱</span>
        <p>أدر جهازك إلى الوضع الأفقي للعب</p>
      </div>
      {!assetsReady && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="loading-spinner" />
            <p>جاري تحميل المحاربين...</p>
          </div>
        </div>
      )}
      {(training || modifier || state.map.effect) && <div className="match-mode-badge">{training ? "تدريب: طبّق السحب والحركة والرياح" : modifier ? `${modifier.nameAr}: ${modifier.descriptionAr}` : `${state.map.effectLabelAr}: ${state.map.effectDescriptionAr}`}</div>}
      <div className="hud-top">
        <div className={"hud-player p1" + (state.turn === "p1" ? " active" : "")}>
          <span
            className="hud-portrait"
            style={{
              backgroundImage: `url(assets/sprites/warriors/${p1.archetype}.png)`,
              backgroundSize: "300% 100%",
              backgroundPosition: "0% 50%",
              borderColor: p1Archetype.accentColor,
            }}
          />
          <span className="hud-info">
            <span className="hud-name">{p1.nameAr} · {p1Archetype.nameAr}</span>
            <span className="hud-hp">{Math.round(p1.hp)}/{p1.maxHp}</span>
          </span>
        </div>
        <div className="hud-center">
          <button className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="خروج">
            ✕
          </button>
          <span className="hud-round">جولة {state.round}</span>
        </div>
        <div className={"hud-player p2" + (state.turn === "p2" ? " active" : "")}>
          <span className="hud-info">
            <span className="hud-hp">{Math.round(p2.hp)}/{p2.maxHp}</span>
            <span className="hud-name">{p2Archetype.nameAr} · {p2.nameAr}</span>
          </span>
          <span
            className="hud-portrait"
            style={{
              backgroundImage: `url(assets/sprites/warriors/${p2.archetype}.png)`,
              backgroundSize: "300% 100%",
              backgroundPosition: "0% 50%",
              borderColor: p2Archetype.accentColor,
            }}
          />
        </div>
      </div>

      <div className="canvas-wrap" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {myTurn && !aimRef.current.active && !drawerOpen && (
          <div className="aim-hint">اسحب في أي مكان لتحديد الزاوية والقوة ثم حرر للإطلاق</div>
        )}
        {!myTurn && state.phase !== "gameOver" && <div className="aim-hint dim">دور الخصم...</div>}

        {myTurn && (
          <div className="move-controls">
            <div className="stamina-bar-wrap">
              <div className="stamina-bar" style={{ width: `${staminaRatio * 100}%` }} />
            </div>
            <div className="move-buttons">
              <button
                className="move-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startMove(-1);
                }}
                onPointerUp={stopMove}
                onPointerLeave={stopMove}
                onPointerCancel={stopMove}
                disabled={p1.stamina <= 0}
                aria-label="تحرك يساراً"
              >
                ◀
              </button>
              <button
                className="move-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startMove(1);
                }}
                onPointerUp={stopMove}
                onPointerLeave={stopMove}
                onPointerCancel={stopMove}
                disabled={p1.stamina <= 0}
                aria-label="تحرك يميناً"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hud-bottom">
        {drawerOpen && (
          <>
            <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />
            <div className="weapon-row expanded">
              {p1Archetype.loadout.map((slot) => {
                const w = weaponById(slot.weaponId);
                const ammo = p1.ammo[w.id];
                const infinite = !Number.isFinite(ammo);
                const disabled = !infinite && ammo <= 0;
                return (
                  <button
                    key={w.id}
                    className={"weapon-btn" + (selectedWeaponId === w.id ? " selected" : "") + (disabled ? " disabled" : "")}
                    onClick={() => handleSelectWeapon(w.id)}
                    disabled={!myTurn || disabled}
                    style={{ borderColor: w.colorMain }}
                  >
                    <span
                      className="weapon-icon"
                      style={{ backgroundColor: w.colorMain, backgroundImage: `url(assets/sprites/weapons/${w.type}.png)` }}
                    />
                    <span className="weapon-name">{w.nameAr}</span>
                    <span className="weapon-ammo">{infinite ? "∞" : ammo}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="drawer-collapsed-row">
          <button className="weapon-capsule" onClick={() => setDrawerOpen((v) => !v)} disabled={!myTurn}>
            <span
              className="weapon-icon small"
              style={{ backgroundColor: selectedWeapon.colorMain, backgroundImage: `url(assets/sprites/weapons/${selectedWeapon.type}.png)` }}
            />
            <span className="weapon-name">{selectedWeapon.nameAr}</span>
            <span className="weapon-ammo">{Number.isFinite(selectedAmmo) ? selectedAmmo : "∞"}</span>
            <span className={"chevron" + (drawerOpen ? " open" : "")}>‹</span>
          </button>

          <div className="skill-row">
            {SKILLS.map((s) => {
              const cd = p1.cooldowns[s.id];
              const usable = canUseSkill(state, "p1", s.id);
              return (
                <button
                  key={s.id}
                  className={"skill-btn" + (usable ? " ready" : "")}
                  onClick={() => handleSkill(s.id)}
                  disabled={!myTurn || !usable}
                  title={s.descAr}
                >
                  <span className="skill-name">{s.nameAr}</span>
                  <span className="skill-meta">{cd > 0 ? `⏳${cd}` : `⚡${s.cost}`}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="energy-pips">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={"pip" + (i < p1.energy ? " filled" : "")} />
          ))}
        </div>
      </div>

      {state.phase === "gameOver" && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>{state.winner === "p1" ? "🏆 فزت بالمباراة!" : "خسرت هذه الجولة"}</h2>
            <p>{training ? "انتهى التدريب. أصبحت جاهزاً للمباراة الحقيقية." : state.winner === "p1" ? `أحسنت! حققت ${state.headshots} إصابة بالرأس.` : "لا بأس، حاول مجدداً وعدّل تكتيكك."}</p>
            <div className="overlay-actions">
              <button className="primary-btn" onClick={rematch}>
                مباراة جديدة
              </button>
              <button className="secondary-btn" onClick={onExit}>
                القائمة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmQuit && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>الخروج من المباراة؟</h2>
            <p>سيتم فقدان التقدم في هذه الجولة.</p>
            <div className="overlay-actions">
              <button className="primary-btn" onClick={onExit}>
                نعم، خروج
              </button>
              <button className="secondary-btn" onClick={() => setConfirmQuit(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
