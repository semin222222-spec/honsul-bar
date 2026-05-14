import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Move, Wallet, Trash2, Plus, Users } from "lucide-react";
import { useSeatRows } from "../hooks/useSeatRows";
import { useStoreId } from "../lib/StoreContext";
import ManualOrderModal from "./ManualOrderModal";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function elapsedMin(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

// ───── 좌석 셀 ─────
function SeatCell({ seat, session, sessionTotal, isMoveTarget, isMoving, isMergeTarget, isMerging, isDimmed, onClick }) {
  const isEmpty = !session;
  const inactiveMin = session?.last_active_at
    ? Math.floor((Date.now() - new Date(session.last_active_at).getTime()) / 60000)
    : 0;
  const isInactive = !isEmpty && inactiveMin >= 30;
  const hasOrders = sessionTotal > 0;

  let style = {};
  if (isMoving || isMerging) {
    style = {
      background: "linear-gradient(135deg, rgba(100,180,220,0.3), rgba(60,120,180,0.15))",
      border: "2px solid #aac8ff",
      color: "#aac8ff",
      boxShadow: "0 0 16px rgba(100,180,220,0.4)",
    };
  } else if (isMoveTarget) {
    style = {
      background: "rgba(100,180,220,0.1)",
      border: "1px solid rgba(100,180,220,0.4)",
      color: "#aac8ff",
      cursor: "pointer",
    };
  } else if (isMergeTarget) {
    style = {
      background: "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
      border: "1px solid rgba(196,122,255,0.5)",
      color: "#C47AFF",
      cursor: "pointer",
    };
  } else if (isDimmed) {
    style = {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.15)",
      opacity: 0.4,
      cursor: "not-allowed",
    };
  } else if (isEmpty) {
    style = {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.25)",
      cursor: "default",
    };
  } else if (hasOrders) {
    style = {
      background: "linear-gradient(135deg, rgba(226,75,74,0.2), rgba(180,40,40,0.1))",
      border: "1px solid rgba(226,75,74,0.5)",
      color: "rgba(255,180,180,0.95)",
      cursor: "pointer",
    };
  } else if (isInactive) {
    style = {
      background: "linear-gradient(135deg, rgba(226,150,75,0.18), rgba(180,100,40,0.1))",
      border: "1px solid rgba(226,150,75,0.45)",
      color: "rgba(255,200,130,0.95)",
      cursor: "pointer",
    };
  } else {
    style = {
      background: "linear-gradient(135deg, rgba(106,176,106,0.15), rgba(60,120,60,0.08))",
      border: "1px solid rgba(106,176,106,0.35)",
      color: "#6AB06A",
      cursor: "pointer",
    };
  }

  const animateProps = (isMoveTarget || isMergeTarget)
    ? { scale: [1, 1.04, 1] }
    : (hasOrders && !isMoving && !isMerging && !isDimmed
        ? { boxShadow: ["0 0 0 0 rgba(226,75,74,0.4)", "0 0 0 4px rgba(226,75,74,0)"] }
        : {});

  const transitionProps = (isMoveTarget || isMergeTarget)
    ? { duration: 1.5, repeat: Infinity }
    : (hasOrders ? { duration: 2, repeat: Infinity } : {});

  return (
    <motion.button
      layout
      onClick={() => onClick && onClick(seat)}
      animate={animateProps}
      transition={transitionProps}
      whileTap={(!isEmpty || isMoveTarget || isMergeTarget) ? { scale: 0.95 } : {}}
      style={{
        aspectRatio: "1.1",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
        textAlign: "center",
        fontFamily: "inherit",
        WebkitTapHighlightColor: "transparent",
        transition: "all 0.2s",
        ...style,
      }}
    >
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'Noto Serif KR', serif",
      }}>
        {seat}
      </span>
      {!isEmpty && hasOrders && (
        <span style={{ fontSize: 9, opacity: 0.85, marginTop: 1 }}>
          {sessionTotal.toLocaleString()}원
        </span>
      )}
      {!isEmpty && !hasOrders && (
        <span style={{ fontSize: 8, opacity: 0.6, marginTop: 1 }}>
          {elapsedMin(session.opened_at)}분
        </span>
      )}
    </motion.button>
  );
}

// ───── 디테일 팝업 ─────
function SeatDetailPopup({ session, sessionOrders, sessionTotal, onClose, onSettle, onMove, onMerge, onEmpty, onManualOrder }) {
  if (!session) return null;
  const inactiveMin = session.last_active_at
    ? Math.floor((Date.now() - new Date(session.last_active_at).getTime()) / 60000)
    : 0;

  const isMerged = session.nickname && (session.nickname.includes("+") || session.nickname.includes("외"));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        style={{
          width: "100%", maxWidth: 360,
          maxHeight: "90vh", overflowY: "auto",
          background: "rgba(20,18,14,0.97)",
          backdropFilter: "blur(24px)",
          borderRadius: 18,
          border: "1px solid rgba(212,165,55,0.3)",
          padding: "24px 22px",
          position: "relative",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12,
          width: 32, height: 32,
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
          color: "rgba(255,255,255,0.5)", cursor: "pointer",
        }}>
          <X size={14} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isMerged ? "rgba(196,122,255,0.1)" : "rgba(212,165,55,0.1)",
            border: "1.5px solid " + (isMerged ? "rgba(196,122,255,0.3)" : "rgba(212,165,55,0.3)"),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>
            {isMerged ? "👥" : (session.avatar || "🥃")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 22,
              fontFamily: "'Noto Serif KR', serif",
              color: "#D4A537",
              fontWeight: 500,
            }}>
              📍 {session.seat_label}
            </div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.5)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {session.nickname || "손님"}
              {isMerged && (
                <span style={{
                  marginLeft: 6, padding: "1px 5px",
                  background: "rgba(196,122,255,0.15)", color: "#C47AFF",
                  borderRadius: 4, fontSize: 9, fontWeight: 600,
                }}>합석</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
          {formatTime(session.opened_at)} 입장 · {elapsedMin(session.opened_at)}분 경과
        </div>

        {inactiveMin >= 30 && (
          <div style={{
            padding: "8px 10px",
            background: "rgba(226,150,75,0.1)",
            border: "1px solid rgba(226,150,75,0.25)",
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 11,
            color: "rgba(255,200,130,0.9)",
          }}>
            ⚠ 마지막 활동 {inactiveMin}분 전 — 자리를 뜬 걸 수도 있어요
          </div>
        )}

        {sessionOrders.length > 0 && (
          <div style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
            maxHeight: 160,
            overflowY: "auto",
          }}>
            {sessionOrders.map((o, i) => (
              <div key={o.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0",
                fontSize: 12, color: "rgba(255,255,255,0.7)",
                borderTop: i > 0 ? "1px dashed rgba(255,255,255,0.05)" : "none",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{o.menu_icon}</span>
                  <span>{o.menu_name}</span>
                  {o.option_name && (
                    <span style={{
                      fontSize: 8, padding: "1px 4px", borderRadius: 3,
                      background: "rgba(212,165,55,0.1)", color: "rgba(212,165,55,0.8)",
                    }}>
                      {o.option_name}
                    </span>
                  )}
                  {o.is_manual && (
                    <span style={{
                      fontSize: 8, padding: "1px 5px", borderRadius: 3,
                      background: "rgba(196,122,255,0.15)", color: "#C47AFF",
                      fontWeight: 600,
                    }}>사장님</span>
                  )}
                  {o.status === "served" && (
                    <span style={{
                      fontSize: 8, padding: "1px 5px", borderRadius: 4,
                      background: "rgba(106,176,106,0.15)", color: "#6AB06A",
                    }}>✓</span>
                  )}
                </span>
                <span style={{ color: "rgba(212,165,55,0.7)" }}>
                  {o.price.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: 14,
          background: "linear-gradient(135deg, rgba(212,165,55,0.15), rgba(180,120,30,0.08))",
          borderRadius: 10,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 11, color: "rgba(212,165,55,0.7)", letterSpacing: "0.1em" }}>
            총 결제
          </span>
          <span style={{
            fontSize: 22,
            color: "#D4A537",
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 500,
          }}>
            {sessionTotal.toLocaleString()}<span style={{ fontSize: 11, marginLeft: 3, color: "rgba(255,255,255,0.5)" }}>원</span>
          </span>
        </div>

        {/* 주문 추가 버튼 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onManualOrder}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            marginBottom: 8,
            background: "rgba(212,165,55,0.08)",
            border: "1px dashed rgba(212,165,55,0.4)",
            color: "#D4A537",
            fontSize: 12, fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Plus size={14} /> 주문 추가
        </motion.button>

        {/* 액션 버튼 3개: 비우기 / 자리이동 / 합석 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
          <button
            onClick={onEmpty}
            style={{
              padding: "11px 4px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
            }}
          >
            <Trash2 size={11} /> 비우기
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onMove}
            style={{
              padding: "11px 4px", borderRadius: 10,
              background: "linear-gradient(135deg, rgba(100,180,220,0.2), rgba(60,120,180,0.1))",
              border: "1px solid rgba(100,180,220,0.4)",
              color: "#aac8ff",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
            }}
          >
            <Move size={11} /> 자리이동
          </motion.button>
          {/* 🆕 합석 버튼 */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onMerge}
            style={{
              padding: "11px 4px", borderRadius: 10,
              background: "linear-gradient(135deg, rgba(196,122,255,0.2), rgba(140,80,200,0.1))",
              border: "1px solid rgba(196,122,255,0.4)",
              color: "#C47AFF",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
            }}
          >
            <Users size={11} /> 합석
          </motion.button>
        </div>

        {sessionTotal > 0 && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSettle}
            style={{
              width: "100%",
              padding: 14, borderRadius: 10,
              background: "linear-gradient(135deg, #D4A537, #B8860B)",
              border: "none",
              color: "#0D0B08",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 4,
            }}
          >
            <Wallet size={14} /> 정산 완료 ({sessionTotal.toLocaleString()}원)
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ───── 자리 이동 확인 모달 ─────
function MoveConfirmModal({ fromSeat, toSeat, sessionTotal, orderCount, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          width: "100%", maxWidth: 320,
          background: "rgba(20,18,14,0.97)",
          border: "1px solid rgba(100,180,220,0.4)",
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔄</div>
        <div style={{
          fontSize: 16,
          color: "#F5E6C8",
          fontFamily: "'Noto Serif KR', serif",
          marginBottom: 8,
        }}>
          자리 이동
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 14 }}>
          손님과 주문 내역이<br />
          모두 새 자리로 이동돼요
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 14, margin: "16px 0",
          fontSize: 18,
          fontFamily: "'Noto Serif KR', serif",
        }}>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>📍 {fromSeat}</span>
          <span style={{ color: "rgba(212,165,55,0.5)", fontSize: 16 }}>→</span>
          <span style={{ color: "#aac8ff", fontWeight: 600 }}>📍 {toSeat}</span>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
          {sessionTotal.toLocaleString()}원 · 주문 {orderCount}건
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(100,180,220,0.6), rgba(60,120,180,0.5))",
              border: "none",
              color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            이동하기
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───── 🆕 합석 확인 모달 ─────
function MergeConfirmModal({ fromSession, toSession, fromTotal, toTotal, onConfirm, onCancel }) {
  const mergedTotal = fromTotal + toTotal;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          width: "100%", maxWidth: 340,
          background: "rgba(20,18,14,0.97)",
          border: "1px solid rgba(196,122,255,0.4)",
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>🤝</div>
        <div style={{
          fontSize: 16,
          color: "#F5E6C8",
          fontFamily: "'Noto Serif KR', serif",
          marginBottom: 8,
        }}>
          합석하기
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 16 }}>
          두 손님과 주문이<br />
          한 자리로 합쳐져요
        </div>

        <div style={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 0",
            borderBottom: "1px dashed rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              📍 {fromSession.seat_label} <span style={{ color: "rgba(255,255,255,0.4)" }}>· {fromSession.nickname}</span>
            </span>
            <span style={{ fontSize: 12, color: "rgba(212,165,55,0.7)", fontFamily: "'Noto Serif KR', serif" }}>
              {fromTotal.toLocaleString()}원
            </span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 0",
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              📍 {toSession.seat_label} <span style={{ color: "rgba(255,255,255,0.4)" }}>· {toSession.nickname}</span>
            </span>
            <span style={{ fontSize: 12, color: "rgba(212,165,55,0.7)", fontFamily: "'Noto Serif KR', serif" }}>
              {toTotal.toLocaleString()}원
            </span>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, marginBottom: 12,
          fontSize: 14,
          color: "rgba(196,122,255,0.8)",
        }}>
          <span>📍 {fromSession.seat_label}</span>
          <span style={{ fontSize: 12 }}>→</span>
          <span style={{ color: "#C47AFF", fontWeight: 600 }}>📍 {toSession.seat_label}</span>
        </div>

        <div style={{
          padding: 12,
          background: "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
          border: "1px solid rgba(196,122,255,0.3)",
          borderRadius: 10,
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 10, color: "rgba(196,122,255,0.7)", marginBottom: 4, letterSpacing: "0.1em" }}>
            합쳐진 후 ({toSession.seat_label})
          </div>
          <div style={{
            fontSize: 22,
            color: "#C47AFF",
            fontWeight: 600,
            fontFamily: "'Noto Serif KR', serif",
          }}>
            {mergedTotal.toLocaleString()}<span style={{ fontSize: 11, marginLeft: 3, color: "rgba(255,255,255,0.5)" }}>원</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(196,122,255,0.7), rgba(140,80,200,0.6))",
              border: "none",
              color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            합석하기
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───── 메인 SeatMap ─────
export default function SeatMap({
  sessions,
  orders,
  onClose,
  onSettle,
  onMove,
  onMerge,
  categories = [],
  menus = [],
  optionsByMenu = new Map(),
  onOrdersRefetch,
}) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [movingSession, setMovingSession] = useState(null);
  const [mergingSession, setMergingSession] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [pendingMerge, setPendingMerge] = useState(null);
  const [manualOrderSession, setManualOrderSession] = useState(null);
  const [toast, setToast] = useState(null);

  const storeId = useStoreId();
  const { rows: seatRows } = useSeatRows(storeId);

  const sessionMap = new Map();
  sessions.forEach(s => sessionMap.set(s.seat_label, s));

  const sessionTotals = new Map();
  const sessionOrdersMap = new Map();
  (orders || []).forEach(o => {
    if (!sessionTotals.has(o.session_id)) {
      sessionTotals.set(o.session_id, 0);
      sessionOrdersMap.set(o.session_id, []);
    }
    sessionTotals.set(o.session_id, sessionTotals.get(o.session_id) + o.price);
    sessionOrdersMap.get(o.session_id).push(o);
  });

  const handleSeatClick = (seat) => {
    // 자리 이동 모드
    if (movingSession) {
      if (movingSession.seat_label === seat) return;
      if (sessionMap.has(seat)) return;
      setPendingMove({
        sessionId: movingSession.id,
        fromSeat: movingSession.seat_label,
        toSeat: seat,
      });
      return;
    }

    // 🆕 합석 모드
    if (mergingSession) {
      if (mergingSession.seat_label === seat) return;
      const targetSession = sessionMap.get(seat);
      if (!targetSession) return;
      setPendingMerge({
        fromSession: mergingSession,
        toSession: targetSession,
      });
      return;
    }

    const session = sessionMap.get(seat);
    if (session) {
      setSelectedSession(session);
    }
  };

  const handleStartMove = () => {
    setMovingSession(selectedSession);
    setSelectedSession(null);
  };

  const handleCancelMove = () => {
    setMovingSession(null);
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    const result = await onMove(pendingMove.sessionId, pendingMove.toSeat);
    if (result?.ok) {
      setToast(`${pendingMove.fromSeat} 손님이 ${pendingMove.toSeat}로 이동했어요`);
      setTimeout(() => setToast(null), 3000);
    } else if (result?.reason === "occupied") {
      setToast("이미 점유된 좌석이에요");
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast("이동에 실패했어요");
      setTimeout(() => setToast(null), 3000);
    }
    setPendingMove(null);
    setMovingSession(null);
  };

  // 🆕 합석
  const handleStartMerge = () => {
    setMergingSession(selectedSession);
    setSelectedSession(null);
  };

  const handleCancelMerge = () => {
    setMergingSession(null);
  };

  const handleConfirmMerge = async () => {
    if (!pendingMerge || !onMerge) return;
    const result = await onMerge(pendingMerge.fromSession.id, pendingMerge.toSession.seat_label);
    if (result?.ok) {
      setToast(`${result.fromNickname} 손님이 ${result.toSeat}로 합석했어요`);
      setTimeout(() => setToast(null), 3500);
      onOrdersRefetch?.();
    } else {
      setToast("합석에 실패했어요. 다시 시도해주세요.");
      setTimeout(() => setToast(null), 3000);
    }
    setPendingMerge(null);
    setMergingSession(null);
  };

  // 수동 주문
  const handleStartManualOrder = () => {
    setManualOrderSession(selectedSession);
    setSelectedSession(null);
  };

  const handleManualOrderSuccess = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
    onOrdersRefetch?.();
  };

  const renderRow = (seats, label) => {
    const occupiedCount = seats.filter(s => sessionMap.has(s)).length;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8,
          fontSize: 11, color: "rgba(212,165,55,0.6)",
          letterSpacing: "0.1em",
          fontFamily: "'Noto Serif KR', serif",
        }}>
          <span>{label}</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>{occupiedCount}/{seats.length}석</span>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
        }}>
          {seats.map(seat => {
            const session = sessionMap.get(seat);
            const isMoving = movingSession?.seat_label === seat;
            const isMerging = mergingSession?.seat_label === seat;
            const isMoveTarget = movingSession && !session;
            const isMergeTarget = mergingSession && session && !isMerging;
            const isDimmed = (movingSession && session && !isMoving) ||
                             (mergingSession && !session);
            return (
              <SeatCell
                key={seat}
                seat={seat}
                session={session}
                sessionTotal={session ? (sessionTotals.get(session.id) || 0) : 0}
                isMoveTarget={isMoveTarget}
                isMoving={isMoving}
                isMergeTarget={isMergeTarget}
                isMerging={isMerging}
                isDimmed={isDimmed}
                onClick={handleSeatClick}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* 범례 */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 10,
        color: "rgba(255,255,255,0.6)",
      }}>
        <Legend color="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.1)" label="빈자리" />
        <Legend color="rgba(106,176,106,0.5)" label="이용중" />
        <Legend color="rgba(226,150,75,0.6)" label="비활성" />
        <Legend color="rgba(226,75,74,0.7)" label="정산대기" />
      </div>

      {/* 이동 모드 배너 */}
      <AnimatePresence>
        {movingSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: "linear-gradient(135deg, rgba(100,180,220,0.15), rgba(60,120,180,0.08))",
              border: "1.5px solid rgba(100,180,220,0.4)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, color: "#aac8ff", fontWeight: 600, marginBottom: 2,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                🔄 자리 이동 모드
              </div>
              <div style={{ fontSize: 11, color: "rgba(200,230,255,0.7)" }}>
                <strong style={{ color: "#aac8ff" }}>{movingSession.seat_label}</strong>를 빈자리로 옮기세요
              </div>
            </div>
            <button
              onClick={handleCancelMove}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.7)",
                fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              취소
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🆕 합석 모드 배너 */}
      <AnimatePresence>
        {mergingSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
              border: "1.5px solid rgba(196,122,255,0.4)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, color: "#C47AFF", fontWeight: 600, marginBottom: 2,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                🤝 합석 모드
              </div>
              <div style={{ fontSize: 11, color: "rgba(220,200,255,0.7)" }}>
                <strong style={{ color: "#C47AFF" }}>{mergingSession.seat_label}</strong>을 어느 자리에 합칠까요? (다른 손님 자리 선택)
              </div>
            </div>
            <button
              onClick={handleCancelMerge}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.7)",
                fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              취소
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {seatRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          좌석이 설정되지 않았어요
        </div>
      ) : seatRows.map(row => {
        const seats = Array.from({ length: row.seat_count }, (_, i) => `${row.name}-${i + 1}`);
        return <div key={row.id}>{renderRow(seats, `${row.name}줄`)}</div>;
      })}

      {/* 디테일 팝업 */}
      <AnimatePresence>
        {selectedSession && (
          <SeatDetailPopup
            session={selectedSession}
            sessionOrders={sessionOrdersMap.get(selectedSession.id) || []}
            sessionTotal={sessionTotals.get(selectedSession.id) || 0}
            onClose={() => setSelectedSession(null)}
            onMove={handleStartMove}
            onMerge={handleStartMerge}
            onManualOrder={handleStartManualOrder}
            onEmpty={() => {
              onClose(selectedSession.id);
              setSelectedSession(null);
            }}
            onSettle={() => {
              onSettle(selectedSession.id);
              setSelectedSession(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* 이동 확인 */}
      <AnimatePresence>
        {pendingMove && (
          <MoveConfirmModal
            fromSeat={pendingMove.fromSeat}
            toSeat={pendingMove.toSeat}
            sessionTotal={sessionTotals.get(pendingMove.sessionId) || 0}
            orderCount={(sessionOrdersMap.get(pendingMove.sessionId) || []).length}
            onConfirm={handleConfirmMove}
            onCancel={() => setPendingMove(null)}
          />
        )}
      </AnimatePresence>

      {/* 🆕 합석 확인 */}
      <AnimatePresence>
        {pendingMerge && (
          <MergeConfirmModal
            fromSession={pendingMerge.fromSession}
            toSession={pendingMerge.toSession}
            fromTotal={sessionTotals.get(pendingMerge.fromSession.id) || 0}
            toTotal={sessionTotals.get(pendingMerge.toSession.id) || 0}
            onConfirm={handleConfirmMerge}
            onCancel={() => setPendingMerge(null)}
          />
        )}
      </AnimatePresence>

      {/* 수동 주문 모달 */}
      <AnimatePresence>
        {manualOrderSession && (
          <ManualOrderModal
            session={manualOrderSession}
            categories={categories}
            menus={menus}
            optionsByMenu={optionsByMenu}
            onClose={() => setManualOrderSession(null)}
            onSuccess={handleManualOrderSuccess}
          />
        )}
      </AnimatePresence>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed",
              top: 20, left: "50%", transform: "translateX(-50%)",
              background: "linear-gradient(135deg, rgba(106,176,106,0.95), rgba(60,120,60,0.95))",
              color: "white",
              padding: "12px 20px",
              borderRadius: 12,
              boxShadow: "0 8px 30px rgba(106,176,106,0.4)",
              fontSize: 13,
              fontWeight: 500,
              zIndex: 400,
              fontFamily: "inherit",
            }}
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Legend({ color, border, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{
        width: 12, height: 12, borderRadius: 4,
        background: color,
        border: border ? `1px solid ${border}` : "none",
      }} />
      <span>{label}</span>
    </div>
  );
}
