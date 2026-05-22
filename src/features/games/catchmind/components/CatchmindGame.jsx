import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import {
  Undo2,
  Eraser,
  Trash2,
  Send,
  SkipForward,
} from "lucide-react";
import CatchmindCanvas from "./CatchmindCanvas";
import {
  ROUND_SECONDS,
  formatHintString,
} from "../lib/catchmindRules";

const PALETTE = [
  "#1A1410", // black-brown (위스키 다크)
  "#F87171", // red
  "#FF8552", // orange
  "#FFD23F", // gold
  "#4ADE80", // green
  "#5BB3E0", // blue
  "#AA82FF", // purple
  "#FF6B9D", // pink
];

const WIDTHS = [2, 4, 8, 14];

const COLORS = {
  bgBase: "#1A1410",
  bgCard: "#261E18",
  ink: "#F5E6C8",
  gold: "#FFD23F",
  pink: "#FF6B9D",
  orange: "#FF8552",
  green: "#4ADE80",
  red: "#F87171",
};

/**
 * CatchmindGame
 *
 * 게임 메인 화면. 출제자/정답자 분기.
 */
export default function CatchmindGame({
  room,
  sessionId,
  strokes,
  messages,
  secondsLeft,
  onAddStroke,
  onClearCanvas,
  onSendGuess,
  onPass,
  onLiveStroke,
  subscribeLiveStroke,
}) {
  const isDrawer = room?.current_drawer_session_id === sessionId;
  const word = room?.current_word || "";
  const players = room?.players || [];
  const me = players.find((p) => p.session_id === sessionId);
  const drawer = players.find(
    (p) => p.session_id === room?.current_drawer_session_id,
  );

  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [mode, setMode] = useState("draw");
  const [chatInput, setChatInput] = useState("");
  // Undo: prop strokes의 끝부터 N개를 시각적으로 숨김 (서버 데이터는 그대로)
  const [undoCount, setUndoCount] = useState(0);
  const visibleStrokes = useMemo(
    () => (undoCount > 0 ? strokes.slice(0, -undoCount) : strokes),
    [strokes, undoCount],
  );

  // 정답 맞춘 사람들 (this round)
  const correctSet = useMemo(() => {
    const set = new Set();
    for (const m of messages) {
      if (
        m.type === "correct" &&
        m.round_number === room?.current_round
      ) {
        set.add(m.session_id);
      }
    }
    return set;
  }, [messages, room?.current_round]);

  const iAmCorrect = correctSet.has(sessionId);

  // 정답자용 힌트
  const hintString = formatHintString(word, secondsLeft);

  // 정답자용 채팅 영역 자동 스크롤
  const chatScrollRef = useRef(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // 출제자 액션: 캔버스 stroke 완료
  const handleStrokeComplete = useCallback(
    (strokeData) => {
      // 새 stroke 그리면 undo 시각 효과는 더 이상 의미 없음
      if (undoCount > 0) setUndoCount(0);
      onAddStroke(strokeData);
    },
    [onAddStroke, undoCount],
  );

  const handleUndo = useCallback(() => {
    setUndoCount((n) => Math.min(n + 1, strokes.length));
  }, [strokes.length]);

  const handleSubmitChat = (e) => {
    e?.preventDefault?.();
    if (!chatInput.trim()) return;
    onSendGuess(chatInput);
    setChatInput("");
  };

  const handleClearCanvas = useCallback(() => {
    setUndoCount(0);
    onClearCanvas();
  }, [onClearCanvas]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Plus Jakarta Sans', system-ui",
      }}
    >
      {/* 상단: 타이머 + 단어/힌트 */}
      <TopBar
        isDrawer={isDrawer}
        secondsLeft={secondsLeft}
        word={word}
        hintString={hintString}
        round={room?.current_round}
        totalRounds={room?.total_rounds}
        drawerSeat={drawer?.seat_label}
        iAmCorrect={iAmCorrect}
      />

      {/* 캔버스 */}
      <div style={{ padding: "0 12px" }}>
        <CatchmindCanvas
          isDrawer={isDrawer}
          strokes={visibleStrokes}
          onStrokeComplete={handleStrokeComplete}
          onLiveStroke={onLiveStroke}
          subscribeLiveStroke={subscribeLiveStroke}
          color={color}
          width={width}
          mode={mode}
        />
      </div>

      {/* 출제자 툴바 / 정답자 채팅 */}
      {isDrawer ? (
        <DrawerToolbar
          color={color}
          setColor={(c) => {
            setColor(c);
            setMode("draw");
          }}
          width={width}
          setWidth={setWidth}
          mode={mode}
          setMode={setMode}
          onUndo={handleUndo}
          onClear={handleClearCanvas}
          onPass={onPass}
          hasPassed={me?.has_passed}
          correctCount={correctSet.size}
        />
      ) : (
        <GuesserChat
          messages={messages}
          chatScrollRef={chatScrollRef}
          input={chatInput}
          setInput={setChatInput}
          onSubmit={handleSubmitChat}
          sessionId={sessionId}
          iAmCorrect={iAmCorrect}
          currentRound={room?.current_round}
        />
      )}

      {/* 점수 칩 (가로 스크롤) */}
      <ScoreChips players={players} mySessionId={sessionId} />
    </div>
  );
}

function TopBar({
  isDrawer,
  secondsLeft,
  word,
  hintString,
  round,
  totalRounds,
  drawerSeat,
  iAmCorrect,
}) {
  const progress = Math.max(0, secondsLeft / ROUND_SECONDS);
  const isUrgent = secondsLeft <= 10;

  return (
    <div
      style={{
        padding: "14px 16px 10px",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* 원형 타이머 */}
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        <svg viewBox="0 0 36 36" style={{ width: 56, height: 56, transform: "rotate(-90deg)" }}>
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="rgba(245,230,200,0.1)"
            strokeWidth="2"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={isUrgent ? COLORS.red : COLORS.gold}
            strokeWidth="2.5"
            strokeDasharray={`${progress * 97.4} 97.4`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.3s linear" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            color: isUrgent ? COLORS.red : COLORS.ink,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {Math.max(0, Math.ceil(secondsLeft))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(245,230,200,0.45)",
            marginBottom: 2,
          }}
        >
          ROUND {round} / {totalRounds}
        </div>
        {isDrawer ? (
          <>
            <div
              style={{
                fontSize: 11,
                color: "rgba(245,230,200,0.6)",
                marginBottom: 2,
              }}
            >
              내가 그릴 단어
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: COLORS.gold,
                fontFamily: "'Noto Serif KR', serif",
                lineHeight: 1.1,
              }}
            >
              {word}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 11,
                color: "rgba(245,230,200,0.6)",
                marginBottom: 2,
              }}
            >
              ✏️ {drawerSeat} 손님이 그리는 중
              {iAmCorrect && (
                <span style={{ color: COLORS.green, marginLeft: 6 }}>
                  · 맞혔어요!
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: iAmCorrect ? COLORS.green : COLORS.ink,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.15em",
                lineHeight: 1.1,
              }}
            >
              {iAmCorrect ? word : hintString}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DrawerToolbar({
  color,
  setColor,
  width,
  setWidth,
  mode,
  setMode,
  onUndo,
  onClear,
  onPass,
  hasPassed,
  correctCount,
}) {
  return (
    <div
      style={{
        padding: "10px 12px 14px",
        marginTop: 8,
      }}
    >
      {/* 1단: 색상 + undo/erase/clear */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: c,
              border:
                color === c && mode === "draw"
                  ? "2px solid #FFD23F"
                  : "2px solid rgba(245,230,200,0.15)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              padding: 0,
            }}
            aria-label={`색상 ${c}`}
          />
        ))}
        <div style={{ flex: 1 }} />
        <IconBtn onClick={onUndo} title="되돌리기">
          <Undo2 size={16} />
        </IconBtn>
        <IconBtn
          onClick={() => setMode((m) => (m === "erase" ? "draw" : "erase"))}
          active={mode === "erase"}
          title="지우개"
        >
          <Eraser size={16} />
        </IconBtn>
        <IconBtn onClick={onClear} title="전체 삭제" danger>
          <Trash2 size={16} />
        </IconBtn>
      </div>

      {/* 2단: 굵기 + 패스 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setWidth(w)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background:
                width === w ? "rgba(255,210,63,0.15)" : "rgba(245,230,200,0.05)",
              border: `1px solid ${
                width === w ? "rgba(255,210,63,0.5)" : "rgba(245,230,200,0.1)"
              }`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              padding: 0,
            }}
          >
            <span
              style={{
                display: "block",
                width: w * 1.6,
                height: w * 1.6,
                borderRadius: "50%",
                background: "#F5E6C8",
              }}
            />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 11,
            color: "rgba(245,230,200,0.5)",
          }}
        >
          정답자: <strong style={{ color: COLORS.green }}>{correctCount}명</strong>
        </div>
        <button
          onClick={onPass}
          disabled={hasPassed}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${
              hasPassed ? "rgba(245,230,200,0.1)" : "rgba(248,113,113,0.4)"
            }`,
            background: hasPassed
              ? "rgba(245,230,200,0.05)"
              : "rgba(248,113,113,0.1)",
            color: hasPassed ? "rgba(245,230,200,0.3)" : COLORS.red,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: hasPassed ? "not-allowed" : "pointer",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          <SkipForward size={12} />
          {hasPassed ? "패스 사용함" : "패스 (-30)"}
        </button>
      </div>
    </div>
  );
}

function IconBtn({ onClick, children, active, danger, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${
          active
            ? "rgba(255,210,63,0.5)"
            : danger
              ? "rgba(248,113,113,0.3)"
              : "rgba(245,230,200,0.12)"
        }`,
        background: active
          ? "rgba(255,210,63,0.15)"
          : danger
            ? "rgba(248,113,113,0.05)"
            : "rgba(245,230,200,0.04)",
        color: danger ? COLORS.red : COLORS.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function GuesserChat({
  messages,
  chatScrollRef,
  input,
  setInput,
  onSubmit,
  sessionId,
  iAmCorrect,
  currentRound,
}) {
  const roundMessages = messages.filter(
    (m) => m.round_number === currentRound || m.type === "system",
  );

  return (
    <div style={{ padding: "10px 12px 12px", marginTop: 6 }}>
      <div
        ref={chatScrollRef}
        style={{
          height: 180,
          background: "rgba(38,30,24,0.6)",
          border: "1px solid rgba(245,230,200,0.08)",
          borderRadius: 12,
          padding: "10px 12px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {roundMessages.length === 0 && (
          <div
            style={{
              color: "rgba(245,230,200,0.3)",
              fontSize: 12,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            정답을 추측해서 채팅으로 보내세요!
          </div>
        )}
        {roundMessages.map((m) => (
          <ChatRow key={m.id} message={m} mySessionId={sessionId} />
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            iAmCorrect ? "맞혔어요! 응원 채팅 가능" : "정답을 입력하세요"
          }
          autoComplete="off"
          enterKeyHint="send"
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(245,230,200,0.12)",
            background: "rgba(245,230,200,0.04)",
            color: COLORS.ink,
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          style={{
            padding: "0 16px",
            borderRadius: 10,
            border: "none",
            background: input.trim()
              ? `linear-gradient(135deg, ${COLORS.gold}, #E5B82E)`
              : "rgba(245,230,200,0.08)",
            color: input.trim() ? "#1A1410" : "rgba(245,230,200,0.3)",
            fontWeight: 700,
            cursor: input.trim() ? "pointer" : "not-allowed",
            WebkitTapHighlightColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Send size={16} />
        </button>
      </form>

      {/* 예상 점수 표시 */}
      {!iAmCorrect && (
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: "rgba(245,230,200,0.4)",
            textAlign: "center",
          }}
        >
          맞히면 +1점
        </div>
      )}
    </div>
  );
}

function ChatRow({ message, mySessionId }) {
  const isMine = message.session_id === mySessionId;

  if (message.type === "system") {
    return (
      <div
        style={{
          alignSelf: "center",
          background: "rgba(245,230,200,0.08)",
          color: "rgba(245,230,200,0.55)",
          fontSize: 11,
          padding: "3px 10px",
          borderRadius: 999,
        }}
      >
        {message.content}
      </div>
    );
  }

  if (message.type === "correct") {
    return (
      <div
        style={{
          alignSelf: isMine ? "flex-end" : "flex-start",
          maxWidth: "85%",
          background: "rgba(74,222,128,0.18)",
          border: "1px solid rgba(74,222,128,0.4)",
          color: "#A8F0BB",
          padding: "6px 12px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            background: COLORS.green,
            color: "#0a1a0d",
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 9,
            letterSpacing: "0.1em",
            fontWeight: 800,
          }}
        >
          정답
        </span>
        {message.seat_label} 손님
        {message.score_gained ? (
          <span style={{ color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
            +{message.score_gained}
          </span>
        ) : null}
      </div>
    );
  }

  if (message.type === "close") {
    return (
      <div
        style={{
          alignSelf: isMine ? "flex-end" : "flex-start",
          fontSize: 12,
          padding: "4px 10px",
          color: COLORS.orange,
          fontStyle: "italic",
        }}
      >
        <span style={{ fontWeight: 600 }}>{message.seat_label}:</span>{" "}
        {message.content}{" "}
        <span style={{ fontSize: 10, opacity: 0.7 }}>(근접!)</span>
      </div>
    );
  }

  return (
    <div
      style={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        fontSize: 12,
        padding: "4px 10px",
        color: isMine ? COLORS.pink : "rgba(245,230,200,0.85)",
      }}
    >
      <span style={{ fontWeight: 600, opacity: 0.7 }}>
        {message.seat_label}:
      </span>{" "}
      {message.content}
    </div>
  );
}

function ScoreChips({ players, mySessionId }) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  return (
    <div
      style={{
        padding: "8px 12px 14px",
        display: "flex",
        gap: 6,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {sorted.map((p, i) => {
        const isMe = p.session_id === mySessionId;
        return (
          <div
            key={p.session_id}
            style={{
              flexShrink: 0,
              padding: "4px 10px",
              borderRadius: 999,
              background: isMe
                ? "rgba(255,107,157,0.18)"
                : "rgba(245,230,200,0.05)",
              border: `1px solid ${
                isMe ? "rgba(255,107,157,0.35)" : "rgba(245,230,200,0.1)"
              }`,
              fontSize: 11,
              color: isMe ? COLORS.pink : "rgba(245,230,200,0.7)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ opacity: 0.55 }}>#{i + 1}</span>
            {p.seat_label}
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {p.score || 0}
            </span>
          </div>
        );
      })}
    </div>
  );
}
