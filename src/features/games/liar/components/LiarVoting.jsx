import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { Check, Vote } from "lucide-react";

const COLORS = {
  bgBase: "#0F0E0D",
  bgCard: "#1A1816",
  ink: "#F0E8D8",
  gold: "#C9A66B",
  liar: "#9D7AE0",
  liarBright: "#B395E8",
};

/**
 * LiarVoting — 7단계 동시 투표
 *
 *  - 자기 자신 투표 불가
 *  - voted_for 저장된 사람은 회색 처리
 */
export default function LiarVoting({ room, sessionId, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const players = room?.players || [];
  const me = players.find((p) => p.session_id === sessionId);
  const alreadyVoted = !!me?.voted_for;
  const votedCount = players.filter((p) => !!p.voted_for).length;

  const handleSubmit = async () => {
    if (!selected || submitting || alreadyVoted) return;
    setSubmitting(true);
    const res = await onSubmit(selected);
    setSubmitting(false);
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
      <div style={{ padding: "20px 20px 12px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            color: COLORS.liar,
            marginBottom: 6,
          }}
        >
          LIAR · VOTING
        </div>
        <div
          style={{
            fontSize: 26,
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 800,
            color: COLORS.ink,
            marginBottom: 6,
          }}
        >
          🎭 누가 라이어?
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(240,232,216,0.5)",
          }}
        >
          투표 완료:{" "}
          <strong style={{ color: COLORS.liarBright }}>{votedCount}</strong>
          /{players.length}명
        </div>
      </div>

      {/* 그리드 */}
      <div style={{ padding: "8px 20px", flex: 1 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
          }}
        >
          {players.map((p) => {
            const isMe = p.session_id === sessionId;
            const isSelected = selected === p.session_id;
            const hasVotedThis = me?.voted_for === p.session_id;
            const disabled = isMe || alreadyVoted;

            return (
              <Motion.button
                key={p.session_id}
                whileTap={!disabled ? { scale: 0.97 } : undefined}
                onClick={() => !disabled && setSelected(p.session_id)}
                disabled={disabled}
                style={{
                  padding: "20px 16px",
                  borderRadius: 14,
                  background: isMe
                    ? "transparent"
                    : isSelected || hasVotedThis
                      ? "linear-gradient(135deg, rgba(157,122,224,0.2), rgba(157,122,224,0.05))"
                      : COLORS.bgCard,
                  border: isMe
                    ? "1.5px dashed rgba(240,232,216,0.15)"
                    : isSelected || hasVotedThis
                      ? `2px solid ${COLORS.liar}`
                      : "1px solid rgba(240,232,216,0.08)",
                  color: isMe
                    ? "rgba(240,232,216,0.35)"
                    : isSelected || hasVotedThis
                      ? COLORS.liarBright
                      : COLORS.ink,
                  cursor: disabled ? "not-allowed" : "pointer",
                  WebkitTapHighlightColor: "transparent",
                  fontFamily: "inherit",
                  position: "relative",
                  textAlign: "center",
                  minHeight: 96,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                {(isSelected || hasVotedThis) && !isMe && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: COLORS.liar,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  {p.seat_label}
                </div>
                {isMe && (
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.15em",
                      color: "rgba(240,232,216,0.4)",
                    }}
                  >
                    (나)
                  </div>
                )}
                {!isMe && p.voted_for && !hasVotedThis && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(240,232,216,0.4)",
                    }}
                  >
                    투표 완료
                  </div>
                )}
              </Motion.button>
            );
          })}
        </div>
      </div>

      {/* 투표 버튼 */}
      <div
        style={{
          padding: "12px 20px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        {alreadyVoted ? (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 14,
              background: "rgba(240,232,216,0.04)",
              border: "1px solid rgba(240,232,216,0.08)",
              color: "rgba(240,232,216,0.6)",
              fontSize: 14,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            ✓ 투표 완료 · 다른 사람 대기 중...
          </div>
        ) : (
          <Motion.button
            whileTap={selected ? { scale: 0.97 } : undefined}
            onClick={handleSubmit}
            disabled={!selected || submitting}
            style={{
              width: "100%",
              padding: "16px 18px",
              border: "none",
              borderRadius: 14,
              background: selected
                ? `linear-gradient(135deg, ${COLORS.liar}, #7A56C9)`
                : "rgba(240,232,216,0.06)",
              color: selected ? "#fff" : "rgba(240,232,216,0.35)",
              fontWeight: 800,
              fontSize: 15,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: selected ? "pointer" : "not-allowed",
              boxShadow: selected ? `0 8px 22px ${COLORS.liar}55` : "none",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 52,
            }}
          >
            <Vote size={16} />
            {selected
              ? `투표하기 · ${players.find((p) => p.session_id === selected)?.seat_label || ""}`
              : "라이어를 선택해주세요"}
          </Motion.button>
        )}
      </div>
    </div>
  );
}
