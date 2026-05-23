import { useState, useMemo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  X,
  Move,
  Wallet,
  Trash2,
  Plus,
  Users,
  Edit3,
  Save,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Clock,
} from "lucide-react";
import { useSeatRows } from "@/features/seats/hooks/useSeatRows";
import { useStoreId } from "@/shared/store/StoreContext";
import { orderRepository } from "@/repositories/orders/orderRepository";
import { selectEmptySeatSessionIds } from "@/services/sessions/seatCleanup";
import ManualOrderModal from "@/features/orders/components/ManualOrderModal";
import FloorPlan, {
  saveLayoutToDB,
  resetLayoutInDB,
} from "@/features/seats/components/FloorPlan";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function elapsedMin(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

// ───── 디테일 팝업 ─────
function SeatDetailPopup({
  session,
  sessionOrders,
  sessionTotal,
  onClose,
  onSettle,
  onMove,
  onMerge,
  onEmpty,
  onManualOrder,
  onCancelOrder,
}) {
  const [cancelingOrderId, setCancelingOrderId] = useState(null);

  if (!session) return null;
  const inactiveMin = session.last_active_at
    ? elapsedMin(session.last_active_at)
    : 0;

  const isMerged =
    session.nickname &&
    (session.nickname.includes("+") || session.nickname.includes("외"));

  const cancelingOrder = sessionOrders.find((o) => o.id === cancelingOrderId);

  const handleConfirmCancel = async () => {
    if (!cancelingOrderId) return;
    await onCancelOrder(cancelingOrderId);
    setCancelingOrderId(null);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 360,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(20,18,14,0.97)",
          backdropFilter: "blur(24px)",
          borderRadius: 18,
          border: "1px solid rgba(212,165,55,0.3)",
          padding: "24px 22px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 8,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isMerged
                ? "rgba(196,122,255,0.1)"
                : "rgba(212,165,55,0.1)",
              border:
                "1.5px solid " +
                (isMerged ? "rgba(196,122,255,0.3)" : "rgba(212,165,55,0.3)"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {isMerged ? "👥" : session.avatar || "🥃"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontFamily: "'Noto Serif KR', serif",
                color: "#D4A537",
                fontWeight: 500,
              }}
            >
              📍 {session.seat_label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.nickname || "손님"}
              {isMerged && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: "1px 5px",
                    background: "rgba(196,122,255,0.15)",
                    color: "#C47AFF",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                >
                  합석
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 16,
          }}
        >
          {formatTime(session.opened_at)} 입장 · {elapsedMin(session.opened_at)}
          분 경과
        </div>

        {inactiveMin >= 30 && (
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(226,150,75,0.1)",
              border: "1px solid rgba(226,150,75,0.25)",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 11,
              color: "rgba(255,200,130,0.9)",
            }}
          >
            ⚠ 마지막 활동 {inactiveMin}분 전 — 자리를 뜬 걸 수도 있어요
          </div>
        )}

        {sessionOrders.length > 0 && (
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {sessionOrders.map((o, i) => (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  borderTop:
                    i > 0 ? "1px dashed rgba(255,255,255,0.05)" : "none",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span>{o.menu_icon}</span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {o.menu_name}
                  </span>
                  {o.option_name && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 4px",
                        borderRadius: 3,
                        background: "rgba(212,165,55,0.1)",
                        color: "rgba(212,165,55,0.8)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {o.option_name}
                    </span>
                  )}
                  {o.is_manual && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 3,
                        background: "rgba(196,122,255,0.15)",
                        color: "#C47AFF",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      사장님
                    </span>
                  )}
                  {o.status === "served" && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: "rgba(106,176,106,0.15)",
                        color: "#6AB06A",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </span>
                <span
                  style={{
                    color: "rgba(212,165,55,0.7)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {o.price.toLocaleString()}원
                </span>
                <Motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCancelingOrderId(o.id)}
                  style={{
                    width: 22,
                    height: 22,
                    background: "rgba(226,75,74,0.08)",
                    border: "1px solid rgba(226,75,74,0.25)",
                    borderRadius: 6,
                    color: "rgba(255,150,150,0.7)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "inherit",
                    padding: 0,
                    flexShrink: 0,
                  }}
                  title="주문 취소"
                >
                  <X size={11} />
                </Motion.button>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 14,
            background:
              "linear-gradient(135deg, rgba(212,165,55,0.15), rgba(180,120,30,0.08))",
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "rgba(212,165,55,0.7)",
              letterSpacing: "0.1em",
            }}
          >
            총 결제
          </span>
          <span
            style={{
              fontSize: 22,
              color: "#D4A537",
              fontFamily: "'Noto Serif KR', serif",
              fontWeight: 500,
            }}
          >
            {sessionTotal.toLocaleString()}
            <span
              style={{
                fontSize: 11,
                marginLeft: 3,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              원
            </span>
          </span>
        </div>

        <Motion.button
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
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus size={14} /> 주문 추가
        </Motion.button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <button
            onClick={onEmpty}
            style={{
              padding: "11px 4px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <Trash2 size={11} /> 비우기
          </button>
          <Motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onMove}
            style={{
              padding: "11px 4px",
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(100,180,220,0.2), rgba(60,120,180,0.1))",
              border: "1px solid rgba(100,180,220,0.4)",
              color: "#aac8ff",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <Move size={11} /> 자리이동
          </Motion.button>
          <Motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onMerge}
            style={{
              padding: "11px 4px",
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(196,122,255,0.2), rgba(140,80,200,0.1))",
              border: "1px solid rgba(196,122,255,0.4)",
              color: "#C47AFF",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <Users size={11} /> 합석
          </Motion.button>
        </div>

        {sessionTotal > 0 && (
          <Motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSettle}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 10,
              background: "linear-gradient(135deg, #D4A537, #B8860B)",
              border: "none",
              color: "#0D0B08",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <Wallet size={14} /> 정산 완료 ({sessionTotal.toLocaleString()}원)
          </Motion.button>
        )}

        <AnimatePresence>
          {cancelingOrder && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setCancelingOrderId(null);
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
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                style={{
                  width: "100%",
                  maxWidth: 320,
                  background: "rgba(20,18,14,0.98)",
                  border: "1px solid rgba(226,75,74,0.4)",
                  borderRadius: 16,
                  padding: 22,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: 12,
                    color: "rgba(255,150,150,0.95)",
                  }}
                >
                  <AlertTriangle size={20} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "'Noto Serif KR', serif",
                    }}
                  >
                    이 주문을 취소할까요?
                  </span>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 9,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#F5E6C8",
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {cancelingOrder.menu_icon}
                  </span>
                  <span style={{ flex: 1, textAlign: "left" }}>
                    {cancelingOrder.menu_name}
                    {cancelingOrder.option_name && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          marginLeft: 4,
                          background: "rgba(212,165,55,0.15)",
                          color: "#D4A537",
                          borderRadius: 3,
                        }}
                      >
                        {cancelingOrder.option_name}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      color: "#D4A537",
                      fontFamily: "'Noto Serif KR', serif",
                    }}
                  >
                    {cancelingOrder.price.toLocaleString()}원
                  </span>
                </div>

                {cancelingOrder.status === "served" && (
                  <div
                    style={{
                      padding: "8px 10px",
                      background: "rgba(226,75,74,0.08)",
                      border: "1px solid rgba(226,75,74,0.2)",
                      borderRadius: 8,
                      marginBottom: 14,
                      fontSize: 10,
                      color: "rgba(255,180,180,0.85)",
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠️ 이미 제공된 주문입니다. 재고 등을 확인해주세요.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setCancelingOrderId(null)}
                    style={{
                      flex: 1,
                      padding: 11,
                      borderRadius: 9,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    아니요
                  </button>
                  <Motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleConfirmCancel}
                    style={{
                      flex: 1.3,
                      padding: 11,
                      borderRadius: 9,
                      background: "linear-gradient(135deg, #E24B4A, #B03838)",
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    네, 취소
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

// ───── 이동 확인 모달 ─────
function MoveConfirmModal({
  fromSeat,
  toSeat,
  sessionTotal,
  orderCount,
  onConfirm,
  onCancel,
}) {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
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
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 320,
          background: "rgba(20,18,14,0.97)",
          border: "1px solid rgba(100,180,220,0.4)",
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔄</div>
        <div
          style={{
            fontSize: 16,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 8,
          }}
        >
          자리 이동
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          손님과 주문 내역이
          <br />
          모두 새 자리로 이동돼요
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            margin: "16px 0",
            fontSize: 18,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.5)" }}>📍 {fromSeat}</span>
          <span style={{ color: "rgba(212,165,55,0.5)", fontSize: 16 }}>→</span>
          <span style={{ color: "#aac8ff", fontWeight: 600 }}>📍 {toSeat}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 16,
          }}
        >
          {sessionTotal.toLocaleString()}원 · 주문 {orderCount}건
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
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
            }}
          >
            취소
          </button>
          <Motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(100,180,220,0.6), rgba(60,120,180,0.5))",
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            이동하기
          </Motion.button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

// ───── 합석 확인 모달 ─────
function MergeConfirmModal({
  fromSession,
  toSession,
  fromTotal,
  toTotal,
  onConfirm,
  onCancel,
}) {
  const mergedTotal = fromTotal + toTotal;
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
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
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 340,
          background: "rgba(20,18,14,0.97)",
          border: "1px solid rgba(196,122,255,0.4)",
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>🤝</div>
        <div
          style={{
            fontSize: 16,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 8,
          }}
        >
          합석하기
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          두 손님과 주문이
          <br />한 자리로 합쳐져요
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
              borderBottom: "1px dashed rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              📍 {fromSession.seat_label}{" "}
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                · {fromSession.nickname}
              </span>
            </span>
            <span
              style={{
                fontSize: 12,
                color: "rgba(212,165,55,0.7)",
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {fromTotal.toLocaleString()}원
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              📍 {toSession.seat_label}{" "}
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                · {toSession.nickname}
              </span>
            </span>
            <span
              style={{
                fontSize: 12,
                color: "rgba(212,165,55,0.7)",
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {toTotal.toLocaleString()}원
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 12,
            fontSize: 14,
            color: "rgba(196,122,255,0.8)",
          }}
        >
          <span>📍 {fromSession.seat_label}</span>
          <span style={{ fontSize: 12 }}>→</span>
          <span style={{ color: "#C47AFF", fontWeight: 600 }}>
            📍 {toSession.seat_label}
          </span>
        </div>
        <div
          style={{
            padding: 12,
            background:
              "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
            border: "1px solid rgba(196,122,255,0.3)",
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "rgba(196,122,255,0.7)",
              marginBottom: 4,
              letterSpacing: "0.1em",
            }}
          >
            합쳐진 후 ({toSession.seat_label})
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#C47AFF",
              fontWeight: 600,
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            {mergedTotal.toLocaleString()}
            <span
              style={{
                fontSize: 11,
                marginLeft: 3,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              원
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
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
            }}
          >
            취소
          </button>
          <Motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(196,122,255,0.7), rgba(140,80,200,0.6))",
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            합석하기
          </Motion.button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

// ───── 빈 좌석 한꺼번에 비우기 확인 모달 ─────
function BulkEmptyConfirmModal({ emptySessions, onConfirm, onCancel }) {
  const count = emptySessions.length;
  const seatLabels = emptySessions.map((s) => s.seat_label).join(", ");

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
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
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 340,
          background: "rgba(20,18,14,0.97)",
          border: "1px solid rgba(226,150,75,0.4)",
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>🧹</div>
        <div
          style={{
            fontSize: 16,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 8,
          }}
        >
          빈 좌석 비우기
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          주문이 없는 좌석{" "}
          <strong style={{ color: "rgba(255,200,130,0.95)" }}>{count}곳</strong>
          을 한꺼번에 비웁니다.
          <br />
          주문이 들어간 좌석은 그대로 둡니다.
        </div>

        {seatLabels && (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(226,150,75,0.08)",
              border: "1px solid rgba(226,150,75,0.2)",
              borderRadius: 9,
              marginBottom: 18,
              fontSize: 11,
              color: "rgba(255,210,160,0.9)",
              lineHeight: 1.6,
              maxHeight: 110,
              overflowY: "auto",
              wordBreak: "keep-all",
            }}
          >
            {seatLabels}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
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
            }}
          >
            취소
          </button>
          <Motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{
              flex: 1.3,
              padding: 12,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(226,150,75,0.85), rgba(180,100,40,0.7))",
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {count}곳 비우기
          </Motion.button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

// ───── 메인 SeatMap ─────
export default function SeatMap({
  sessions,
  orders,
  onClose,
  onBulkEmpty,
  autoEmptyOn = true,
  onToggleAutoEmpty,
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
  const [confirmBulkEmpty, setConfirmBulkEmpty] = useState(false);
  const [toast, setToast] = useState(null);

  // 주문 없는 빈 좌석들 (수동 "한꺼번에 비우기" 대상)
  const emptySessions = useMemo(() => {
    const ids = new Set(selectEmptySeatSessionIds(sessions, orders));
    return (sessions || []).filter((s) => ids.has(s.id));
  }, [sessions, orders]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLayouts, setEditingLayouts] = useState({});
  const [saving, setSaving] = useState(false);

  const storeId = useStoreId();
  // 🆕 loading 상태도 가져옴
  const {
    rows: seatRows,
    loading: seatRowsLoading,
    refetch: refetchRows,
  } = useSeatRows(storeId);

  const sessionMap = new Map();
  sessions.forEach((s) => sessionMap.set(s.seat_label, s));

  const sessionTotals = new Map();
  const sessionOrdersMap = new Map();
  (orders || []).forEach((o) => {
    if (!sessionTotals.has(o.session_id)) {
      sessionTotals.set(o.session_id, 0);
      sessionOrdersMap.set(o.session_id, []);
    }
    sessionTotals.set(o.session_id, sessionTotals.get(o.session_id) + o.price);
    sessionOrdersMap.get(o.session_id).push(o);
  });

  const handleSeatClick = (seat) => {
    if (isEditMode) return;

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
    if (session) setSelectedSession(session);
  };

  const handleStartMove = () => {
    setMovingSession(selectedSession);
    setSelectedSession(null);
  };
  const handleCancelMove = () => setMovingSession(null);
  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    const result = await onMove(pendingMove.sessionId, pendingMove.toSeat);
    if (result?.ok) {
      setToast(
        `${pendingMove.fromSeat} 손님이 ${pendingMove.toSeat}로 이동했어요`,
      );
    } else if (result?.reason === "occupied") {
      setToast("이미 점유된 좌석이에요");
    } else {
      setToast("이동에 실패했어요");
    }
    setTimeout(() => setToast(null), 3000);
    setPendingMove(null);
    setMovingSession(null);
  };

  const handleStartMerge = () => {
    setMergingSession(selectedSession);
    setSelectedSession(null);
  };
  const handleCancelMerge = () => setMergingSession(null);
  const handleConfirmMerge = async () => {
    if (!pendingMerge || !onMerge) return;
    const result = await onMerge(
      pendingMerge.fromSession.id,
      pendingMerge.toSession.seat_label,
    );
    if (result?.ok) {
      setToast(`${result.fromNickname} 손님이 ${result.toSeat}로 합석했어요`);
      onOrdersRefetch?.();
    } else {
      setToast("합석에 실패했어요. 다시 시도해주세요.");
    }
    setTimeout(() => setToast(null), 3500);
    setPendingMerge(null);
    setMergingSession(null);
  };

  const handleStartManualOrder = () => {
    setManualOrderSession(selectedSession);
    setSelectedSession(null);
  };
  const handleManualOrderSuccess = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
    onOrdersRefetch?.();
  };

  const handleCancelOrder = async (orderId) => {
    if (!orderId || !storeId) return;
    try {
      try {
        await orderRepository.deleteStoreOrder({ storeId, orderId });
        setToast("✓ 주문이 취소되었어요");
        onOrdersRefetch?.();
        setTimeout(() => {
          if (selectedSession) {
            const updated = sessions.find((s) => s.id === selectedSession.id);
            if (updated) setSelectedSession(updated);
          }
        }, 300);
      } catch (error) {
        console.error("주문 취소 실패:", error);
        setToast("주문 취소에 실패했어요");
      }
    } catch (err) {
      console.error("주문 취소 예외:", err);
      setToast("주문 취소 중 오류가 발생했어요");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmBulkEmpty = async () => {
    const ids = emptySessions.map((s) => s.id);
    setConfirmBulkEmpty(false);
    if (ids.length === 0 || !onBulkEmpty) return;

    const count = await onBulkEmpty(ids);
    if (count > 0) {
      setToast(`빈 좌석 ${count}곳을 비웠어요`);
    } else {
      setToast("비우기에 실패했어요. 다시 시도해주세요.");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartEdit = () => {
    setMovingSession(null);
    setMergingSession(null);
    setSelectedSession(null);
    setEditingLayouts({});
    setIsEditMode(true);
  };

  const handleSaveLayout = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const promises = seatRows.map(async (row) => {
        const layout = editingLayouts[row.name];
        if (layout) return saveLayoutToDB(row.id, layout, storeId);
        return Promise.resolve(true);
      });
      const results = await Promise.all(promises);
      const allOk = results.every((r) => r);
      if (allOk) {
        setToast("✓ 좌석 배치를 저장했어요");
        await refetchRows();
        setIsEditMode(false);
        setEditingLayouts({});
      } else {
        setToast("일부 저장에 실패했어요");
      }
    } catch (err) {
      console.error("레이아웃 저장 오류:", err);
      setToast("저장 중 오류가 발생했어요");
    }
    setTimeout(() => setToast(null), 3500);
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingLayouts({});
  };

  const handleResetLayout = async () => {
    if (!storeId) return;
    if (
      !window.confirm(
        "좌석 배치를 기본값으로 되돌릴까요?\n저장된 위치/크기가 모두 사라져요.",
      )
    )
      return;
    setSaving(true);
    try {
      const promises = seatRows.map((row) => resetLayoutInDB(row.id, storeId));
      await Promise.all(promises);
      setToast("✓ 기본 배치로 되돌렸어요");
      await refetchRows();
      setIsEditMode(false);
      setEditingLayouts({});
    } catch (err) {
      console.error("리셋 오류:", err);
      setToast("리셋 중 오류가 발생했어요");
    }
    setTimeout(() => setToast(null), 3500);
    setSaving(false);
  };

  const handleLayoutChange = (rowName, newLayout) => {
    setEditingLayouts((prev) => ({ ...prev, [rowName]: newLayout }));
  };

  return (
    <div>
      {!isEditMode && (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 10,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <Legend
            color="rgba(255,255,255,0.05)"
            border="rgba(255,255,255,0.1)"
            label="빈자리"
          />
          <Legend color="rgba(106,176,106,0.5)" label="이용중" />
          <Legend color="rgba(226,150,75,0.6)" label="비활성" />
          <Legend color="rgba(226,75,74,0.7)" label="정산대기" />
        </div>
      )}

      {/* 빈 좌석 정리: 한꺼번에 비우기 + 30분 자동 비우기 토글 */}
      {!isEditMode && !movingSession && !mergingSession && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button
            onClick={() => setConfirmBulkEmpty(true)}
            disabled={emptySessions.length === 0}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              background:
                emptySessions.length === 0
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(226,150,75,0.1)",
              border:
                "1px solid " +
                (emptySessions.length === 0
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(226,150,75,0.35)"),
              color:
                emptySessions.length === 0
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,200,130,0.95)",
              fontSize: 11,
              fontWeight: 600,
              cursor: emptySessions.length === 0 ? "default" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Trash2 size={12} />
            빈 좌석 비우기
            {emptySessions.length > 0 && (
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 6,
                  background: "rgba(226,150,75,0.25)",
                  color: "#F5E6C8",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {emptySessions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onToggleAutoEmpty?.()}
            title="주문 없이 입장 후 30분 지난 좌석을 자동으로 비웁니다"
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              background: autoEmptyOn
                ? "rgba(106,176,106,0.12)"
                : "rgba(255,255,255,0.03)",
              border:
                "1px solid " +
                (autoEmptyOn
                  ? "rgba(106,176,106,0.35)"
                  : "rgba(255,255,255,0.08)"),
              color: autoEmptyOn ? "#6AB06A" : "rgba(255,255,255,0.4)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Clock size={12} />
            30분 자동비우기
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 6,
                background: autoEmptyOn
                  ? "rgba(106,176,106,0.25)"
                  : "rgba(255,255,255,0.06)",
                color: autoEmptyOn ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {autoEmptyOn ? "켜짐" : "꺼짐"}
            </span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isEditMode && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background:
                "linear-gradient(135deg, rgba(212,165,55,0.15), rgba(180,120,30,0.08))",
              border: "1.5px solid rgba(212,165,55,0.4)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#D4A537",
                fontWeight: 600,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Edit3 size={14} /> 좌석 배치 편집 모드
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,230,180,0.7)",
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              • 좌석을 <strong>드래그</strong>해서 위치를 옮기세요
              <br />• 오른쪽 아래 <strong>점</strong>을 끌어서 크기 조절
              <br />• 다 됐으면 저장 버튼을 누르세요
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <X size={12} /> 취소
              </button>
              <button
                onClick={handleResetLayout}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  background: "rgba(226,75,74,0.1)",
                  border: "1px solid rgba(226,75,74,0.3)",
                  color: "rgba(255,180,180,0.85)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <RotateCcw size={12} /> 기본값
              </button>
              <Motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSaveLayout}
                disabled={saving}
                style={{
                  flex: 1.5,
                  padding: "8px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #D4A537, #B8860B)",
                  border: "none",
                  color: "#0D0B08",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Save size={12} /> {saving ? "저장 중..." : "저장"}
              </Motion.button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {movingSession && !isEditMode && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background:
                "linear-gradient(135deg, rgba(100,180,220,0.15), rgba(60,120,180,0.08))",
              border: "1.5px solid rgba(100,180,220,0.4)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#aac8ff",
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                🔄 자리 이동 모드
              </div>
              <div style={{ fontSize: 11, color: "rgba(200,230,255,0.7)" }}>
                <strong style={{ color: "#aac8ff" }}>
                  {movingSession.seat_label}
                </strong>
                를 빈자리로 옮기세요
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
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              취소
            </button>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mergingSession && !isEditMode && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background:
                "linear-gradient(135deg, rgba(196,122,255,0.15), rgba(140,80,200,0.08))",
              border: "1.5px solid rgba(196,122,255,0.4)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#C47AFF",
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                🤝 합석 모드
              </div>
              <div style={{ fontSize: 11, color: "rgba(220,200,255,0.7)" }}>
                <strong style={{ color: "#C47AFF" }}>
                  {mergingSession.seat_label}
                </strong>
                을 어느 자리에 합칠까요?
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
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              취소
            </button>
          </Motion.div>
        )}
      </AnimatePresence>

      {!isEditMode &&
        !movingSession &&
        !mergingSession &&
        seatRows.length > 0 && (
          <button
            onClick={handleStartEdit}
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(212,165,55,0.06)",
              border: "1px dashed rgba(212,165,55,0.3)",
              borderRadius: 10,
              marginBottom: 12,
              color: "rgba(212,165,55,0.85)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Edit3 size={12} /> 좌석 배치 편집
          </button>
        )}

      {/* 🆕 로딩 상태 처리 */}
      {seatRowsLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
          }}
        >
          <Motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            style={{
              display: "inline-block",
              color: "rgba(212,165,55,0.4)",
              marginBottom: 10,
            }}
          >
            <Loader2 size={28} />
          </Motion.div>
          <div>좌석을 불러오는 중...</div>
        </div>
      ) : seatRows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
          }}
        >
          좌석이 설정되지 않았어요
        </div>
      ) : (
        seatRows.map((row, idx) => (
          <FloorPlan
            key={row.id}
            row={row}
            rowDirection={idx === 0 ? "left-open" : "right-open"}
            sessionMap={sessionMap}
            sessionTotals={sessionTotals}
            isEditMode={isEditMode}
            movingSession={movingSession}
            mergingSession={mergingSession}
            onSeatClick={handleSeatClick}
            onLayoutChange={handleLayoutChange}
          />
        ))
      )}

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
            onCancelOrder={handleCancelOrder}
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

      <AnimatePresence>
        {pendingMove && (
          <MoveConfirmModal
            fromSeat={pendingMove.fromSeat}
            toSeat={pendingMove.toSeat}
            sessionTotal={sessionTotals.get(pendingMove.sessionId) || 0}
            orderCount={
              (sessionOrdersMap.get(pendingMove.sessionId) || []).length
            }
            onConfirm={handleConfirmMove}
            onCancel={() => setPendingMove(null)}
          />
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {manualOrderSession && (
          <ManualOrderModal
            session={manualOrderSession}
            categories={categories}
            menus={menus}
            optionsByMenu={optionsByMenu}
            storeId={storeId}
            onClose={() => setManualOrderSession(null)}
            onSuccess={handleManualOrderSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBulkEmpty && (
          <BulkEmptyConfirmModal
            emptySessions={emptySessions}
            onConfirm={handleConfirmBulkEmpty}
            onCancel={() => setConfirmBulkEmpty(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed",
              top: 20,
              left: "50%",
              transform: "translateX(-50%)",
              background:
                "linear-gradient(135deg, rgba(106,176,106,0.95), rgba(60,120,60,0.95))",
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
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
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
          border: border ? `1px solid ${border}` : "none",
        }}
      />
      <span>{label}</span>
    </div>
  );
}
