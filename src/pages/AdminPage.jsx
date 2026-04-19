import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Clock, Coffee, MessageCircle, Moon, Wine, Shield, Loader2, WifiOff, RefreshCw } from "lucide-react";
import { useSOSAdmin } from "../hooks/useSOSSignals";

const TYPE_MAP = {
  join_chat: { label: "대화에 끼고 싶어요", icon: <MessageCircle size={18} />, color: "#D4A537" },
  menu_recommend: { label: "메뉴 추천 필요", icon: <Wine size={18} />, color: "#C4956A" },
  seat_uncomfortable: { label: "자리가 불편해요", icon: <Coffee size={18} />, color: "#A08060" },
  want_quiet: { label: "조용히 쉬고 싶어요", icon: <Moon size={18} />, color: "#7A6B5D" },
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9, transition: { duration: 0.35 } }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        background: isPending ? "rgba(212,165,55,0.04)" : "rgba(255,255,255,0.02)",
        backdropFilter: "blur(16px)",
        border: "1px solid " + (isPending ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.06)"),
        borderRadius: 18, padding: "18px 20px", marginBottom: 12,
        transition: "border-color 0.3s, background 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#F5E6C8" }}>📍 {signal.seat_label}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
            padding: "3px 8px", borderRadius: 6,
            background: stateInfo.bg, color: stateInfo.color,
          }}>{stateInfo.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          <Clock size={12} />{elapsed}
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 12,
        background: "rgba(255,255,255,0.03)", marginBottom: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: typeInfo.color + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: typeInfo.color,
        }}>{typeInfo.icon}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{typeInfo.label}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{formatTime(signal.created_at)}에 접수</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {isPending && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onAccept(signal.id)}
            style={{
              flex: 1, padding: "12px", borderRadius: 12,
              background: "rgba(212,165,55,0.1)", border: "1px solid rgba(212,165,55,0.2)",
              color: "#D4A537", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            <Bell size={15} />확인
          </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onResolve(signal.id)}
          style={{
            flex: 1, padding: "12px", borderRadius: 12,
            background: isPending ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #4A9A4A, #3A7A3A)",
            border: isPending ? "1px solid rgba(255,255,255,0.08)" : "none",
            color: isPending ? "rgba(255,255,255,0.4)" : "#fff",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
          <Check size={15} />처리 완료
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function AdminPage() {
  const { signals, loading, error, acceptSignal, resolveSignal, refetch } = useSOSAdmin();
  const [prevCount, setPrevCount] = useState(0);
  const [flashHeader, setFlashHeader] = useState(false);
  const pendingCount = signals.filter((s) => s.state === "pending").length;

  useEffect(() => {
    if (signals.length > prevCount && prevCount > 0) {
      setFlashHeader(true);
      setTimeout(() => setFlashHeader(false), 1500);
    }
    setPrevCount(signals.length);
  }, [signals.length]);

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto", minHeight: "100vh",
      background: "#0D0B08", color: "#F5E6C8",
      fontFamily: "'Pretendard', -apple-system, sans-seriff",
    }}>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');" +
        "* { box-sizing: border-box; margin: 0; padding: 0; }" +
        "body { background: #0D0B08; -webkit-font-smoothing: antialiased; }"
      }</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,165,55,0.06) 0%, transparent 70%)",
          top: -100, right: -80, filter: "blur(50px)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "20px" }}>
        <motion.div
          animate={flashHeader ? { boxShadow: ["0 0 0 0 rgba(212,165,55,0)", "0 0 30px 10px rgba(212,165,55,0.15)", "0 0 0 0 rgba(212,165,55,0)"] } : {}}
          transition={{ duration: 1.2 }}
          style={{
            padding: "20px", borderRadius: 20, marginBottom: 24,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Shield size={16} style={{ color: "#D4A537" }} />
                <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.6)", textTransform: "uppercase" }}>HOST DASHBOARD</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 300, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif" }}>
                SOS 시그널 관리
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.9, rotate: 180 }} onClick={refetch}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(255,255,255,0.4)",
              }}>
              <RefreshCw size={16} />
            </motion.button>
          </div>

          <div style={{
            display: "flex", gap: 16, marginTop: 18,
            padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <motion.div key={pendingCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                style={{ fontSize: 28, fontWeight: 300, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>
                {pendingCount}
              </motion.div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>대기 중</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 300, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Serif KR', serif" }}>
                {signals.length}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>전체 활성</div>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", marginBottom: 16,
              background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.15)",
              borderRadius: 12, color: "rgba(220,130,130,0.8)", fontSize: 13,
            }}>
            <WifiOff size={16} />연결 오류
          </motion.div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", color: "rgba(212,165,55,0.4)" }}>
              <Loader2 size={32} />
            </motion.div>
            <div style={{ marginTop: 14, fontSize: 14, color: "rgba(255,255,255,0.25)" }}>시그널을 불러오는 중...</div>
          </div>
        )}

        {!loading && (
          <AnimatePresence>
            {signals.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>🍸</div>
                <div style={{ fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,0.35)", fontFamily: "'Noto Serif KR', serif", marginBottom: 6 }}>
                  모든 시그널이 처리되었어요
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
                  새로운 SOS가 들어오면 자동으로 여기에 표시됩니다
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28 }}>
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(212,165,55,0.4)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>실시간 대기 중</span>
                </div>
              </motion.div>
            ) : (
              signals.map((signal) => (
                <SOSCard key={signal.id} signal={signal} onAccept={acceptSignal} onResolve={resolveSignal} />
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}