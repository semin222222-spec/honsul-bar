import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Clock, Coffee, MessageCircle, Moon, Wine, Shield,
  Loader2, WifiOff, RefreshCw, Armchair, AlertTriangle, X,
} from "lucide-react";
import { useSOSAdmin } from "../hooks/useSOSSignals";
import { useSessionsAdmin } from "../hooks/useSessionsAdmin";

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

function sessionDuration(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return diff + "분 경과";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}시간 ${m}분 경과`;
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

// ───────── 세션(좌석) 카드 ─────────
function SessionCard({ session, onClose }) {
  const [elapsed, setElapsed] = useState(sessionDuration(session.opened_at));
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setElapsed(sessionDuration(session.opened_at)), 60000);
    return () => clearInterval(iv);
  }, [session.opened_at]);

  // 마지막 활동이 30분 이상 없으면 경고
  const lastActive = session.last_active_at ? new Date(session.last_active_at) : null;
  const inactiveMin = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 60000) : 0;
  const isInactive = inactiveMin >= 30;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 200, transition: { duration: 0.3 } }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      style={{
        background: isInactive ? "rgba(226,150,75,0.04)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        border: "1px solid " + (isInactive ? "rgba(226,150,75,0.25)" : "rgba(255,255,255,0.06)"),
        borderRadius: 16, padding: "16px 18px", marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(212,165,55,0.1)",
            border: "1.5px solid rgba(212,165,55,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            {session.avatar || "🥃"}
          </div>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 600, color: "#F5E6C8",
              fontFamily: "'Noto Serif KR', serif",
            }}>
              📍 {session.seat_label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              {session.nickname || "손님"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            {formatTime(session.opened_at)} 입장
          </div>
          <div style={{ fontSize: 11, color: "rgba(212,165,55,0.7)", marginTop: 2, fontWeight: 500 }}>
            {elapsed}
          </div>
        </div>
      </div>

      {isInactive && (
        <div style={{
          padding: "8px 10px",
          background: "rgba(226,150,75,0.1)",
          border: "1px solid rgba(226,150,75,0.25)",
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 10,
          fontSize: 11,
          color: "rgba(255,200,130,0.9)",
        }}>
          <AlertTriangle size={13} />
          마지막 활동이 {inactiveMin}분 전 — 자리를 뜬 걸 수도 있어요
        </div>
      )}

      {!confirmClose ? (
        <button
          onClick={() => setConfirmClose(true)}
          style={{
            width: "100%", padding: "10px", borderRadius: 10,
            background: isInactive ? "rgba(226,150,75,0.12)" : "rgba(255,255,255,0.03)",
            border: "1px solid " + (isInactive ? "rgba(226,150,75,0.35)" : "rgba(255,255,255,0.08)"),
            color: isInactive ? "rgba(255,200,130,0.9)" : "rgba(255,255,255,0.5)",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <X size={13} /> 자리 비우기 (강제 해제)
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "10px 12px",
            background: "rgba(226,75,74,0.08)",
            border: "1px solid rgba(226,75,74,0.3)",
            borderRadius: 10,
          }}
        >
          <div style={{
            fontSize: 12, color: "rgba(255,180,180,0.95)",
            marginBottom: 8, textAlign: "center", lineHeight: 1.5,
          }}>
            정말 <strong style={{ color: "#fff" }}>{session.seat_label}</strong> 자리를<br />
            비우시겠어요?
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setConfirmClose(false)}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              취소
            </button>
            <button
              onClick={() => onClose(session.id)}
              style={{
                flex: 1.5, padding: "8px", borderRadius: 8,
                background: "linear-gradient(135deg, #E24B4A, #B03838)",
                border: "none",
                color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              비우기 확정
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ───────── 메인 어드민 페이지 ─────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("sos"); // sos | seats

  const { signals, loading: sosLoading, acceptSignal, resolveSignal, refetch: refetchSOS } = useSOSAdmin();
  const { sessions, loading: sessionsLoading, closeSession, refetch: refetchSessions } = useSessionsAdmin();

  const [prevSOSCount, setPrevSOSCount] = useState(0);
  const [flashHeader, setFlashHeader] = useState(false);
  const pendingSOSCount = signals.filter((s) => s.state === "pending").length;

  useEffect(() => {
    if (signals.length > prevSOSCount && prevSOSCount > 0) {
      setFlashHeader(true);
      setTimeout(() => setFlashHeader(false), 1500);
    }
    setPrevSOSCount(signals.length);
  }, [signals.length]);

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto", minHeight: "100vh",
      background: "#0D0B08", color: "#F5E6C8",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
    }}>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700&family=Pretendard:wght@300;400;500;600;700&display=swap');" +
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
        {/* 헤더 */}
        <motion.div
          animate={flashHeader ? { boxShadow: ["0 0 0 0 rgba(212,165,55,0)", "0 0 30px 10px rgba(212,165,55,0.15)", "0 0 0 0 rgba(212,165,55,0)"] } : {}}
          transition={{ duration: 1.2 }}
          style={{
            padding: "20px", borderRadius: 20, marginBottom: 16,
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
                오늘, 혼술 관리자
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={() => { refetchSOS(); refetchSessions(); }}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(255,255,255,0.4)",
              }}
            >
              <RefreshCw size={16} />
            </motion.button>
          </div>

          <div style={{
            display: "flex", gap: 14, marginTop: 18,
            padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <motion.div key={pendingSOSCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                style={{ fontSize: 28, fontWeight: 300, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>
                {pendingSOSCount}
              </motion.div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>대기 SOS</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <motion.div key={sessions.length} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                style={{ fontSize: 28, fontWeight: 300, color: "#6AB06A", fontFamily: "'Noto Serif KR', serif" }}>
                {sessions.length}
              </motion.div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>활성 좌석</div>
            </div>
          </div>
        </motion.div>

        {/* 탭 바 */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 16,
          padding: 4,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.04)",
        }}>
          <button
            onClick={() => setActiveTab("sos")}
            style={{
              flex: 1, padding: "10px", borderRadius: 9, border: "none",
              background: activeTab === "sos" ? "rgba(212,165,55,0.15)" : "transparent",
              color: activeTab === "sos" ? "#D4A537" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Bell size={14} /> SOS
            {pendingSOSCount > 0 && (
              <span style={{
                padding: "1px 6px", borderRadius: 5,
                background: "#D4A537", color: "#0D0B08",
                fontSize: 10, fontWeight: 700,
              }}>{pendingSOSCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("seats")}
            style={{
              flex: 1, padding: "10px", borderRadius: 9, border: "none",
              background: activeTab === "seats" ? "rgba(106,176,106,0.12)" : "transparent",
              color: activeTab === "seats" ? "#6AB06A" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Armchair size={14} /> 좌석
            {sessions.length > 0 && (
              <span style={{
                padding: "1px 6px", borderRadius: 5,
                background: "#6AB06A", color: "#0D0B08",
                fontSize: 10, fontWeight: 700,
              }}>{sessions.length}</span>
            )}
          </button>
        </div>

        {/* 탭 내용 */}
        <AnimatePresence mode="wait">
          {activeTab === "sos" && (
            <motion.div
              key="sos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              {sosLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    style={{ display: "inline-block", color: "rgba(212,165,55,0.4)" }}>
                    <Loader2 size={32} />
                  </motion.div>
                </div>
              ) : signals.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>🍸</div>
                  <div style={{
                    fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,0.35)",
                    fontFamily: "'Noto Serif KR', serif", marginBottom: 6,
                  }}>
                    모든 시그널이 처리되었어요
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                    새로운 SOS가 들어오면 자동으로 표시됩니다
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {signals.map((signal) => (
                    <SOSCard key={signal.id} signal={signal} onAccept={acceptSignal} onResolve={resolveSignal} />
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          )}

          {activeTab === "seats" && (
            <motion.div
              key="seats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {sessionsLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    style={{ display: "inline-block", color: "rgba(106,176,106,0.4)" }}>
                    <Loader2 size={32} />
                  </motion.div>
                </div>
              ) : sessions.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>🪑</div>
                  <div style={{
                    fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,0.35)",
                    fontFamily: "'Noto Serif KR', serif", marginBottom: 6,
                  }}>
                    지금 활성 좌석이 없어요
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                    손님이 입장하면 이곳에 표시됩니다
                  </div>
                </motion.div>
              ) : (
                <>
                  <div style={{
                    fontSize: 11, color: "rgba(255,255,255,0.35)",
                    marginBottom: 10, padding: "0 4px",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <span>현재 {sessions.length}명의 손님</span>
                    <span style={{ color: "rgba(226,150,75,0.7)" }}>⚠ 30분+ 비활성</span>
                  </div>
                  <AnimatePresence>
                    {sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onClose={closeSession}
                      />
                    ))}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
