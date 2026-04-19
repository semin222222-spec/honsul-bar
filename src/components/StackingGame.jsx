import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import RankingList from "./RankingList";

const GLASS_W = 48;
const GLASS_H = 32;
const GAME_W = 320;
const TOLERANCE = 22;

function WhiskeyGlass({ x, y, falling, landed, failed, width }) {
  const w = width || GLASS_W;
  return (
    <motion.div
      initial={falling ? { y: -60, opacity: 1 } : { opacity: 1 }}
      animate={
        failed
          ? { y: y, x: x, rotate: 45, opacity: 0 }
          : falling
          ? { y: y }
          : { y: y, x: x }
      }
      transition={
        falling
          ? { type: "spring", stiffness: 400, damping: 20 }
          : failed
          ? { duration: 0.5, ease: "easeIn" }
          : { duration: 0.05 }
      }
      style={{
        position: "absolute",
        left: x,
        width: w,
        height: GLASS_H,
        zIndex: 10,
      }}
    >
      {/* 잔 모양 */}
      <div style={{
        width: "100%", height: "100%", position: "relative",
      }}>
        {/* 잔 몸체 */}
        <div style={{
          position: "absolute", bottom: 6, left: "10%", right: "10%",
          height: "70%",
          background: "linear-gradient(180deg, rgba(212,165,55,0.2) 0%, rgba(180,120,40,0.35) 100%)",
          border: "1.5px solid rgba(212,165,55,0.3)",
          borderRadius: "2px 2px 4px 4px",
          borderTop: "none",
        }}>
          {/* 위스키 액체 */}
          <div style={{
            position: "absolute", bottom: 0, left: 1, right: 1,
            height: "60%",
            background: "linear-gradient(180deg, rgba(212,165,55,0.5), rgba(160,100,30,0.6))",
            borderRadius: "0 0 3px 3px",
          }} />
        </div>
        {/* 잔 입구 */}
        <div style={{
          position: "absolute", top: 2, left: "5%", right: "5%",
          height: 3,
          background: "rgba(255,255,255,0.15)",
          borderRadius: 2,
        }} />
        {/* 받침대 */}
        <div style={{
          position: "absolute", bottom: 0, left: "20%", right: "20%",
          height: 4,
          background: "rgba(212,165,55,0.25)",
          borderRadius: "0 0 2px 2px",
        }} />
        {/* 기둥 */}
        <div style={{
          position: "absolute", bottom: 3, left: "42%", right: "42%",
          height: 4,
          background: "rgba(212,165,55,0.2)",
        }} />
      </div>
    </motion.div>
  );
}

export default function StackingGame() {
  const [phase, setPhase] = useState("menu");
  const [stack, setStack] = useState([]);
  const [movingX, setMovingX] = useState(0);
  const [direction, setDirection] = useState(1);
  const [score, setScore] = useState(0);
  const [dropping, setDropping] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flashFail, setFlashFail] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const animRef = useRef(null);
  const speedRef = useRef(2.5);

  const centerX = (GAME_W - GLASS_W) / 2;

  const startGame = () => {
    setPhase("playing");
    setStack([{ x: centerX, y: 0 }]);
    setMovingX(0);
    setDirection(1);
    setScore(0);
    setDropping(false);
    setFailed(false);
    setSaved(false);
    setNickname("");
    speedRef.current = 2.5;
  };

  // 잔 움직이기
  useEffect(() => {
    if (phase !== "playing" || dropping) return;

    const move = () => {
      setMovingX(prev => {
        let next = prev + direction * speedRef.current;
        if (next > GAME_W - GLASS_W) {
          setDirection(-1);
          next = GAME_W - GLASS_W;
        } else if (next < 0) {
          setDirection(1);
          next = 0;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(move);
    };

    animRef.current = requestAnimationFrame(move);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, dropping, direction]);

  const dropGlass = useCallback(() => {
    if (phase !== "playing" || dropping) return;
    setDropping(true);

    const targetX = stack.length > 0 ? stack[stack.length - 1].x : centerX;
    const diff = Math.abs(movingX - targetX);

    if (diff > TOLERANCE) {
      // 실패
      setFailed(true);
      setFlashFail(true);
      setTimeout(() => setFlashFail(false), 400);
      setTimeout(() => {
        setPhase("gameover");
      }, 800);
    } else {
      // 성공
      const landX = (movingX + targetX) / 2;
      const newScore = score + 1;
      setStack(prev => [...prev, { x: landX, y: 0 }]);
      setScore(newScore);
      speedRef.current = Math.min(2.5 + newScore * 0.3, 8);

      setTimeout(() => {
        setDropping(false);
        setDirection(Math.random() > 0.5 ? 1 : -1);
        setMovingX(Math.random() > 0.5 ? 0 : GAME_W - GLASS_W);
      }, 300);
    }
  }, [phase, dropping, movingX, stack, score, centerX]);

  // 점수 저장
  const saveScore = async () => {
    if (!nickname.trim() || saving) return;
    setSaving(true);
    await supabase.from("game_rankings").insert({
      nickname: nickname.trim(),
      score: score,
    });
    setSaving(false);
    setSaved(true);
  };

  // 게임 영역 높이 계산
  const visibleHeight = 280;
  const stackOffset = Math.max(0, (stack.length - 6) * GLASS_H);

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
        WHISKY STACK
      </div>
      <div style={{
        fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
        fontFamily: "'Cormorant Garamond', serif", marginBottom: "clamp(16px, 5vw, 24px)",
      }}>
        위스키 잔 쌓기
      </div>

      {/* 실패 플래시 */}
      <AnimatePresence>
        {flashFail && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              background: "rgba(226,75,74,0.25)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* 메인 메뉴 */}
      {phase === "menu" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(212,165,55,0.12)",
            borderRadius: 18, padding: "32px 24px",
            textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🥃</div>
            <div style={{
              fontSize: 16, color: "#F5E6C8", marginBottom: 8, fontWeight: 500,
            }}>
              위스키 잔을 최대한 높이 쌓아보세요!
            </div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: 24,
            }}>
              타이밍에 맞춰 화면을 탭하세요.<br />
              잔이 정확히 쌓이면 성공!<br />
              높이 올라갈수록 속도가 빨라져요.
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 32px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #D4A537, #B8860B)",
                color: "#0D0B08", fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent", minHeight: 48,
              }}
            >
              <Play size={18} /> 게임 시작
            </motion.button>
          </div>

          <RankingList />
        </motion.div>
      )}

      {/* 게임 플레이 */}
      {phase === "playing" && (
        <div>
          {/* 점수 표시 */}
          <div style={{
            textAlign: "center", marginBottom: 12,
          }}>
            <motion.div
              key={score}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                fontSize: 36, fontWeight: 200, color: "#D4A537",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              {score}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>층</span>
            </motion.div>
          </div>

          {/* 게임 영역 */}
          <div
            onClick={dropGlass}
            style={{
              position: "relative",
              width: GAME_W, height: visibleHeight,
              margin: "0 auto",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              overflow: "hidden",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {/* 바닥 라인 */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
              background: "rgba(212,165,55,0.15)",
            }} />

            {/* 쌓인 잔들 */}
            {stack.map((glass, i) => (
              <WhiskeyGlass
                key={i}
                x={glass.x}
                y={visibleHeight - (i + 1 - Math.max(0, stack.length - 7)) * GLASS_H - 3}
                landed
              />
            ))}

            {/* 움직이는 잔 */}
            {!dropping && !failed && (
              <WhiskeyGlass
                x={movingX}
                y={12}
              />
            )}

            {/* 떨어지는 잔 */}
            {dropping && !failed && (
              <WhiskeyGlass
                x={movingX}
                y={visibleHeight - (stack.length - Math.max(0, stack.length - 7)) * GLASS_H - 3}
                falling
              />
            )}

            {/* 실패 잔 */}
            {failed && (
              <WhiskeyGlass
                x={movingX}
                y={visibleHeight + 50}
                failed
              />
            )}

            {/* 탭 안내 */}
            <div style={{
              position: "absolute", bottom: 10, left: 0, right: 0,
              textAlign: "center", fontSize: 11,
              color: "rgba(255,255,255,0.15)",
              pointerEvents: "none",
            }}>
              TAP TO DROP
            </div>
          </div>

          {/* 속도 표시 */}
          <div style={{
            textAlign: "center", marginTop: 10,
            fontSize: 10, color: "rgba(255,255,255,0.2)",
          }}>
            속도: {"●".repeat(Math.min(Math.ceil(speedRef.current), 8))}{"○".repeat(Math.max(0, 8 - Math.ceil(speedRef.current)))}
          </div>
        </div>
      )}

      {/* 게임 오버 */}
      {phase === "gameover" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(212,165,55,0.12)",
            borderRadius: 18, padding: "28px 24px",
            textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {score >= 10 ? "🏆" : score >= 5 ? "🎉" : "🥃"}
            </div>
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4,
            }}>GAME OVER</div>
            <div style={{
              fontSize: 42, fontWeight: 200, color: "#D4A537",
              fontFamily: "'Cormorant Garamond', serif", marginBottom: 4,
            }}>
              {score}<span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>층</span>
            </div>
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20,
            }}>
              {score >= 10 ? "대단해요! 바텐더급 실력!" : score >= 5 ? "나쁘지 않아요!" : "다시 도전해 보세요!"}
            </div>

            {/* 닉네임 입력 & 저장 */}
            {!saved ? (
              <div style={{
                display: "flex", gap: 8, marginBottom: 16,
              }}>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="닉네임 입력"
                  maxLength={10}
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F5E6C8", fontSize: 14,
                    outline: "none", fontFamily: "inherit",
                    WebkitAppearance: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(212,165,55,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={saveScore}
                  disabled={!nickname.trim() || saving}
                  style={{
                    padding: "12px 16px", borderRadius: 10, border: "none",
                    background: nickname.trim() ? "linear-gradient(135deg, #D4A537, #B8860B)" : "rgba(255,255,255,0.06)",
                    color: nickname.trim() ? "#0D0B08" : "rgba(255,255,255,0.2)",
                    fontSize: 13, fontWeight: 600, cursor: nickname.trim() ? "pointer" : "default",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                    WebkitTapHighlightColor: "transparent", minHeight: 44,
                  }}
                >
                  <Send size={14} /> 등록
                </motion.button>
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(106,176,106,0.08)",
                  border: "1px solid rgba(106,176,106,0.15)",
                  color: "#6AB06A", fontSize: 13, fontWeight: 500,
                  marginBottom: 16,
                }}
              >
                기록이 등록되었어요!
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: "rgba(212,165,55,0.12)",
                border: "1px solid rgba(212,165,55,0.2)",
                color: "#D4A537", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent", minHeight: 44,
              }}
            >
              <RotateCcw size={16} /> 다시 도전
            </motion.button>
          </div>

          <RankingList />
        </motion.div>
      )}
    </div>
  );
}