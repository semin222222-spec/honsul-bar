import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, Heart, Loader2 } from "lucide-react";
import { useSeatRows } from "@/features/seats/hooks/useSeatRows";
import { useStoreId } from "@/shared/store/StoreContext";
import { getDefaultLayout } from "@/features/seats/components/FloorPlan";

/**
 * FlirtingSeatPicker
 *
 * 게임 신청할 상대 자리를 평면도에서 선택
 *
 * - 내 자리: 분홍색 + 펄스 + "내 자리 ✨" 태그
 * - 신청 가능한 자리: 초록색 + "💕" 배지
 * - 빈 자리: 회색 (선택 불가)
 * - 나 자신은 신청 불가
 *
 * Props:
 *  - mySessionId: 내 세션 ID
 *  - mySeatLabel: 내 좌석
 *  - sessions: 매장 전체 세션 리스트
 *  - onSelect: (targetSession) => void
 *  - onCancel: () => void
 *  - loading: 신청 중 (스피너 표시)
 */
export default function FlirtingSeatPicker({
  mySessionId,
  mySeatLabel,
  sessions = [],
  onSelect,
  onCancel,
  loading = false,
}) {
  const storeId = useStoreId();
  const { rows: seatRows, loading: rowsLoading } = useSeatRows(storeId);

  const [confirmTarget, setConfirmTarget] = useState(null);

  // 세션 맵
  const sessionMap = new Map();
  sessions.forEach((s) => {
    if (s.seat_label) sessionMap.set(s.seat_label, s);
  });

  const handleSeatClick = (seat) => {
    if (loading) return;
    const session = sessionMap.get(seat);
    if (!session) return; // 빈 자리
    if (session.id === mySessionId) return; // 내 자리
    setConfirmTarget(session);
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    onSelect(confirmTarget);
  };

  // 신청 가능한 상대 수
  const availableTargets = sessions.filter((s) => s.id !== mySessionId).length;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
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
          maxWidth: 480,
          maxHeight: "92vh",
          overflowY: "auto",
          background:
            "linear-gradient(135deg, rgba(40,20,30,0.98), rgba(20,15,25,0.98))",
          backdropFilter: "blur(24px)",
          borderRadius: 20,
          border: "1px solid rgba(255,107,157,0.3)",
          padding: "20px 18px",
          position: "relative",
        }}
      >
        {/* 헤더 */}
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 8,
            color: "rgba(255,255,255,0.6)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <X size={14} />
        </button>

        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>💕</div>
          <div
            style={{
              fontSize: 18,
              color: "#FF6B9D",
              fontFamily: "'Noto Serif KR', serif",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            게임 신청할 자리 선택
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,200,220,0.7)",
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: "#FF6B9D", fontWeight: 600 }}>분홍색</span>이
            내 자리예요 (📍 {mySeatLabel})<br />
            <span style={{ color: "#6AB06A", fontWeight: 600 }}>
              초록색
            </span>{" "}
            자리에 게임을 신청할 수 있어요
          </div>
        </div>

        {/* 평면도 */}
        {rowsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              style={{
                display: "inline-block",
                color: "rgba(255,107,157,0.4)",
              }}
            >
              <Loader2 size={28} />
            </Motion.div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                marginTop: 8,
              }}
            >
              좌석을 불러오는 중...
            </div>
          </div>
        ) : availableTargets === 0 ? (
          <div
            style={{
              padding: "30px 20px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>😢</div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 4,
              }}
            >
              지금은 신청할 수 있는 손님이 없어요
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              다른 손님이 입장하면 신청할 수 있어요
            </div>
          </div>
        ) : (
          <>
            {seatRows.map((row, idx) => (
              <SeatPickerRow
                key={row.id}
                row={row}
                rowDirection={idx === 0 ? "left-open" : "right-open"}
                sessionMap={sessionMap}
                mySessionId={mySessionId}
                onSeatClick={handleSeatClick}
              />
            ))}

            {/* 범례 */}
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8,
                marginTop: 10,
                fontSize: 10,
                justifyContent: "center",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <Legend
                color="linear-gradient(135deg, rgba(255,107,157,0.5), rgba(196,122,255,0.3))"
                border="#FF6B9D"
                label="내 자리"
              />
              <Legend
                color="rgba(106,176,106,0.3)"
                border="rgba(106,176,106,0.5)"
                label="신청 가능"
              />
              <Legend
                color="rgba(255,255,255,0.03)"
                border="rgba(255,255,255,0.08)"
                label="빈자리"
              />
            </div>
          </>
        )}

        {/* 확인 모달 */}
        <AnimatePresence>
          {confirmTarget && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !loading)
                  setConfirmTarget(null);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 250,
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <Motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  width: "100%",
                  maxWidth: 320,
                  background:
                    "linear-gradient(135deg, rgba(40,20,30,0.98), rgba(20,15,25,0.98))",
                  border: "2px solid rgba(255,107,157,0.5)",
                  borderRadius: 18,
                  padding: 24,
                  textAlign: "center",
                  boxShadow: "0 0 40px rgba(255,107,157,0.3)",
                }}
              >
                <div style={{ fontSize: 44, marginBottom: 10 }}>💕</div>
                <div
                  style={{
                    fontSize: 16,
                    color: "#FF6B9D",
                    fontFamily: "'Noto Serif KR', serif",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  이 자리에 게임 신청할까요?
                </div>
                <div
                  style={{
                    fontSize: 24,
                    color: "#FF6B9D",
                    fontFamily: "'Noto Serif KR', serif",
                    fontWeight: 700,
                    margin: "12px 0",
                  }}
                >
                  📍 {confirmTarget.seat_label}
                </div>
                {confirmTarget.nickname && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,200,220,0.7)",
                      marginBottom: 16,
                    }}
                  >
                    {confirmTarget.nickname} 손님
                  </div>
                )}
                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255,107,157,0.08)",
                    border: "1px solid rgba(255,107,157,0.2)",
                    borderRadius: 9,
                    fontSize: 10,
                    color: "rgba(255,200,220,0.85)",
                    lineHeight: 1.5,
                    marginBottom: 18,
                  }}
                >
                  💌 신청을 보내면 상대방이 수락/거절할 수 있어요
                  <br />
                  5라운드 동안 같은 단어를 골라보세요!
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setConfirmTarget(null)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    취소
                  </button>
                  <Motion.button
                    whileTap={!loading ? { scale: 0.96 } : {}}
                    onClick={handleConfirm}
                    disabled={loading}
                    style={{
                      flex: 1.3,
                      padding: 12,
                      borderRadius: 10,
                      background: loading
                        ? "rgba(255,255,255,0.1)"
                        : "linear-gradient(135deg, #FF6B9D, #C47AFF)",
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    {loading ? (
                      <>
                        <Motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Loader2 size={13} />
                        </Motion.div>
                        신청 중...
                      </>
                    ) : (
                      <>
                        <Heart size={13} fill="#fff" />
                        신청하기
                      </>
                    )}
                  </Motion.button>
                </div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.div>
    </Motion.div>
  );
}

// ────── 한 줄 (A줄 or B줄) ──────
function SeatPickerRow({
  row,
  rowDirection,
  sessionMap,
  mySessionId,
  onSeatClick,
}) {
  const seats = Array.from(
    { length: row.seat_count },
    (_, i) => `${row.name}-${i + 1}`,
  );
  const dbLayout = row.layout || {};
  const defaultLayout = getDefaultLayout(
    row.name,
    row.seat_count,
    rowDirection,
  );
  const layout = { ...defaultLayout, ...dbLayout };

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 10,
          color: "rgba(255,107,157,0.5)",
          marginBottom: 4,
          letterSpacing: "0.1em",
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        {row.name}줄
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1.6 / 1",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {seats.map((seat) => {
          const session = sessionMap.get(seat);
          const pos = layout[seat] || { x: 50, y: 50, w: 7, h: 7 };
          const isMe = session?.id === mySessionId;
          const isAvailable = !!session && !isMe;
          const isEmpty = !session;

          return (
            <SeatBox
              key={seat}
              seat={seat}
              pos={pos}
              isMe={isMe}
              isAvailable={isAvailable}
              isEmpty={isEmpty}
              onClick={() => onSeatClick(seat)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SeatBox({ seat, pos, isMe, isAvailable, isEmpty, onClick }) {
  let style = {};
  let content = null;

  if (isMe) {
    style = {
      background:
        "linear-gradient(135deg, rgba(255,107,157,0.5), rgba(196,122,255,0.25))",
      border: "2px solid #FF6B9D",
      color: "#fff",
      boxShadow: "0 0 15px rgba(255,107,157,0.6)",
      cursor: "default",
    };
    content = (
      <Motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: "absolute",
          top: -20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#FF6B9D",
          color: "#fff",
          fontSize: 8,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 100,
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        내 자리 ✨
      </Motion.div>
    );
  } else if (isAvailable) {
    style = {
      background:
        "linear-gradient(135deg, rgba(106,176,106,0.25), rgba(60,120,60,0.12))",
      border: "1.5px solid rgba(106,176,106,0.55)",
      color: "#6AB06A",
      cursor: "pointer",
    };
  } else if (isEmpty) {
    style = {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.25)",
      cursor: "not-allowed",
    };
  }

  return (
    <Motion.div
      onClick={isAvailable ? onClick : undefined}
      animate={
        isMe
          ? {
              boxShadow: [
                "0 0 15px rgba(255,107,157,0.5)",
                "0 0 25px rgba(255,107,157,0.8)",
                "0 0 15px rgba(255,107,157,0.5)",
              ],
            }
          : isAvailable
            ? { scale: [1, 1.04, 1] }
            : {}
      }
      transition={isMe || isAvailable ? { duration: 2, repeat: Infinity } : {}}
      style={{
        position: "absolute",
        top: `${pos.y}%`,
        left: `${pos.x}%`,
        width: `${pos.w}%`,
        aspectRatio: "1",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: pos.w > 8 ? 10 : 8.5,
        fontWeight: 600,
        fontFamily: "'Noto Serif KR', serif",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {content}
      <span style={{ pointerEvents: "none" }}>{seat}</span>
      {isAvailable && (
        <span
          style={{
            position: "absolute",
            top: 1,
            right: 2,
            fontSize: 8,
            pointerEvents: "none",
          }}
        >
          💕
        </span>
      )}
    </Motion.div>
  );
}

function Legend({ color, border, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: color,
          border: `1px solid ${border}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
