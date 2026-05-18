import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { Play, LogOut, Crown } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, SPEECH_SECONDS } from "../lib/liarRules";
import { CATEGORIES } from "../data/liarWords";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
};

/**
 * LiarWaitingRoom — 2단계 대기실 (카테고리 선택)
 */
export default function LiarWaitingRoom({
  room,
  isHost,
  sessionId,
  onLeave,
  onStart,
}) {
  const [selectedCategory, setSelectedCategory] = useState("랜덤");
  const [starting, setStarting] = useState(false);

  const players = room?.players || [];
  const canStart = isHost && players.length >= MIN_PLAYERS;

  const handleStart = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    const res = await onStart(selectedCategory);
    setStarting(false);
    if (!res?.ok && res?.error) alert(res.error);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: COLORS.bgBase,
        color: COLORS.ink,
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "20px 20px 8px" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: COLORS.liar,
            marginBottom: 6,
          }}
        >
          LIAR · WAITING ROOM
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "'Noto Serif KR', serif",
            color: COLORS.ink,
            marginBottom: 4,
          }}
        >
          🎭 {room.host_seat_label} 손님의 방
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(240,232,216,0.5)",
          }}
        >
          {players.length}/{MAX_PLAYERS}명 · {MIN_PLAYERS}명 이상 모이면 시작
        </div>
      </div>

      {/* 참여자 슬롯 */}
      <div style={{ padding: "12px 20px" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(240,232,216,0.5)",
            marginBottom: 8,
          }}
        >
          참여자
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {Array.from({ length: MAX_PLAYERS }).map((_, i) => {
            const p = players[i];
            const isMe = p?.session_id === sessionId;
            const isHostSlot = p?.session_id === room.host_session_id;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                  background: p
                    ? isMe
                      ? "linear-gradient(135deg, rgba(157,122,224,0.18), rgba(157,122,224,0.05))"
                      : COLORS.bgCard
                    : "rgba(240,232,216,0.03)",
                  border: p
                    ? isMe
                      ? `1.5px solid ${COLORS.liar}`
                      : "1px solid rgba(240,232,216,0.1)"
                    : "1px dashed rgba(240,232,216,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: p ? COLORS.ink : "rgba(240,232,216,0.25)",
                  position: "relative",
                  fontWeight: 600,
                }}
              >
                {isHostSlot && (
                  <Crown
                    size={12}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      color: COLORS.gold,
                    }}
                  />
                )}
                {p ? (
                  <>
                    <div style={{ fontSize: 11, marginBottom: 2 }}>
                      {p.seat_label}
                    </div>
                    {isMe && (
                      <div
                        style={{
                          fontSize: 9,
                          color: COLORS.liarBright,
                          letterSpacing: "0.1em",
                        }}
                      >
                        나
                      </div>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div style={{ padding: "12px 20px" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(240,232,216,0.5)",
            marginBottom: 8,
          }}
        >
          카테고리 {isHost ? "(방장만 선택 가능)" : "(방장이 선택)"}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => isHost && setSelectedCategory(cat)}
                disabled={!isHost}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: active
                    ? `1px solid ${COLORS.gold}`
                    : "1px solid rgba(240,232,216,0.12)",
                  background: active
                    ? "linear-gradient(135deg, rgba(201,166,107,0.25), rgba(201,166,107,0.08))"
                    : "rgba(240,232,216,0.04)",
                  color: active ? COLORS.gold : "rgba(240,232,216,0.6)",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: isHost ? "pointer" : "default",
                  fontFamily: "inherit",
                  WebkitTapHighlightColor: "transparent",
                  minHeight: 36,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 규칙 */}
      <div style={{ padding: "12px 20px" }}>
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(240,232,216,0.04)",
            border: "1px solid rgba(240,232,216,0.08)",
            borderRadius: 12,
            fontSize: 12,
            color: "rgba(240,232,216,0.7)",
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: COLORS.liarBright,
              marginBottom: 6,
            }}
          >
            규칙
          </div>
          · 한 명만 라이어 (단어 모름, "???"만 봐요)
          <br />· 시민은 정답 단어를 받고 한 사람씩 {SPEECH_SECONDS}초 설명
          <br />· 모두 끝나면 라이어 지목 투표 (자기 자신 제외)
          <br />· 라이어 잡기 실패/동률이면 라이어 승!
        </div>
      </div>

      {/* 버튼 영역 */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: "12px 20px 20px",
          display: "flex",
          gap: 10,
          borderTop: "1px solid rgba(240,232,216,0.06)",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={onLeave}
          style={{
            flex: "0 0 auto",
            padding: "14px 18px",
            background: "transparent",
            border: "1px solid rgba(240,232,216,0.15)",
            borderRadius: 12,
            color: "rgba(240,232,216,0.7)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 48,
          }}
        >
          <LogOut size={14} />
          나가기
        </button>
        {isHost && (
          <Motion.button
            whileTap={{ scale: canStart && !starting ? 0.97 : 1 }}
            onClick={handleStart}
            disabled={!canStart || starting}
            style={{
              flex: 1,
              padding: "14px 18px",
              border: "none",
              borderRadius: 12,
              background:
                canStart && !starting
                  ? `linear-gradient(135deg, ${COLORS.liar}, #7A56C9)`
                  : "rgba(240,232,216,0.08)",
              color:
                canStart && !starting ? "#fff" : "rgba(240,232,216,0.35)",
              fontWeight: 800,
              fontSize: 15,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: canStart && !starting ? "pointer" : "not-allowed",
              boxShadow:
                canStart && !starting
                  ? "0 8px 22px rgba(157,122,224,0.35)"
                  : "none",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 48,
            }}
          >
            <Play size={16} fill="currentColor" />
            {starting
              ? "시작 중..."
              : canStart
                ? "게임 시작"
                : `${MIN_PLAYERS}명 이상 모이면`}
          </Motion.button>
        )}
        {!isHost && (
          <div
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 12,
              background: "rgba(240,232,216,0.04)",
              border: "1px solid rgba(240,232,216,0.08)",
              color: "rgba(240,232,216,0.5)",
              fontSize: 13,
              textAlign: "center",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
            }}
          >
            방장 시작 대기 중...
          </div>
        )}
      </div>
    </div>
  );
}
