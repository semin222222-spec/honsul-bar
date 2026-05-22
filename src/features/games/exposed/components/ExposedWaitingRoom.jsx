import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { Play, LogOut, Crown } from "lucide-react";
import { C, FONTS, playerColor } from "./exposedTheme";
import { MAX_PLAYERS, MIN_PLAYERS, START_LIVES } from "../lib/exposedRules";
import { SPICE_META } from "../data/exposedQuestions";

/**
 * ExposedWaitingRoom — 대기실 (시안 화면 1)
 *  방코드 대신 매장 로비 방식. 매운맛 2단계(방장만). 자리 번호 아바타.
 */
export default function ExposedWaitingRoom({
  room,
  isHost,
  sessionId,
  onLeave,
  onStart,
  onSetSpice,
}) {
  const [starting, setStarting] = useState(false);
  const players = room?.players || [];
  const canStart = isHost && players.length >= MIN_PLAYERS;
  const spice = room?.spice_level || "medium";

  const handleStart = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    await onStart();
    setStarting(false);
  };

  const slots = Array.from({ length: MAX_PLAYERS });
  const spiceColor = spice === "mild" ? C.mild : C.medium;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: C.bgDeep,
        color: C.ink,
        fontFamily: FONTS.body,
        padding: "max(20px, env(safe-area-inset-top)) 18px 0",
      }}
    >
      {/* 히어로 */}
      <div style={{ textAlign: "center", padding: "6px 0 12px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            border: `1px solid ${C.pink}`,
            borderRadius: 100,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: C.pink,
            marginBottom: 8,
          }}
        >
          단체 · 익명 폭로전
        </span>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 40,
            letterSpacing: "0.06em",
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          익명{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.pinkSoft}, ${C.pinkDeep})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            폭로전
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.sub }}>
          🎭 다수결이 진실, 소수가 거짓말
        </div>
        <div style={{ fontSize: 11, color: C.pinkSoft, fontWeight: 700 }}>
          진실 말하면 안전, 거짓말하면 -1
        </div>
      </div>

      {/* 방 정보 카드 (방코드 대체) */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(255,42,122,0.12), rgba(122,47,224,0.06))",
          border: "1px solid rgba(255,42,122,0.3)",
          borderRadius: 16,
          padding: 12,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.sub,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          방장
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            letterSpacing: "0.06em",
            color: C.ink,
            textShadow: `0 0 20px ${C.pinkGlow}`,
          }}
        >
          {room.host_seat_label} 자리
        </div>
      </div>

      {/* 매운맛 선택 (2단계만, 방장만) */}
      <div
        style={{
          background: C.bgCard,
          border: "1px solid rgba(255,42,122,0.2)",
          borderRadius: 14,
          padding: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: C.pinkSoft,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <span>🌶️ 매운맛 선택</span>
          <span style={{ color: C.gold }}>👑 방장만</span>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {["mild", "medium"].map((key) => {
            const meta = SPICE_META[key];
            const selected = spice === key;
            const col = key === "mild" ? C.mild : C.medium;
            return (
              <Motion.button
                key={key}
                whileTap={{ scale: isHost ? 0.97 : 1 }}
                onClick={() => isHost && onSetSpice?.(key)}
                disabled={!isHost}
                style={{
                  background: selected
                    ? `linear-gradient(135deg, ${col}26, ${col}0d)`
                    : C.bgInput,
                  border: `1.5px solid ${selected ? col : C.border}`,
                  borderRadius: 10,
                  padding: "12px 6px",
                  textAlign: "center",
                  cursor: isHost ? "pointer" : "default",
                  fontFamily: "inherit",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span
                  style={{ fontSize: 22, display: "block", marginBottom: 4 }}
                >
                  {meta.emoji}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    display: "block",
                    color: selected ? col : C.ink,
                  }}
                >
                  {meta.name}
                </span>
                <span style={{ fontSize: 9, color: C.muted }}>{meta.desc}</span>
              </Motion.button>
            );
          })}
        </div>
      </div>

      {/* 참가자 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "4px 2px 8px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.sub,
          }}
        >
          참가자
        </span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.pink }}>
          {players.length} / {MAX_PLAYERS}
        </span>
      </div>

      {/* 참가자 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slots.map((_, i) => {
          const p = players[i];
          const isMe = p?.session_id === sessionId;
          const isHostSlot = p?.session_id === room.host_session_id;
          const col = playerColor(i);
          if (!p) {
            return (
              <div
                key={i}
                style={{
                  border: `1px dashed ${C.muted}`,
                  borderRadius: 12,
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: 0.4,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `1.5px dashed ${C.muted}`,
                    color: C.muted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  +
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  참가자 대기 중...
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                background: isHostSlot
                  ? `linear-gradient(135deg, ${C.bgCard}, rgba(255,182,39,0.05))`
                  : C.bgCard,
                border: isHostSlot
                  ? "1px solid rgba(255,182,39,0.3)"
                  : isMe
                    ? `1px solid ${C.pink}`
                    : `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: col.bg,
                  color: col.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 11,
                  fontFamily: FONTS.mono,
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                {p.seat_label}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {p.seat_label} 자리
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>
                  {isHostSlot ? "방장" : "참가"}
                  {isMe ? " · 나" : ""}
                </div>
              </div>
              {isHostSlot && (
                <Crown size={16} style={{ color: C.gold, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* 룰 안내 */}
      <div
        style={{
          textAlign: "center",
          fontSize: 10,
          color: C.pinkSoft,
          margin: "12px 0 6px",
          background: "rgba(255,42,122,0.08)",
          padding: 6,
          borderRadius: 8,
          border: "1px solid rgba(255,42,122,0.15)",
        }}
      >
        ✋ 각자 손가락 {START_LIVES}개 · 거짓말 들키면 -1
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: spiceColor,
          marginBottom: 6,
        }}
      >
        {canStart
          ? "✓ 지금 시작할 수 있어요"
          : `${MIN_PLAYERS}명 이상 모이면 시작할 수 있어요`}
      </div>

      <div style={{ flex: 1, minHeight: 6 }} />

      {/* 버튼 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        {isHost ? (
          <Motion.button
            whileTap={{ scale: canStart && !starting ? 0.98 : 1 }}
            onClick={handleStart}
            disabled={!canStart || starting}
            style={{
              width: "100%",
              padding: 16,
              border: "none",
              borderRadius: 14,
              background:
                canStart && !starting
                  ? `linear-gradient(135deg, ${C.pinkSoft}, ${C.pinkDeep})`
                  : "rgba(255,255,255,0.07)",
              color: canStart && !starting ? "#fff" : C.muted,
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: "0.04em",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: canStart && !starting ? "pointer" : "not-allowed",
              boxShadow:
                canStart && !starting
                  ? `0 10px 30px -10px ${C.pinkGlow}`
                  : "none",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 52,
            }}
          >
            <Play size={18} fill="currentColor" />
            {starting
              ? "시작 중..."
              : canStart
                ? `게임 시작 (${players.length}명)`
                : `${MIN_PLAYERS}명 이상 모이면`}
          </Motion.button>
        ) : (
          <div
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.border}`,
              color: C.sub,
              fontSize: 13,
              textAlign: "center",
              fontWeight: 600,
              minHeight: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            방장이 시작하기를 기다리는 중...
          </div>
        )}
        <button
          onClick={onLeave}
          style={{
            width: "100%",
            padding: 12,
            background: "transparent",
            border: `1px solid ${C.borderBright}`,
            borderRadius: 14,
            color: C.sub,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
            minHeight: 44,
          }}
        >
          <LogOut size={14} />
          나가기
        </button>
      </div>
    </div>
  );
}
