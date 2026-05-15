import { useState, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  Clock,
  Coffee,
  MessageCircle,
  Moon,
  Wine,
  Shield,
  Loader2,
  WifiOff,
  RefreshCw,
  Armchair,
  AlertTriangle,
  X,
  ShoppingBag,
  Trash2,
  Volume2,
  VolumeX,
  ChevronRight,
} from "lucide-react";
import { useSOSAdmin } from "@/features/sos/hooks/useSOSSignals";
import { useSessionsAdmin } from "@/features/sessions/hooks/useSessionsAdmin";
import { useOrdersAdmin } from "@/features/orders/hooks/useOrdersAdmin";
import { useMenus } from "@/features/menus/hooks/useMenus";
import { useMenusAdmin } from "@/features/menus/hooks/useMenusAdmin";
import { useMenuOptions } from "@/features/menus/hooks/useMenuOptions";
import { useSeatRows } from "@/features/seats/hooks/useSeatRows";
import { useSeatRowsAdmin } from "@/features/seats/hooks/useSeatRowsAdmin";
import { useSalesStats } from "@/features/sales/hooks/useSalesStats";
import { useStoreId, useStore } from "@/shared/store/StoreContext";
import SeatMap from "@/features/seats/components/SeatMap";
import MenuAdminPanel from "@/features/menus/components/MenuAdminPanel";
import SeatRowsAdminPanel from "@/features/seats/components/SeatRowsAdminPanel";
import SalesStatsPanel from "@/features/sales/components/SalesStatsPanel";
import MonthlyHistoryPanel from "@/features/sales/components/MonthlyHistoryPanel";
import InventoryAdminPanel from "@/features/inventory/components/InventoryAdminPanel";
import {
  enableSound,
  disableSound,
  isSoundEnabled,
  playOrderNotification,
  playSOSNotification,
} from "@/shared/lib/sounds";

const TYPE_MAP = {
  join_chat: {
    label: "대화에 끼고 싶어요",
    icon: <MessageCircle size={18} />,
    color: "#D4A537",
  },
  menu_recommend: {
    label: "메뉴 추천 필요",
    icon: <Wine size={18} />,
    color: "#C4956A",
  },
  seat_uncomfortable: {
    label: "자리가 불편해요",
    icon: <Coffee size={18} />,
    color: "#A08060",
  },
  want_quiet: {
    label: "조용히 쉬고 싶어요",
    icon: <Moon size={18} />,
    color: "#7A6B5D",
  },
};

const STATE_BADGE = {
  pending: { label: "대기 중", bg: "rgba(212,165,55,0.15)", color: "#D4A537" },
  accepted: { label: "확인함", bg: "rgba(100,180,100,0.12)", color: "#6AB06A" },
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return diff + "초 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  return Math.floor(diff / 3600) + "시간 전";
}

// ───────── SOS 카드 ─────────
function SOSCard({ signal, onAccept, onResolve }) {
  const typeInfo = TYPE_MAP[signal.request_type] || TYPE_MAP.join_chat;
  const stateInfo = STATE_BADGE[signal.state] || STATE_BADGE.pending;
  const isPending = signal.state === "pending";
  const [elapsed, setElapsed] = useState(timeAgo(signal.created_at));

  useEffect(() => {
    const iv = setInterval(() => setElapsed(timeAgo(signal.created_at)), 10000);
    return () => clearInterval(iv);
  }, [signal.created_at]);

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9, transition: { duration: 0.35 } }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        background: isPending
          ? "rgba(212,165,55,0.04)"
          : "rgba(255,255,255,0.02)",
        backdropFilter: "blur(16px)",
        border:
          "1px solid " +
          (isPending ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.06)"),
        borderRadius: 18,
        padding: "18px 20px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#F5E6C8" }}>
            📍 {signal.seat_label}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              padding: "3px 8px",
              borderRadius: 6,
              background: stateInfo.bg,
              color: stateInfo.color,
            }}
          >
            {stateInfo.label}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          <Clock size={12} />
          {elapsed}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            background: typeInfo.color + "15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: typeInfo.color,
          }}
        >
          {typeInfo.icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>
            {typeInfo.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginTop: 2,
            }}
          >
            {formatTime(signal.created_at)}에 접수
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {isPending && (
          <Motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAccept(signal.id)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              background: "rgba(212,165,55,0.1)",
              border: "1px solid rgba(212,165,55,0.2)",
              color: "#D4A537",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Bell size={15} />
            확인
          </Motion.button>
        )}
        <Motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onResolve(signal.id)}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 12,
            background: isPending
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, #4A9A4A, #3A7A3A)",
            border: isPending ? "1px solid rgba(255,255,255,0.08)" : "none",
            color: isPending ? "rgba(255,255,255,0.4)" : "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Check size={15} />
          처리 완료
        </Motion.button>
      </div>
    </Motion.div>
  );
}

// ───────── 주문 카드 (제공됨도 취소 가능) ─────────
function OrderCard({ order, onServed, onCancel }) {
  const [elapsed, setElapsed] = useState(timeAgo(order.created_at));
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setElapsed(timeAgo(order.created_at)), 10000);
    return () => clearInterval(iv);
  }, [order.created_at]);

  const isPending = order.status === "pending";
  const isServed = order.status === "served";

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 200, transition: { duration: 0.3 } }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      style={{
        background: isPending
          ? "rgba(212,165,55,0.06)"
          : "rgba(255,255,255,0.02)",
        backdropFilter: "blur(16px)",
        border:
          "1px solid " +
          (isPending ? "rgba(212,165,55,0.25)" : "rgba(255,255,255,0.06)"),
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isPending
                ? "rgba(212,165,55,0.15)"
                : "rgba(255,255,255,0.04)",
              border:
                "1.5px solid " +
                (isPending ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.06)"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {order.menu_icon || "🥃"}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#F5E6C8" }}>
              {order.menu_name}
              {order.option_name && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    marginLeft: 6,
                    background: "rgba(212,165,55,0.15)",
                    color: "#D4A537",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  {order.option_name}
                </span>
              )}
              {order.is_manual && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    marginLeft: 6,
                    background: "rgba(196,122,255,0.15)",
                    color: "#C47AFF",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  사장님
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                marginTop: 3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: "#D4A537", fontWeight: 500 }}>
                📍 {order.seat_label}
              </span>
              <span>·</span>
              <span>{order.session?.nickname || "손님"}</span>
            </div>
            {order.memo && (
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,200,130,0.85)",
                  marginTop: 4,
                  padding: "2px 6px",
                  background: "rgba(226,150,75,0.08)",
                  borderRadius: 4,
                  display: "inline-block",
                }}
              >
                📝 {order.memo}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 16,
              color: "#D4A537",
              fontWeight: 500,
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            {order.price.toLocaleString()}
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                marginLeft: 2,
              }}
            >
              원
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              marginTop: 2,
            }}
          >
            {elapsed}
          </div>
        </div>
      </div>

      {/* 대기 중인 주문 - 기존 버튼들 */}
      {isPending && !confirmCancel && (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setConfirmCancel(true)}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Trash2 size={12} />
            취소
          </button>
          <Motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onServed(order.id)}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: 9,
              background: "linear-gradient(135deg, #4A9A4A, #3A7A3A)",
              border: "none",
              color: "#fff",
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
            <Check size={13} />
            제공 완료
          </Motion.button>
        </div>
      )}

      {/* 취소 확인 - 대기 중인 주문 */}
      {isPending && confirmCancel && (
        <Motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "10px 12px",
            background: "rgba(226,75,74,0.08)",
            border: "1px solid rgba(226,75,74,0.3)",
            borderRadius: 9,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,180,180,0.9)",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            이 주문을 취소(삭제)하시겠어요?
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setConfirmCancel(false)}
              style={{
                flex: 1,
                padding: "7px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              아니요
            </button>
            <button
              onClick={() => onCancel(order.id)}
              style={{
                flex: 1.5,
                padding: "7px",
                borderRadius: 7,
                background: "linear-gradient(135deg, #E24B4A, #B03838)",
                border: "none",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              네, 취소
            </button>
          </div>
        </Motion.div>
      )}

      {/* 🆕 제공된 주문 - 취소 버튼 추가 */}
      {isServed && !confirmCancel && (
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "rgba(106,176,106,0.08)",
              borderRadius: 7,
              fontSize: 10,
              color: "rgba(106,176,106,0.9)",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Check size={11} /> 제공 완료됨
          </div>
          <button
            onClick={() => setConfirmCancel(true)}
            style={{
              padding: "8px 12px",
              borderRadius: 7,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,180,180,0.55)",
              fontSize: 10,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <Trash2 size={11} />
            주문 취소
          </button>
        </div>
      )}

      {/* 🆕 취소 확인 - 제공된 주문 (더 강한 경고) */}
      {isServed && confirmCancel && (
        <Motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "10px 12px",
            background: "rgba(226,75,74,0.12)",
            border: "1px solid rgba(226,75,74,0.4)",
            borderRadius: 9,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "rgba(255,180,180,0.95)",
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={12} />
            이미 제공된 주문입니다
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,180,180,0.75)",
              marginBottom: 8,
              lineHeight: 1.5,
            }}
          >
            잘못 들어온 주문이거나 환불이 필요한 경우에만
            <br />
            취소해주세요. 재고 등도 함께 확인이 필요해요.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setConfirmCancel(false)}
              style={{
                flex: 1,
                padding: "7px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              아니요
            </button>
            <button
              onClick={() => onCancel(order.id)}
              style={{
                flex: 1.5,
                padding: "7px",
                borderRadius: 7,
                background: "linear-gradient(135deg, #E24B4A, #B03838)",
                border: "none",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              네, 취소
            </button>
          </div>
        </Motion.div>
      )}
    </Motion.div>
  );
}

// ───────── 메인 어드민 페이지 ─────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("sos");
  const [managePanel, setManagePanel] = useState(null);
  const storeId = useStoreId();
  const { storeSlug } = useStore();

  const {
    signals,
    loading: sosLoading,
    acceptSignal,
    resolveSignal,
    refetch: refetchSOS,
  } = useSOSAdmin(storeId);
  const {
    sessions,
    todayRevenue,
    loading: sessionsLoading,
    closeSession,
    settleSession,
    moveSession,
    mergeSession,
    refetch: refetchSessions,
  } = useSessionsAdmin(storeId);
  const {
    orders,
    pendingCount: pendingOrdersCount,
    loading: ordersLoading,
    markServed,
    cancelOrder,
    refetch: refetchOrders,
  } = useOrdersAdmin(storeId);
  const {
    categories: menuCategories,
    menus: menuItems,
    loading: menusLoading,
    refetch: refetchMenus,
  } = useMenus(storeId);
  const menuAdmin = useMenusAdmin(storeId, refetchMenus);
  const menuOptions = useMenuOptions(storeId);

  const {
    rows: seatRows,
    loading: seatRowsLoading,
    refetch: refetchSeatRows,
  } = useSeatRows(storeId);
  const seatRowsAdmin = useSeatRowsAdmin(storeId, refetchSeatRows);

  const { stats: salesStats, loading: salesStatsLoading } =
    useSalesStats(storeId);

  const prevSOSCountRef = useRef(0);
  const prevOrdersCountRef = useRef(0);
  const [flashHeader, setFlashHeader] = useState(false);
  const [flashType, setFlashType] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const pendingSOSCount = signals.filter((s) => s.state === "pending").length;

  const toggleSound = () => {
    if (soundOn) {
      disableSound();
      setSoundOn(false);
    } else {
      enableSound();
      setSoundOn(true);
    }
  };

  useEffect(() => {
    const prevSOSCount = prevSOSCountRef.current;
    prevSOSCountRef.current = signals.length;
    if (signals.length <= prevSOSCount || prevSOSCount <= 0) return;

    let hideTimer;
    const flashTimer = setTimeout(() => {
      setFlashHeader(true);
      setFlashType("sos");
      playSOSNotification();
      hideTimer = setTimeout(() => setFlashHeader(false), 1500);
    }, 0);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(hideTimer);
    };
  }, [signals.length]);

  useEffect(() => {
    const prevOrdersCount = prevOrdersCountRef.current;
    prevOrdersCountRef.current = orders.length;
    if (orders.length <= prevOrdersCount || prevOrdersCount <= 0) return;

    let hideTimer;
    const flashTimer = setTimeout(() => {
      setFlashHeader(true);
      setFlashType("order");
      playOrderNotification();
      hideTimer = setTimeout(() => setFlashHeader(false), 1500);
    }, 0);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(hideTimer);
    };
  }, [orders.length]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        minHeight: "100vh",
        background: "#0D0B08",
        color: "#F5E6C8",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style>
        {"* { box-sizing: border-box; margin: 0; padding: 0; }" +
          "body { background: #0D0B08; -webkit-font-smoothing: antialiased; }"}
      </style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(212,165,55,0.06) 0%, transparent 70%)",
            top: -100,
            right: -80,
            filter: "blur(50px)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "20px" }}>
        <Motion.div
          animate={
            flashHeader
              ? {
                  boxShadow:
                    flashType === "order"
                      ? [
                          "0 0 0 0 rgba(212,165,55,0)",
                          "0 0 40px 12px rgba(212,165,55,0.25)",
                          "0 0 0 0 rgba(212,165,55,0)",
                        ]
                      : [
                          "0 0 0 0 rgba(226,75,74,0)",
                          "0 0 40px 12px rgba(226,75,74,0.2)",
                          "0 0 0 0 rgba(226,75,74,0)",
                        ],
                }
              : {}
          }
          transition={{ duration: 1.2 }}
          style={{
            padding: "20px",
            borderRadius: 20,
            marginBottom: 16,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Shield size={16} style={{ color: "#D4A537" }} />
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "rgba(212,165,55,0.6)",
                    textTransform: "uppercase",
                  }}
                >
                  HOST DASHBOARD
                </span>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 300,
                  color: "#F5E6C8",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                오늘, 혼술 관리자
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleSound}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: soundOn
                    ? "rgba(212,165,55,0.12)"
                    : "rgba(255,255,255,0.05)",
                  border:
                    "1px solid " +
                    (soundOn
                      ? "rgba(212,165,55,0.3)"
                      : "rgba(255,255,255,0.08)"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: soundOn ? "#D4A537" : "rgba(255,255,255,0.4)",
                  transition: "all 0.2s",
                }}
                title={soundOn ? "소리 알림 끄기" : "소리 알림 켜기"}
              >
                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </Motion.button>
              <Motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={() => {
                  refetchSOS();
                  refetchSessions();
                  refetchOrders();
                }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <RefreshCw size={16} />
              </Motion.button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              padding: "14px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ flex: 1, textAlign: "center" }}>
              <Motion.div
                key={pendingSOSCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: 26,
                  fontWeight: 300,
                  color: "#D4A537",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                {pendingSOSCount}
              </Motion.div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 2,
                }}
              >
                대기 SOS
              </div>
            </div>
            <div
              style={{
                width: 1,
                background: "rgba(255,255,255,0.06)",
                alignSelf: "stretch",
              }}
            />
            <div style={{ flex: 1, textAlign: "center" }}>
              <Motion.div
                key={pendingOrdersCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: 26,
                  fontWeight: 300,
                  color: "#E24B4A",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                {pendingOrdersCount}
              </Motion.div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 2,
                }}
              >
                대기 주문
              </div>
            </div>
            <div
              style={{
                width: 1,
                background: "rgba(255,255,255,0.06)",
                alignSelf: "stretch",
              }}
            />
            <div style={{ flex: 1, textAlign: "center" }}>
              <Motion.div
                key={sessions.length}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: 26,
                  fontWeight: 300,
                  color: "#6AB06A",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                {sessions.length}
              </Motion.div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 2,
                }}
              >
                활성 좌석
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              padding: "12px 14px",
              background:
                "linear-gradient(135deg, rgba(212,165,55,0.1), rgba(180,120,30,0.04))",
              border: "1px solid rgba(212,165,55,0.2)",
              borderRadius: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "rgba(212,165,55,0.7)",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                오늘 매출
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 2,
                }}
              >
                정산 완료 건 합산
              </div>
            </div>
            <Motion.div
              key={todayRevenue}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                fontSize: 22,
                color: "#D4A537",
                fontWeight: 500,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {todayRevenue.toLocaleString()}
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  marginLeft: 3,
                }}
              >
                원
              </span>
            </Motion.div>
          </div>
        </Motion.div>

        {!soundOn && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={toggleSound}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              marginBottom: 14,
              background:
                "linear-gradient(135deg, rgba(212,165,55,0.08), rgba(180,120,30,0.04))",
              border: "1px solid rgba(212,165,55,0.2)",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <VolumeX size={16} style={{ color: "#D4A537", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500 }}>
                소리 알림이 꺼져 있어요
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
                여기를 탭하면 새 주문/SOS가 올 때 소리로 알려드려요
              </div>
            </div>
            <div
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                background: "rgba(212,165,55,0.2)",
                color: "#D4A537",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              켜기
            </div>
          </Motion.div>
        )}

        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            padding: 4,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <button
            onClick={() => setActiveTab("sos")}
            style={{
              flex: 1,
              padding: "10px 6px",
              borderRadius: 9,
              border: "none",
              background:
                activeTab === "sos" ? "rgba(212,165,55,0.15)" : "transparent",
              color: activeTab === "sos" ? "#D4A537" : "rgba(255,255,255,0.5)",
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
            <Bell size={13} /> SOS
            {pendingSOSCount > 0 && (
              <span
                style={{
                  padding: "1px 5px",
                  borderRadius: 5,
                  background: "#D4A537",
                  color: "#0D0B08",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {pendingSOSCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            style={{
              flex: 1,
              padding: "10px 6px",
              borderRadius: 9,
              border: "none",
              background:
                activeTab === "orders" ? "rgba(226,75,74,0.12)" : "transparent",
              color:
                activeTab === "orders" ? "#E87A79" : "rgba(255,255,255,0.5)",
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
            <ShoppingBag size={13} /> 주문
            {pendingOrdersCount > 0 && (
              <Motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  padding: "1px 5px",
                  borderRadius: 5,
                  background: "#E24B4A",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "inline-block",
                }}
              >
                {pendingOrdersCount}
              </Motion.span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("seats")}
            style={{
              flex: 1,
              padding: "10px 6px",
              borderRadius: 9,
              border: "none",
              background:
                activeTab === "seats"
                  ? "rgba(106,176,106,0.12)"
                  : "transparent",
              color:
                activeTab === "seats" ? "#6AB06A" : "rgba(255,255,255,0.5)",
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
            <Armchair size={13} /> 좌석
            {sessions.length > 0 && (
              <span
                style={{
                  padding: "1px 5px",
                  borderRadius: 5,
                  background: "#6AB06A",
                  color: "#0D0B08",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {sessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("manage");
              setManagePanel(null);
            }}
            style={{
              flex: 1,
              padding: "10px 6px",
              borderRadius: 9,
              border: "none",
              background:
                activeTab === "manage"
                  ? "rgba(212,165,55,0.15)"
                  : "transparent",
              color:
                activeTab === "manage" ? "#D4A537" : "rgba(255,255,255,0.5)",
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
            ⚙️ 관리
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "sos" && (
            <Motion.div
              key="sos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              {sosLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      display: "inline-block",
                      color: "rgba(212,165,55,0.4)",
                    }}
                  >
                    <Loader2 size={32} />
                  </Motion.div>
                </div>
              ) : signals.length === 0 ? (
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "60px 20px" }}
                >
                  <div style={{ fontSize: 44, marginBottom: 16 }}>🍸</div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 300,
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "'Noto Serif KR', serif",
                      marginBottom: 6,
                    }}
                  >
                    모든 시그널이 처리되었어요
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                    새로운 SOS가 들어오면 자동으로 표시됩니다
                  </div>
                </Motion.div>
              ) : (
                <AnimatePresence>
                  {signals.map((signal) => (
                    <SOSCard
                      key={signal.id}
                      signal={signal}
                      onAccept={acceptSignal}
                      onResolve={resolveSignal}
                    />
                  ))}
                </AnimatePresence>
              )}
            </Motion.div>
          )}

          {activeTab === "orders" && (
            <Motion.div
              key="orders"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              {ordersLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      display: "inline-block",
                      color: "rgba(226,75,74,0.4)",
                    }}
                  >
                    <Loader2 size={32} />
                  </Motion.div>
                </div>
              ) : orders.length === 0 ? (
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "60px 20px" }}
                >
                  <div style={{ fontSize: 44, marginBottom: 16 }}>🍸</div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 300,
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "'Noto Serif KR', serif",
                      marginBottom: 6,
                    }}
                  >
                    아직 주문이 없어요
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                    새 주문이 들어오면 자동으로 알려드릴게요
                  </div>
                </Motion.div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      marginBottom: 10,
                      padding: "0 4px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>총 {orders.length}건</span>
                    <span style={{ color: "rgba(226,75,74,0.8)" }}>
                      {pendingOrdersCount > 0
                        ? `대기 ${pendingOrdersCount}건`
                        : "모두 제공됨"}
                    </span>
                  </div>
                  <AnimatePresence>
                    {orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onServed={markServed}
                        onCancel={cancelOrder}
                      />
                    ))}
                  </AnimatePresence>
                </>
              )}
            </Motion.div>
          )}

          {activeTab === "seats" && (
            <Motion.div
              key="seats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {sessionsLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      display: "inline-block",
                      color: "rgba(106,176,106,0.4)",
                    }}
                  >
                    <Loader2 size={32} />
                  </Motion.div>
                </div>
              ) : (
                <SeatMap
                  sessions={sessions}
                  orders={orders}
                  onClose={closeSession}
                  onSettle={settleSession}
                  onMove={moveSession}
                  onMerge={mergeSession}
                  categories={menuCategories}
                  menus={menuItems}
                  optionsByMenu={menuOptions.optionsByMenu}
                  onOrdersRefetch={refetchOrders}
                />
              )}
            </Motion.div>
          )}

          {activeTab === "manage" && (
            <Motion.div
              key="manage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {!managePanel && (
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      color: "#F5E6C8",
                      fontFamily: "'Noto Serif KR', serif",
                      fontWeight: 500,
                      marginBottom: 4,
                      padding: "0 4px",
                    }}
                  >
                    ⚙️ 매장 관리
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: 16,
                      padding: "0 4px",
                    }}
                  >
                    설정하고 싶은 항목을 선택하세요
                  </div>

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Motion.button
                      onClick={() => setManagePanel("stats")}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: 16,
                        background:
                          "linear-gradient(135deg, rgba(212,165,55,0.12), rgba(180,120,30,0.04))",
                        border: "1px solid rgba(212,165,55,0.3)",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 11,
                          background: "rgba(212,165,55,0.15)",
                          border: "1px solid rgba(212,165,55,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        📊
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#F5E6C8",
                            fontWeight: 500,
                            marginBottom: 3,
                          }}
                        >
                          매출 통계
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(212,165,55,0.85)",
                          }}
                        >
                          오늘 {salesStats.todayRevenue.toLocaleString()}원
                          {salesStats.yesterdayRevenue > 0 && (
                            <span
                              style={{
                                marginLeft: 6,
                                color:
                                  salesStats.revenueChangePct >= 0
                                    ? "#6AB06A"
                                    : "rgba(255,150,150,0.85)",
                              }}
                            >
                              {salesStats.revenueChangePct >= 0 ? "▲" : "▼"}
                              {Math.abs(salesStats.revenueChangePct)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                    </Motion.button>

                    <Motion.button
                      onClick={() => setManagePanel("menus")}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: 16,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 11,
                          background: "rgba(212,165,55,0.1)",
                          border: "1px solid rgba(212,165,55,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        📋
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#F5E6C8",
                            fontWeight: 500,
                            marginBottom: 3,
                          }}
                        >
                          메뉴 관리
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {menuItems.length}개 메뉴 · {menuCategories.length}개
                          카테고리
                        </div>
                      </div>
                      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                    </Motion.button>

                    <Motion.button
                      onClick={() => setManagePanel("inventory")}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: 16,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 11,
                          background: "rgba(212,165,55,0.1)",
                          border: "1px solid rgba(212,165,55,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        📦
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#F5E6C8",
                            fontWeight: 500,
                            marginBottom: 3,
                          }}
                        >
                          재고 관리
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          술 · 리큐르 · 믹서 · 시럽 · 자동 차감 중
                        </div>
                      </div>
                      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                    </Motion.button>

                    <Motion.button
                      onClick={() => setManagePanel("seatrows")}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: 16,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 11,
                          background: "rgba(196,122,255,0.1)",
                          border: "1px solid rgba(196,122,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        📐
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#F5E6C8",
                            fontWeight: 500,
                            marginBottom: 3,
                          }}
                        >
                          좌석 설정
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {seatRows.length}개 행 · 총{" "}
                          {seatRows.reduce((sum, r) => sum + r.seat_count, 0)}석
                        </div>
                      </div>
                      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                    </Motion.button>

                    <Motion.a
                      href={`/${storeSlug || "honsul-main"}/qr`}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: 16,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 11,
                          background: "rgba(106,176,106,0.1)",
                          border: "1px solid rgba(106,176,106,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        🏷️
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#F5E6C8",
                            fontWeight: 500,
                            marginBottom: 3,
                          }}
                        >
                          QR 출력
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          좌석 QR 인쇄용 페이지 (새 창)
                        </div>
                      </div>
                      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                    </Motion.a>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      background: "rgba(212,165,55,0.04)",
                      border: "1px solid rgba(212,165,55,0.15)",
                      borderRadius: 10,
                      fontSize: 11,
                      color: "rgba(212,165,55,0.85)",
                      lineHeight: 1.6,
                    }}
                  >
                    💡 <strong>안내</strong>
                    <br />
                    매출 통계, 사장님 가입 등 더 많은 기능이 곧 추가될
                    예정이에요
                  </div>
                </div>
              )}

              {managePanel === "stats" && (
                <div>
                  <button
                    onClick={() => setManagePanel(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      marginBottom: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← 관리 메뉴로
                  </button>
                  <SalesStatsPanel
                    stats={salesStats}
                    loading={salesStatsLoading}
                    onShowHistory={() => setManagePanel("history")}
                  />
                </div>
              )}

              {managePanel === "history" && (
                <div>
                  <button
                    onClick={() => setManagePanel("stats")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      marginBottom: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← 매출 통계로
                  </button>
                  <MonthlyHistoryPanel
                    history={salesStats.monthlyHistory || []}
                  />
                </div>
              )}

              {managePanel === "menus" && (
                <div>
                  <button
                    onClick={() => setManagePanel(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      marginBottom: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← 관리 메뉴로
                  </button>
                  <MenuAdminPanel
                    storeId={storeId}
                    categories={menuCategories}
                    menus={menuItems}
                    loading={menusLoading}
                    optionsByMenu={menuOptions.optionsByMenu}
                    createMenu={menuAdmin.createMenu}
                    updateMenu={menuAdmin.updateMenu}
                    deleteMenu={menuAdmin.deleteMenu}
                    createCategory={menuAdmin.createCategory}
                    updateCategory={menuAdmin.updateCategory}
                    deleteCategory={menuAdmin.deleteCategory}
                    createOption={menuOptions.createOption}
                    updateOption={menuOptions.updateOption}
                    deleteOption={menuOptions.deleteOption}
                  />
                </div>
              )}

              {managePanel === "inventory" && (
                <div>
                  <button
                    onClick={() => setManagePanel(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      marginBottom: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← 관리 메뉴로
                  </button>
                  <InventoryAdminPanel storeId={storeId} />
                </div>
              )}

              {managePanel === "seatrows" && (
                <div>
                  <button
                    onClick={() => setManagePanel(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      marginBottom: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← 관리 메뉴로
                  </button>
                  <SeatRowsAdminPanel
                    rows={seatRows}
                    loading={seatRowsLoading}
                    sessions={sessions}
                    createRow={seatRowsAdmin.createRow}
                    updateRow={seatRowsAdmin.updateRow}
                    deleteRow={seatRowsAdmin.deleteRow}
                  />
                </div>
              )}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
