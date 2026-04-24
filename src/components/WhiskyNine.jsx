import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, LogOut, RotateCcw, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import RankingList from "./RankingList";

const isOdd = (n) => n % 2 === 1;
const cardColor = (n) => (isOdd(n) ? "black" : "white");

// ★ 판정 로직: 1은 9를 잡는다
function judge(a, b) {
  if (a === b) return "draw";
  if (a === 1 && b === 9) return "win"; // a(나) 승
  if (a === 9 && b === 1) return "lose";
  return a > b ? "win" : "lose";
}
const isUpset = (a, b) => (a === 1 && b === 9) || (a === 9 && b === 1);

// ───── 흑/백 카드 디자인 ─────
function Card({ num, selected, used, onClick, size = "hand", highlight }) {
  const color = cardColor(num);
  const isSpecial = num === 1 || num === 9;

  const sizes = {
    hand: { w: "100%", h: "auto", aspectRatio: "2/2.8", font: 18 },
    reveal: { w: 62, h: 80, font: 32 },
    slot: { w: "100%", h: 32, font: 13 },
  };
  const s = sizes[size];

  const baseBg =
    color === "black"
      ? "linear-gradient(135deg, #2a1f15, #0a0604)"
      : "linear-gradient(135deg, #f0e4c8, #c4aa82)";
  const baseColor = color === "black" ? "#D4A537" : "#2a1e10";

  return (
    <motion.div
      whileTap={onClick && !used ? { scale: 0.88 } : {}}
      onClick={!used ? onClick : undefined}
      style={{
        width: s.w,
        height: s.h,
        aspectRatio: s.aspectRatio,
        borderRadius: size === "slot" ? 5 : 9,
        border: "1.5px solid " + (selected ? "#D4A537" : color === "white" ? "rgba(212,165,55,0.4)" : "rgba(212,165,55,0.25)"),
        background: baseBg,
        color: baseColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Serif KR', serif",
        fontSize: s.font,
        fontWeight: 500,
        cursor: onClick && !used ? "pointer" : "default",
        position: "relative",
        transition: "all 0.2s",
        transform: selected ? "translateY(-6px)" : "none",
        boxShadow: selected
          ? "0 0 14px rgba(212,165,55,0.5)"
          : highlight === "win"
          ? "0 0 16px rgba(106,176,106,0.45)"
          : size === "reveal"
          ? "0 4px 20px rgba(0,0,0,0.4)"
          : "none",
        opacity: used ? 0.15 : highlight === "lose" ? 0.5 : 1,
        pointerEvents: used ? "none" : "auto",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {num}
      {isSpecial && size === "hand" && !used && (
        <span
          style={{
            position: "absolute",
            top: 3,
            right: 3,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#D4A537",
            boxShadow: "0 0 4px #D4A537",
          }}
        />
      )}
      {used && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.35) 3px,rgba(0,0,0,0.35) 4px)",
            borderRadius: size === "slot" ? 4 : 8,
          }}
        />
      )}
    </motion.div>
  );
}

function HiddenCard({ size = "reveal" }) {
  const s = size === "reveal" ? { w: 62, h: 80 } : { w: "100%", aspectRatio: "2/2.8" };
  return (
    <div
      style={{
        width: s.w,
        height: s.h,
        aspectRatio: s.aspectRatio,
        borderRadius: 10,
        border: "1.5px solid rgba(212,165,55,0.2)",
        background: "linear-gradient(135deg, #1a1410, #0f0b08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
        color: "rgba(212,165,55,0.3)",
        fontFamily: "'Noto Serif KR', serif",
      }}
    >
      ?
    </div>
  );
}

// ───── 메인 컴포넌트 ─────
export default function WhiskyNine({
  match,          // { matchId, opponent: {id, nickname, avatar, seat}, role }
  opponentMove,   // { round, card?, hidden }
  opponentReady,
  onSendMove,     // ({round, card, reveal}) => void
  onLeave,        // 매치 나가기
  myNickname,
  myAvatar,
}) {
  const [myCards] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [usedMy, setUsedMy] = useState(new Set());
  const [usedOpp, setUsedOpp] = useState(new Set());
  const [myPlayed, setMyPlayed] = useState([]); // [{num, outcome}]
  const [oppPlayed, setOppPlayed] = useState([]);

  const [selectedCard, setSelectedCard] = useState(null);
  const [myCommittedCard, setMyCommittedCard] = useState(null);
  const [round, setRound] = useState(1);
  const [myWins, setMyWins] = useState(0);
  const [oppWins, setOppWins] = useState(0);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState("selecting"); // selecting | waiting | reveal | gameover
  const [showUpset, setShowUpset] = useState(false);
  const [savedRank, setSavedRank] = useState(false);
  const resolvingRef = useRef(false);

  // ───── 라운드 결과 처리 (양쪽 다 카드를 낸 시점에만) ─────
  useEffect(() => {
    if (phase !== "waiting") return;
    if (myCommittedCard === null) return;
    if (!opponentMove || opponentMove.round !== round) return;
    if (!opponentMove.card && opponentMove.card !== 0) {
      // 아직 숨김 상태(move-selected만 받음)
      return;
    }
    if (resolvingRef.current) return;

    resolvingRef.current = true;
    const myPick = myCommittedCard;
    const oppPick = opponentMove.card;
    const outcome = judge(myPick, oppPick);
    const upset = isUpset(myPick, oppPick);

    setResults((prev) => [...prev, outcome]);
    setUsedMy((prev) => new Set(prev).add(myPick));
    setUsedOpp((prev) => new Set(prev).add(oppPick));
    setMyPlayed((prev) => [...prev, { num: myPick, outcome }]);
    setOppPlayed((prev) => [...prev, { num: oppPick, outcome }]);
    if (outcome === "win") setMyWins((w) => w + 1);
    else if (outcome === "lose") setOppWins((w) => w + 1);

    setPhase("reveal");
    if (upset) {
      setShowUpset(true);
      setTimeout(() => setShowUpset(false), 900);
    }

    // 다음 라운드 or 종료
    const delay = upset ? 3400 : 2800;
    setTimeout(() => {
      if (round >= 9) {
        setPhase("gameover");
      } else {
        setRound((r) => r + 1);
        setSelectedCard(null);
        setMyCommittedCard(null);
        setPhase("selecting");
      }
      resolvingRef.current = false;
    }, delay);
  }, [phase, opponentMove, myCommittedCard, round]);

  // ───── 상대가 move-selected만 보냈을 때 내가 이미 냈다면 내 reveal 트리거 ─────
  // (host/guest 구분 없이, 양쪽 다 자기 카드를 "reveal" 이벤트로 재전송하는 방식이 가장 단순)
  useEffect(() => {
    if (phase !== "waiting") return;
    if (!opponentMove || opponentMove.round !== round) return;
    if (opponentMove.card !== undefined) return; // 이미 공개된 상태
    if (myCommittedCard === null) return;
    // 상대가 선택했다는 신호만 받음 → 나도 reveal 전송
    onSendMove({ round, card: myCommittedCard, reveal: true });
  }, [phase, opponentMove, myCommittedCard, round, onSendMove]);

  // ───── 카드 제출 ─────
  const submitCard = async () => {
    if (phase !== "selecting" || selectedCard === null) return;
    setMyCommittedCard(selectedCard);
    setPhase("waiting");
    // 먼저 "선택 완료" 시그널 (숫자 숨김)
    await onSendMove({ round, reveal: false });
  };

  // 상대 선택 신호 받자마자 reveal 전송 (위 useEffect에서 처리)
  // 또는 내가 이미 냈는데 상대가 먼저 낸 경우도 같은 경로

  // ───── 게임 종료 시 랭킹 저장 ─────
  const saveRanking = async () => {
    if (savedRank) return;
    setSavedRank(true);
    // 게임 타입이 다른 경우를 위해 game_type 컬럼이 있으면 사용, 없으면 그냥 score 저장
    // (안전하게 기존 스키마 건드리지 않고 별도 nickname 형식으로 표시)
    const label = `${myNickname} · 9라운드`;
    await supabase.from("game_rankings").insert({
      nickname: label,
      score: myWins,
    });
  };

  // ───── 렌더 준비 ─────
  const roundDots = Array.from({ length: 9 }, (_, i) => {
    const r = results[i];
    if (r === "win") return "win";
    if (r === "lose") return "lose";
    if (r === "draw") return "draw";
    if (i + 1 === round && phase !== "gameover") return "current";
    return "empty";
  });

  const dotColor = {
    win: "#6AB06A",
    lose: "#E24B4A",
    draw: "rgba(255,255,255,0.3)",
    current: "#D4A537",
    empty: "rgba(255,255,255,0.08)",
  };

  const remainMy = myCards.filter((n) => !usedMy.has(n));
  const remainOpp = myCards.filter((n) => !usedOpp.has(n));
  const meBlackCount = remainMy.filter(isOdd).length;
  const meWhiteCount = remainMy.filter((n) => !isOdd(n)).length;
  const oppBlackCount = remainOpp.filter(isOdd).length;
  const oppWhiteCount = remainOpp.filter((n) => !isOdd(n)).length;

  const lastMy = myPlayed[myPlayed.length - 1];
  const lastOpp = oppPlayed[oppPlayed.length - 1];

  // ───── 대기 중 화면 (상대가 아직 채널 입장 전) ─────
  if (!opponentReady) {
    return (
      <div style={{ padding: "clamp(24px, 6vw, 40px) 20px", textAlign: "center" }}>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 44, marginBottom: 16 }}
        >
          🥃
        </motion.div>
        <div
          style={{
            fontSize: 16,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 8,
          }}
        >
          {match.opponent.nickname}님 입장 대기 중...
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
          잔을 채우며 잠시만 기다려주세요
        </div>
        <button
          onClick={onLeave}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          취소
        </button>
      </div>
    );
  }

  // ───── 게임 종료 화면 ─────
  if (phase === "gameover") {
    const myFinal =
      myWins > oppWins ? { emoji: "👑", text: "승리", cls: "#6AB06A" } :
      myWins < oppWins ? { emoji: "🥀", text: "패배", cls: "#E24B4A" } :
                        { emoji: "🤝", text: "무승부", cls: "#D4A537" };

    return (
      <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
          THE NINE · FINAL
        </div>
        <div
          style={{
            fontSize: "clamp(18px, 5vw, 22px)",
            fontWeight: 300,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 20,
          }}
        >
          대결 종료
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(212,165,55,0.15)",
            borderRadius: 18,
            padding: "32px 24px",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 12 }}>{myFinal.emoji}</div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 300,
              fontFamily: "'Noto Serif KR', serif",
              color: myFinal.cls,
              marginBottom: 8,
            }}
          >
            {myFinal.text}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            <span style={{ color: "#D4A537", fontSize: 20 }}>{myWins}</span>
            <span style={{ margin: "0 8px", opacity: 0.4 }}>:</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 20 }}>{oppWins}</span>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {!savedRank && myWins > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={saveRanking}
                style={{
                  padding: "12px 22px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #D4A537, #B8860B)",
                  color: "#0D0B08",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Send size={13} /> 기록 등록
              </motion.button>
            )}
            {savedRank && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(106,176,106,0.1)",
                  border: "1px solid rgba(106,176,106,0.25)",
                  color: "#6AB06A",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                기록이 등록되었어요!
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onLeave}
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                border: "1px solid rgba(212,165,55,0.25)",
                background: "rgba(212,165,55,0.1)",
                color: "#D4A537",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <LogOut size={13} /> 라운지로
            </motion.button>
          </div>
        </motion.div>

        <RankingList />
      </div>
    );
  }

  // ───── 게임 진행 화면 ─────
  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16, position: "relative" }}>
      {/* Upset flash */}
      <AnimatePresence>
        {showUpset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "radial-gradient(circle at center, rgba(212,165,55,0.3), transparent 60%)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(212,165,55,0.5)" }}>
            THE NINE · 구룡투
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 300,
              color: "#F5E6C8",
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            더 나인<span style={{ color: "#D4A537" }}>,</span>
          </div>
        </div>
        <button
          onClick={onLeave}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <LogOut size={11} /> 나가기
        </button>
      </div>

      {/* 룰 힌트 */}
      <div
        style={{
          textAlign: "center",
          fontSize: 10,
          color: "rgba(212,165,55,0.55)",
          marginBottom: 10,
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        큰 숫자 승 · 단 <strong style={{ color: "#D4A537" }}>1은 9를 잡는다</strong>
      </div>

      {/* 라운드 도트 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
        {roundDots.map((d, i) => (
          <motion.div
            key={i}
            animate={
              d === "current"
                ? { boxShadow: ["0 0 0px rgba(212,165,55,0)", "0 0 10px rgba(212,165,55,0.6)", "0 0 0px rgba(212,165,55,0)"] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 24,
              height: 3,
              borderRadius: 2,
              background: dotColor[d],
              opacity: d === "lose" ? 0.6 : 1,
            }}
          />
        ))}
      </div>

      {/* 상대 존 */}
      <motion.div
        animate={opponentMove?.round === round && opponentMove?.hidden ? { borderColor: "rgba(212,165,55,0.35)" } : {}}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "10px 12px",
          marginBottom: 8,
          transition: "all 0.3s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 17 }}>{match.opponent.avatar}</span>
            <span style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500 }}>
              {match.opponent.nickname}
            </span>
            <span
              style={{
                fontSize: 10,
                color:
                  opponentMove?.round === round && opponentMove?.hidden
                    ? "#D4A537"
                    : "rgba(255,255,255,0.4)",
              }}
            >
              {phase === "reveal" && lastOpp
                ? `${lastOpp.num} 제출`
                : opponentMove?.round === round && opponentMove?.hidden
                ? "🤔 고민 중..."
                : `${oppWins}승`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", border: "1px solid rgba(212,165,55,0.3)", background: "radial-gradient(circle at 30% 30%, #3a3128, #0a0604)" }} />
              {oppBlackCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", border: "1px solid rgba(212,165,55,0.3)", background: "radial-gradient(circle at 30% 30%, #f5ebd2, #b8a27a)" }} />
              {oppWhiteCount}
            </span>
          </div>
        </div>
        {/* 상대 낸 카드 트랙 */}
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const p = oppPlayed[i];
            if (!p) {
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 5,
                    background: "rgba(0,0,0,0.3)",
                    border: "1px dashed rgba(255,255,255,0.08)",
                  }}
                />
              );
            }
            // 상대 관점: outcome 반전
            const oppHi = p.outcome === "lose" ? "win" : p.outcome === "win" ? "lose" : null;
            return (
              <div key={i} style={{ flex: 1 }}>
                <Card num={p.num} size="slot" highlight={oppHi} />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 아레나 */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(212,165,55,0.12)",
          borderRadius: 16,
          padding: "18px 14px",
          marginBottom: 8,
          minHeight: 140,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(212,165,55,0.5)",
            marginBottom: 12,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          ROUND <span style={{ color: "#D4A537", fontSize: 15 }}>{round}</span> / 9
        </div>

        {phase === "selecting" && (
          <div style={{ textAlign: "center" }}>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ fontSize: 28, marginBottom: 8 }}
            >
              🎴
            </motion.div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Serif KR', serif" }}>
              카드를 선택해주세요
            </div>
          </div>
        )}

        {phase === "waiting" && (
          <div style={{ textAlign: "center" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              style={{ fontSize: 24, marginBottom: 8 }}
            >
              ⏳
            </motion.div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Serif KR', serif" }}>
              {opponentMove?.round === round
                ? "양쪽 모두 제출 완료! 공개하는 중..."
                : "상대가 고민하고 있어요..."}
            </div>
          </div>
        )}

        {phase === "reveal" && lastMy && lastOpp && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <motion.div
                initial={{ rotateY: 180, scale: 0.8 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.45 }}
              >
                <Card num={lastMy.num} size="reveal" highlight={lastMy.outcome} />
              </motion.div>
              <div style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
                VS
              </div>
              <motion.div
                initial={{ rotateY: 180, scale: 0.8 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.45 }}
              >
                <Card
                  num={lastOpp.num}
                  size="reveal"
                  highlight={
                    lastOpp.outcome === "lose" ? "win" : lastOpp.outcome === "win" ? "lose" : null
                  }
                />
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95 }}
              style={{
                marginTop: 10,
                fontSize: 13,
                fontFamily: "'Noto Serif KR', serif",
                letterSpacing: "0.08em",
                color:
                  lastMy.outcome === "win"
                    ? "#6AB06A"
                    : lastMy.outcome === "lose"
                    ? "#E24B4A"
                    : "rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {lastMy.outcome === "win" ? "승리!" : lastMy.outcome === "lose" ? "패배..." : "무승부"}
              {isUpset(lastMy.num, lastOpp.num) && (
                <motion.span
                  animate={{ boxShadow: ["0 0 6px rgba(212,165,55,0.3)", "0 0 16px rgba(212,165,55,0.6)", "0 0 6px rgba(212,165,55,0.3)"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    padding: "2px 8px",
                    background: "rgba(212,165,55,0.15)",
                    border: "1px solid rgba(212,165,55,0.4)",
                    borderRadius: 6,
                    color: "#D4A537",
                    fontSize: 10,
                    letterSpacing: "0.15em",
                  }}
                >
                  ONE SLAYS NINE
                </motion.span>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* 내 존 */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(212,165,55,0.15)",
          borderRadius: 14,
          padding: "10px 12px",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 17 }}>{myAvatar}</span>
            <span style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500 }}>
              {myNickname} (나)
            </span>
            <span style={{ fontSize: 10, color: myCommittedCard !== null ? "#D4A537" : "rgba(255,255,255,0.4)" }}>
              {phase === "reveal" && lastMy
                ? `${lastMy.num} 제출`
                : myCommittedCard !== null
                ? "✓ 제출 완료"
                : `${myWins}승`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", border: "1px solid rgba(212,165,55,0.3)", background: "radial-gradient(circle at 30% 30%, #3a3128, #0a0604)" }} />
              {meBlackCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", border: "1px solid rgba(212,165,55,0.3)", background: "radial-gradient(circle at 30% 30%, #f5ebd2, #b8a27a)" }} />
              {meWhiteCount}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const p = myPlayed[i];
            if (!p) {
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 5,
                    background: "rgba(0,0,0,0.3)",
                    border: "1px dashed rgba(255,255,255,0.08)",
                  }}
                />
              );
            }
            return (
              <div key={i} style={{ flex: 1 }}>
                <Card num={p.num} size="slot" highlight={p.outcome} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 내 핸드 */}
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(212,165,55,0.5)", marginBottom: 8, textAlign: "center", fontFamily: "'Noto Serif KR', serif" }}>
        MY CARDS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 4, marginBottom: 10 }}>
        {myCards.map((n) => (
          <Card
            key={n}
            num={n}
            size="hand"
            used={usedMy.has(n)}
            selected={selectedCard === n}
            onClick={phase === "selecting" ? () => setSelectedCard(n) : null}
          />
        ))}
      </div>

      {/* 제출 버튼 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={submitCard}
          disabled={phase !== "selecting" || selectedCard === null}
          style={{
            padding: "12px 32px",
            borderRadius: 10,
            border: "none",
            background:
              phase === "selecting" && selectedCard !== null
                ? "linear-gradient(135deg, #D4A537, #B8860B)"
                : "rgba(255,255,255,0.06)",
            color: phase === "selecting" && selectedCard !== null ? "#0D0B08" : "rgba(255,255,255,0.25)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: phase === "selecting" && selectedCard !== null ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            minHeight: 44,
            minWidth: 180,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {phase === "selecting"
            ? selectedCard !== null
              ? `${selectedCard} 제출`
              : "카드를 선택하세요"
            : phase === "waiting"
            ? "상대를 기다리는 중..."
            : "공개 중..."}
        </motion.button>
      </div>
    </div>
  );
}
