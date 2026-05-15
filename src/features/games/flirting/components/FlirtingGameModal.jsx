import { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, Heart, Loader2, RefreshCw, MessageCircle } from "lucide-react";
import {
  FINAL_RESULTS,
  ROUND_RESULTS,
} from "@/features/games/flirting/data/flirtingQuestions";

/**
 * FlirtingGameModal
 *
 * 게임 진행 메인 모달
 *
 * 화면 단계:
 *  1. waiting_response: 신청 후 상대방 응답 대기
 *  2. round: 라운드 진행 중 (1~5)
 *  3. round_result: 라운드 결과 (통함/안 통함)
 *  4. final: 최종 결과 (점수 + 멘트)
 *  5. declined: 거절당함
 *
 * Props:
 *  - game: 현재 게임 객체
 *  - myChoices: 내 선택 { 1: 'a', 2: 'b', ... }
 *  - opponentChoices: 상대방 선택
 *  - gameResult: 최종 점수 결과 { score }
 *  - isInviter: 내가 신청자인지
 *  - mySeatLabel: 내 좌석
 *  - onSubmitChoice: (round, 'a'|'b') => Promise
 *  - onNextRound: () => Promise
 *  - onCancelInvite: () => void
 *  - onClose: () => void
 */
export default function FlirtingGameModal({
  game,
  myChoices,
  opponentChoices,
  gameResult,
  isInviter,
  mySeatLabel,
  onSubmitChoice,
  onNextRound,
  onCancelInvite,
  onClose,
}) {
  // 라운드 결과 화면 표시 여부 (양쪽 다 선택했을 때)
  const [showRoundResult, setShowRoundResult] = useState(false);

  const status = game?.status;
  const currentRound = game?.current_round || 1;
  const questions = game?.questions || [];

  // 양쪽 다 선택했는지
  const bothChose =
    !!myChoices?.[currentRound] && !!opponentChoices?.[currentRound];

  // 양쪽 다 선택하면 결과 화면으로
  useEffect(() => {
    if (status === "playing" && bothChose && !gameResult) {
      const timer = setTimeout(() => setShowRoundResult(true), 600);
      return () => clearTimeout(timer);
    }
  }, [bothChose, status, gameResult]);

  // 라운드 변경되면 결과 화면 닫기
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRoundResult(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentRound]);

  // 게임 종료되면 자동으로 결과 화면
  const showFinalResult = status === "finished" || gameResult;

  if (!game) return null;

  // 상대방 정보
  const opponentSeat = isInviter
    ? game.invitee_seat_label
    : game.inviter_seat_label;
  const opponentNickname = isInviter
    ? game.invitee_nickname
    : game.inviter_nickname;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 380,
          maxHeight: "92vh",
          overflowY: "auto",
          background:
            "linear-gradient(135deg, rgba(40,20,40,0.98), rgba(20,15,30,0.98))",
          border: "1px solid rgba(255,107,157,0.4)",
          borderRadius: 20,
          padding: 22,
          position: "relative",
        }}
      >
        {/* 닫기 버튼 - 결과 화면이거나 거절당했을 때만 */}
        {(showFinalResult ||
          status === "declined" ||
          status === "cancelled") && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 8,
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <X size={14} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* 1. 신청 후 응답 대기 */}
          {status === "pending" && isInviter && (
            <WaitingResponseScreen
              key="waiting"
              game={game}
              onCancel={onCancelInvite}
            />
          )}

          {/* 2. 거절당함 */}
          {status === "declined" && (
            <DeclinedScreen
              key="declined"
              opponentSeat={opponentSeat}
              onClose={onClose}
            />
          )}

          {/* 3. 게임 진행 중 - 라운드 결과가 표시되어야 할 때 */}
          {status === "playing" &&
            !showFinalResult &&
            showRoundResult &&
            bothChose && (
              <RoundResultScreen
                key={`result-${currentRound}`}
                question={questions[currentRound - 1]}
                myChoice={myChoices[currentRound]}
                opponentChoice={opponentChoices[currentRound]}
                round={currentRound}
                isLastRound={currentRound >= 5}
                onNext={() => {
                  setShowRoundResult(false);
                  onNextRound();
                }}
              />
            )}

          {/* 4. 게임 진행 중 - 라운드 진행 화면 */}
          {status === "playing" && !showFinalResult && !showRoundResult && (
            <RoundScreen
              key={`round-${currentRound}`}
              question={questions[currentRound - 1]}
              round={currentRound}
              myChoice={myChoices[currentRound]}
              opponentChose={!!opponentChoices[currentRound]}
              myChoices={myChoices}
              opponentChoices={opponentChoices}
              mySeatLabel={mySeatLabel}
              opponentSeat={opponentSeat}
              onSelect={(choice) => onSubmitChoice(currentRound, choice)}
            />
          )}

          {/* 5. 최종 결과 */}
          {showFinalResult && (
            <FinalResultScreen
              key="final"
              score={gameResult?.score ?? game.final_score ?? 0}
              opponentSeat={opponentSeat}
              opponentNickname={opponentNickname}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </Motion.div>
    </Motion.div>
  );
}

// ────────────────────────────────────────
// 1. 응답 대기 화면
// ────────────────────────────────────────
function WaitingResponseScreen({ game, onCancel }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ textAlign: "center", padding: "20px 0" }}
    >
      <Motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ fontSize: 50, marginBottom: 14 }}
      >
        💌
      </Motion.div>
      <div
        style={{
          fontSize: 18,
          color: "#FF6B9D",
          fontFamily: "'Noto Serif KR', serif",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        신청을 보냈어요!
      </div>
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,200,220,0.7)",
          marginBottom: 6,
        }}
      >
        📍 {game.invitee_seat_label} 손님께
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,200,220,0.5)",
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        상대방이 수락하기를 기다리는 중...
        <br />
        잠시만 기다려주세요 ({seconds}초)
      </div>

      <Motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 12, color: "#FF6B9D" }}>●</span>
        <span style={{ fontSize: 12, color: "#FF6B9D" }}>●</span>
        <span style={{ fontSize: 12, color: "#FF6B9D" }}>●</span>
      </Motion.div>

      <button
        onClick={onCancel}
        style={{
          padding: "10px 24px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          color: "rgba(255,255,255,0.6)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        신청 취소
      </button>

      {seconds >= 30 && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 16,
            padding: "10px 12px",
            background: "rgba(226,150,75,0.08)",
            border: "1px solid rgba(226,150,75,0.2)",
            borderRadius: 9,
            fontSize: 10,
            color: "rgba(255,200,150,0.85)",
            lineHeight: 1.5,
          }}
        >
          ⏰ 응답이 없네요. 자리를 비웠을 수도 있어요
        </Motion.div>
      )}
    </Motion.div>
  );
}

// ────────────────────────────────────────
// 2. 거절당함 화면
// ────────────────────────────────────────
function DeclinedScreen({ opponentSeat, onClose }) {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ textAlign: "center", padding: "20px 0" }}
    >
      <div style={{ fontSize: 50, marginBottom: 14 }}>😢</div>
      <div
        style={{
          fontSize: 18,
          color: "rgba(255,255,255,0.8)",
          fontFamily: "'Noto Serif KR', serif",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        거절당했어요...
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        📍 {opponentSeat} 손님이 거절하셨어요.
        <br />
        다른 손님께 신청해보세요!
      </div>
      <Motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onClose}
        style={{
          padding: "12px 32px",
          background:
            "linear-gradient(135deg, rgba(255,107,157,0.4), rgba(196,122,255,0.3))",
          border: "1px solid rgba(255,107,157,0.4)",
          borderRadius: 10,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        확인
      </Motion.button>
    </Motion.div>
  );
}

// ────────────────────────────────────────
// 3. 라운드 진행 화면
// ────────────────────────────────────────
function RoundScreen({
  question,
  round,
  myChoice,
  opponentChose,
  myChoices,
  opponentChoices,
  mySeatLabel,
  opponentSeat,
  onSelect,
}) {
  if (!question) return null;

  const handleSelect = (choice) => {
    if (myChoice) return; // 이미 선택함
    onSelect(choice);
  };

  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* 상단: VS + 진행 도트 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(255,107,157,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(255,107,157,0.2)",
              border: "1.5px solid rgba(255,107,157,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}
          >
            🥃
          </div>
          <span style={{ color: "rgba(255,200,220,0.7)" }}>{mySeatLabel}</span>
          <span style={{ color: "#FF6B9D", fontWeight: 700, fontSize: 10 }}>
            VS
          </span>
          <span style={{ color: "rgba(255,200,220,0.7)" }}>{opponentSeat}</span>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(196,122,255,0.2)",
              border: "1.5px solid rgba(196,122,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}
          >
            💕
          </div>
        </div>

        {/* 진행 도트 */}
        <div style={{ display: "flex", gap: 3 }}>
          {[1, 2, 3, 4, 5].map((r) => {
            const isCurrent = r === round;
            const isPast = r < round;
            const myC = myChoices[r];
            const oppC = opponentChoices[r];
            const matched = isPast && myC && oppC && myC === oppC;

            return (
              <Motion.div
                key={r}
                animate={isCurrent ? { scale: [1, 1.3, 1] } : {}}
                transition={isCurrent ? { duration: 1, repeat: Infinity } : {}}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: matched
                    ? "#6AB06A"
                    : isPast
                      ? "rgba(150,150,150,0.4)"
                      : isCurrent
                        ? "#FF6B9D"
                        : "rgba(255,255,255,0.1)",
                  boxShadow: isCurrent
                    ? "0 0 8px rgba(255,107,157,0.7)"
                    : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 라운드 번호 */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,107,157,0.7)",
            letterSpacing: "0.2em",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {question.level === "spicy3"
            ? "🔥 ROUND 5 / 5"
            : question.level === "spicy2"
              ? "💋 ROUND 4 / 5"
              : question.level === "spicy1"
                ? "🍒 ROUND 3 / 5"
                : `ROUND ${round} / 5`}
        </div>
        <div
          style={{
            fontSize: 18,
            fontFamily: "'Noto Serif KR', serif",
            color: "#F5E6C8",
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          {question.text}
        </div>
      </div>

      {/* 선택지 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <ChoiceButton
          option={question.a}
          isSelected={myChoice === "a"}
          disabled={!!myChoice}
          onClick={() => handleSelect("a")}
        />
        <ChoiceButton
          option={question.b}
          isSelected={myChoice === "b"}
          disabled={!!myChoice}
          onClick={() => handleSelect("b")}
        />
      </div>

      {/* 대기 메시지 */}
      <div
        style={{
          padding: 14,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 10,
          fontSize: 11,
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {!myChoice && !opponentChose && "👀 둘 다 단어를 선택해주세요"}
        {myChoice && !opponentChose && (
          <Motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ⏳ 상대방의 선택을 기다리는 중...
          </Motion.span>
        )}
        {!myChoice &&
          opponentChose &&
          "💌 상대방이 먼저 골랐어요! 어떤 단어를 고를래요?"}
        {myChoice && opponentChose && "✨ 결과 확인 중..."}
      </div>
    </Motion.div>
  );
}

function ChoiceButton({ option, isSelected, disabled, onClick }) {
  return (
    <Motion.button
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled && !isSelected}
      style={{
        padding: "22px 12px",
        background: isSelected
          ? "linear-gradient(135deg, rgba(255,107,157,0.25), rgba(196,122,255,0.15))"
          : "rgba(255,255,255,0.04)",
        border:
          "2px solid " + (isSelected ? "#FF6B9D" : "rgba(255,255,255,0.08)"),
        borderRadius: 14,
        cursor: disabled && !isSelected ? "not-allowed" : "pointer",
        fontFamily: "'Noto Serif KR', serif",
        opacity: disabled && !isSelected ? 0.4 : 1,
        transition: "all 0.2s",
        WebkitTapHighlightColor: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 26 }}>{option.emoji}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: isSelected ? "#FF6B9D" : "#F5E6C8",
        }}
      >
        {option.text}
      </span>
    </Motion.button>
  );
}

// ────────────────────────────────────────
// 4. 라운드 결과 화면
// ────────────────────────────────────────
function RoundResultScreen({
  question,
  myChoice,
  opponentChoice,
  round,
  isLastRound,
  onNext,
}) {
  if (!question || !myChoice || !opponentChoice) return null;

  const isMatch = myChoice === opponentChoice;
  const myOption = myChoice === "a" ? question.a : question.b;
  const oppOption = opponentChoice === "a" ? question.a : question.b;

  const level = question.level || "normal";
  const resultData = isMatch
    ? ROUND_RESULTS.match[level]
    : ROUND_RESULTS.mismatch[level];

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      style={{
        padding: 22,
        borderRadius: 16,
        background: isMatch
          ? "linear-gradient(135deg, rgba(255,107,157,0.2), rgba(196,122,255,0.1))"
          : "linear-gradient(135deg, rgba(100,150,200,0.15), rgba(60,100,150,0.08))",
        border:
          "2px solid " +
          (isMatch ? "rgba(255,107,157,0.5)" : "rgba(100,150,200,0.4)"),
        textAlign: "center",
      }}
    >
      <Motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12 }}
        style={{ fontSize: 60, marginBottom: 12 }}
      >
        {isMatch ? "💕" : "😅"}
      </Motion.div>

      <div
        style={{
          fontSize: 22,
          fontFamily: "'Noto Serif KR', serif",
          fontWeight: 700,
          color: isMatch ? "#FF6B9D" : "#aac8ff",
          marginBottom: 14,
        }}
      >
        {resultData.title}
      </div>

      {/* 양쪽 선택 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 14,
          background: "rgba(0,0,0,0.3)",
          borderRadius: 12,
          margin: "12px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
            }}
          >
            나
          </span>
          <span style={{ fontSize: 26 }}>{myOption.emoji}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#F5E6C8",
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            {myOption.text}
          </span>
        </div>

        <span
          style={{
            fontSize: 18,
            color: isMatch ? "rgba(255,107,157,0.7)" : "rgba(100,150,200,0.7)",
            fontWeight: 700,
          }}
        >
          {isMatch ? "↔️" : "✕"}
        </span>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
            }}
          >
            상대
          </span>
          <span style={{ fontSize: 26 }}>{oppOption.emoji}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#F5E6C8",
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            {oppOption.text}
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.7,
          marginBottom: 18,
          whiteSpace: "pre-line",
        }}
      >
        {resultData.message}
      </div>

      <Motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onNext}
        style={{
          width: "100%",
          padding: 13,
          background: isMatch
            ? "linear-gradient(135deg, #FF6B9D, #C47AFF)"
            : "linear-gradient(135deg, rgba(100,150,200,0.7), rgba(60,100,150,0.6))",
          border: "none",
          borderRadius: 11,
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {isLastRound ? "최종 결과 보기 →" : `다음 라운드 (${round + 1}/5) →`}
      </Motion.button>
    </Motion.div>
  );
}

// ────────────────────────────────────────
// 5. 최종 결과 화면
// ────────────────────────────────────────
function FinalResultScreen({ score, opponentSeat, opponentNickname, onClose }) {
  const result = FINAL_RESULTS[score] || FINAL_RESULTS[0];

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", damping: 22 }}
      style={{
        padding: "24px 18px",
        borderRadius: 18,
        background:
          score >= 4
            ? "linear-gradient(135deg, rgba(80,30,80,0.6), rgba(50,20,60,0.5))"
            : score >= 2
              ? "linear-gradient(135deg, rgba(60,30,80,0.5), rgba(40,20,60,0.4))"
              : "linear-gradient(135deg, rgba(40,30,50,0.5), rgba(30,20,40,0.4))",
        border: `2px solid ${result.color}`,
        boxShadow: `0 0 50px ${result.color}40`,
        textAlign: "center",
      }}
    >
      <Motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12, delay: 0.1 }}
        style={{ fontSize: 72, marginBottom: 14 }}
      >
        {result.emoji}
      </Motion.div>

      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div
          style={{
            fontSize: 56,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 700,
            background: `linear-gradient(135deg, ${result.color}, ${result.color}88)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 2,
            lineHeight: 1,
          }}
        >
          {score}
          <span style={{ fontSize: 30, opacity: 0.6 }}>/5</span>
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.3em",
            marginBottom: 14,
          }}
        >
          {result.label}
        </div>

        <div
          style={{
            fontSize: 26,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 700,
            color: result.color,
            marginBottom: 10,
          }}
        >
          {result.title}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.8,
            marginBottom: 16,
            whiteSpace: "pre-line",
          }}
        >
          {result.message}
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 10,
            fontSize: 11,
            color: "rgba(255,200,220,0.7)",
            marginBottom: 16,
          }}
        >
          상대방:{" "}
          <strong style={{ color: result.color }}>📍 {opponentSeat}</strong>
          {opponentNickname && (
            <span style={{ marginLeft: 4 }}>({opponentNickname})</span>
          )}
        </div>

        <Motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onClose}
          style={{
            width: "100%",
            padding: 13,
            background: `linear-gradient(135deg, ${result.color}, ${result.color}aa)`,
            border: "none",
            borderRadius: 11,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: `0 4px 20px ${result.color}40`,
          }}
        >
          확인 ✨
        </Motion.button>
      </Motion.div>
    </Motion.div>
  );
}
