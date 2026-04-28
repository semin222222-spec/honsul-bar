import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import RankingList from "./RankingList";
import { useLocale } from "../lib/LocaleContext";

const GLASS_W = 48;
const GLASS_H = 32;
const GAME_W = 300;
const GAME_H = 340;
const TOLERANCE = 24;

function WhiskeyGlass({ style }) {
  return (
    <div style={{ width: GLASS_W, height: GLASS_H, position: "relative", ...style }}>
      <div style={{
        position: "absolute", bottom: 6, left: "10%", right: "10%", height: "70%",
        background: "linear-gradient(180deg, rgba(212,165,55,0.2) 0%, rgba(180,120,40,0.35) 100%)",
        border: "1.5px solid rgba(212,165,55,0.3)",
        borderRadius: "2px 2px 4px 4px", borderTop: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 1, right: 1, height: "60%",
          background: "linear-gradient(180deg, rgba(212,165,55,0.5), rgba(160,100,30,0.6))",
          borderRadius: "0 0 3px 3px",
        }} />
      </div>
      <div style={{
        position: "absolute", top: 2, left: "5%", right: "5%", height: 3,
        background: "rgba(255,255,255,0.15)", borderRadius: 2,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: "20%", right: "20%", height: 4,
        background: "rgba(212,165,55,0.25)", borderRadius: "0 0 2px 2px",
      }} />
      <div style={{
        position: "absolute", bottom: 3, left: "42%", right: "42%", height: 4,
        background: "rgba(212,165,55,0.2)",
      }} />
    </div>
  );
}

function getSpeed(score) {
  if (score < 3) return 1.2;
  if (score < 5) return 1.8;
  if (score < 8) return 2.5;
  if (score < 10) return 3.2;
  if (score < 15) return 4.0;
  if (score < 20) return 5.0;
  return Math.min(5.5 + (score - 20) * 0.15, 8);
}

export default function StackingGame() {
  const [phase, setPhase] = useState("menu");
  const [stack, setStack] = useState([]);
  const [movingX, setMovingX] = useState(0);
  const [dirRef, setDirRef] = useState(1);
  const [score, setScore] = useState(0);
  const [dropping, setDropping] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flashFail, setFlashFail] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [landed, setLanded] = useState(false);
  const animRef = useRef(null);
  const directionRef = useRef(1);
  const speedRef = useRef(1.2);
  const movingXRef = useRef(0);
  const { locale } = useLocale();

  const centerX = (GAME_W - GLASS_W) / 2;
  const minX = 0;
  const maxX = GAME_W - GLASS_W;

  const startGame = () => {
    setPhase("playing");
    setStack([{ x: centerX }]);
    setMovingX(0);
    movingXRef.current = 0;
    directionRef.current = 1;
    setDirRef(1);
    setScore(0);
    setDropping(false);
    setFailed(false);
    setLanded(false);
    setSaved(false);
    setNickname("");
    speedRef.current = getSpeed(0);
  };

  useEffect(() => {
    if (phase !== "playing" || dropping) return;

    let lastTime = performance.now();

    const move = (now) => {
      const delta = (now - lastTime) / 16;
      lastTime = now;

      const speed = speedRef.current * delta;
      let nextX = movingXRef.current + directionRef.current * speed;

      if (nextX > maxX) {
        directionRef.current = -1;
        nextX = maxX;
      } else if (nextX < minX) {
        directionRef.current = 1;
        nextX = minX;
      }

      movingXRef.current = nextX;
      setMovingX(nextX);
      animRef.current = requestAnimationFrame(move);
    };

    animRef.current = requestAnimationFrame(move);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, dropping]);

  const dropGlass = useCallback(() => {
    if (phase !== "playing" || dropping) return;
    setDropping(true);

    const lastGlass = stack[stack.length - 1];
    const targetX = lastGlass.x;
    const currentX = movingXRef.current;
    const diff = Math.abs(currentX - targetX);

    if (diff > TOLERANCE) {
      setFailed(true);
      setFlashFail(true);
      setTimeout(() => setFlashFail(false), 400);
      setTimeout(() => setPhase("gameover"), 800);
    } else {
      const landX = (currentX + targetX) / 2;
      const newScore = score + 1;
      setStack(prev => [...prev, { x: landX }]);
      setScore(newScore);
      speedRef.current = getSpeed(newScore);
      setLanded(true);

      setTimeout(() => {
        setLanded(false);
        setDropping(false);
        directionRef.current = Math.random() > 0.5 ? 1 : -1;
        const startX = directionRef.current > 0 ? minX : maxX;
        movingXRef.current = startX;
        setMovingX(startX);
      }, 350);
    }
  }, [phase, dropping, stack, score]);

  const saveScore = async () => {
    if (!nickname.trim() || saving) return;
    setSaving(true);
    await supabase.from("game_rankings").insert({ nickname: nickname.trim(), score });
    setSaving(false);
    setSaved(true);
  };

  const maxVisible = 8;
  const stackBottom = GAME_H - 8;

  // 게임 오버 시 점수에 따른 메시지
  const getGameOverMessage = () => {
    if (locale === "ja") {
      if (score >= 15) return "レジェンド! バーテンダー級の実力!";
      if (score >= 10) return "すごい! プロ級!";
      if (score >= 5) return "悪くないですね!";
      return "もう一度挑戦してみてください!";
    } else {
      if (score >= 15) return "레전드! 바텐더급 실력!";
      if (score >= 10) return "대단해요! 프로 수준!";
      if (score >= 5) return "나쁘지 않아요!";
      return "다시 도전해 보세요!";
    }
  };

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
        WHISKY STACK
      </div>
      <div style={{
        fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
        fontFamily: "'Noto Serif KR', serif", marginBottom: "clamp(12px, 4vw, 20px)",
      }}>
        {locale === "ja" ? "ウイスキーグラス積み" : "위스키 잔 쌓기"}
      </div>

      <AnimatePresence>
        {flashFail && (
          <motion.div initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(226,75,74,0.3)", pointerEvents: "none" }} />
        )}
      </AnimatePresence>

      {phase === "menu" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,165,55,0.12)",
            borderRadius: 18, padding: "32px 24px", textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🥃</div>
            <div style={{ fontSize: 16, color: "#F5E6C8", marginBottom: 8, fontWeight: 500 }}>
              {locale === "ja"
                ? "ウイスキーグラスをできるだけ高く積み上げてください!"
                : "위스키 잔을 최대한 높이 쌓아보세요!"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: 24 }}>
              {locale === "ja" ? (
                <>
                  タイミングよく画面をタップしてください。<br />
                  グラスが正確に積まれれば成功!<br />
                  高くなるほど速くなります。
                </>
              ) : (
                <>
                  타이밍에 맞춰 화면을 탭하세요.<br />
                  잔이 정확히 쌓이면 성공!<br />
                  높이 올라갈수록 속도가 빨라져요.
                </>
              )}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={startGame}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 32px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #D4A537, #B8860B)",
                color: "#0D0B08", fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", minHeight: 48,
                WebkitTapHighlightColor: "transparent",
              }}>
              <Play size={18} /> {locale === "ja" ? "ゲーム開始" : "게임 시작"}
            </motion.button>
          </div>
          <RankingList />
        </motion.div>
      )}

      {phase === "playing" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <motion.div key={score} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 36, fontWeight: 200, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>
              {score}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                {locale === "ja" ? "階" : "층"}
              </span>
            </motion.div>
          </div>

          <div onClick={dropGlass} style={{
            position: "relative", width: GAME_W, height: GAME_H,
            margin: "0 auto",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, overflow: "hidden",
            cursor: "pointer", WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}>
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
              background: "rgba(212,165,55,0.15)",
            }} />

            {/* 중앙 가이드 라인 */}
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: "50%", width: 1, transform: "translateX(-0.5px)",
              background: "rgba(212,165,55,0.06)",
            }} />

            {/* 쌓인 잔들 */}
            {stack.map((glass, i) => {
              const visibleIdx = i - Math.max(0, stack.length - maxVisible);
              if (visibleIdx < 0) return null;
              const yPos = stackBottom - (visibleIdx + 1) * GLASS_H;
              return (
                <motion.div key={i}
                  initial={i > 0 ? { y: yPos - 20, opacity: 0 } : false}
                  animate={{ y: yPos, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ position: "absolute", left: glass.x }}
                >
                  <WhiskeyGlass />
                </motion.div>
              );
            })}

            {/* 움직이는 잔 */}
            {!dropping && !failed && (
              <div style={{ position: "absolute", left: movingX, top: 16 }}>
                <WhiskeyGlass />
              </div>
            )}

            {/* 떨어지는 잔 (성공) */}
            {dropping && !failed && (
              <motion.div
                initial={{ top: 16 }}
                animate={{
                  top: stackBottom - (Math.min(stack.length, maxVisible)) * GLASS_H,
                }}
                transition={{ type: "spring", stiffness: 350, damping: 18 }}
                style={{ position: "absolute", left: movingXRef.current }}
              >
                <WhiskeyGlass />
              </motion.div>
            )}

            {/* 실패 잔 */}
            {failed && (
              <motion.div
                initial={{ top: 16, rotate: 0, opacity: 1 }}
                animate={{ top: GAME_H + 30, rotate: 55, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeIn" }}
                style={{ position: "absolute", left: movingXRef.current }}
              >
                <WhiskeyGlass />
              </motion.div>
            )}

            <div style={{
              position: "absolute", bottom: 10, left: 0, right: 0,
              textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.12)",
              pointerEvents: "none",
            }}>TAP TO DROP</div>
          </div>

          <div style={{ textAlign: "center", marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
            {locale === "ja" ? "速度" : "속도"}: {"●".repeat(Math.min(Math.round(speedRef.current), 8))}{"○".repeat(Math.max(0, 8 - Math.round(speedRef.current)))}
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,165,55,0.12)",
            borderRadius: 18, padding: "28px 24px", textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {score >= 15 ? "🏆" : score >= 10 ? "🎉" : score >= 5 ? "👏" : "🥃"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>GAME OVER</div>
            <div style={{
              fontSize: 42, fontWeight: 200, color: "#D4A537",
              fontFamily: "'Noto Serif KR', serif", marginBottom: 4,
            }}>
              {score}<span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                {locale === "ja" ? "階" : "층"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
              {getGameOverMessage()}
            </div>

            {!saved ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input value={nickname} onChange={e => setNickname(e.target.value)}
                  placeholder={locale === "ja" ? "ニックネーム入力" : "닉네임 입력"} maxLength={10}
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F5E6C8", fontSize: 16, outline: "none", fontFamily: "inherit",
                    WebkitAppearance: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(212,165,55,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={saveScore}
                  disabled={!nickname.trim() || saving}
                  style={{
                    padding: "12px 16px", borderRadius: 10, border: "none",
                    background: nickname.trim() ? "linear-gradient(135deg, #D4A537, #B8860B)" : "rgba(255,255,255,0.06)",
                    color: nickname.trim() ? "#0D0B08" : "rgba(255,255,255,0.2)",
                    fontSize: 13, fontWeight: 600, cursor: nickname.trim() ? "pointer" : "default",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                    WebkitTapHighlightColor: "transparent", minHeight: 44,
                  }}>
                  <Send size={14} /> {locale === "ja" ? "登録" : "등록"}
                </motion.button>
              </div>
            ) : (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(106,176,106,0.08)", border: "1px solid rgba(106,176,106,0.15)",
                  color: "#6AB06A", fontSize: 13, fontWeight: 500, marginBottom: 16,
                }}>
                {locale === "ja" ? "記録が登録されました!" : "기록이 등록되었어요!"}
              </motion.div>
            )}

            <motion.button whileTap={{ scale: 0.95 }} onClick={startGame}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px", borderRadius: 12,
                background: "rgba(212,165,55,0.12)", border: "1px solid rgba(212,165,55,0.2)",
                color: "#D4A537", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent", minHeight: 44,
              }}>
              <RotateCcw size={16} /> {locale === "ja" ? "再挑戦" : "다시 도전"}
            </motion.button>
          </div>
          <RankingList />
        </motion.div>
      )}
    </div>
  );
}
