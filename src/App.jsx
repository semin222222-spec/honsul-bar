import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MessageCircle, Trophy, Radio, Send, Heart,
  HelpCircle, ChevronRight, Check, X, Users,
  HandMetal, Coffee, Wine, Bell, Sparkles,
  MessageSquare, Clock, Star, Smile, Moon
} from "lucide-react";
import TalkWallScreen from "./components/TalkWallScreen";
import SOSModal from "./components/SOSModal";

const INITIAL_USERS = [
  { id: "u1", nickname: "위스키 탐험가", status: "open", avatar: "🥃", seat: "바 3번석", joinedAt: Date.now() - 900000 },
  { id: "u2", nickname: "맥주 초보", status: "hello", avatar: "🍺", seat: "테이블 A", joinedAt: Date.now() - 1800000 },
  { id: "u3", nickname: "와인 러버", status: "alone", avatar: "🍷", seat: "바 1번석", joinedAt: Date.now() - 600000 },
  { id: "u4", nickname: "하이볼 매니아", status: "open", avatar: "🧊", seat: "바 5번석", joinedAt: Date.now() - 2400000 },
  { id: "u5", nickname: "소주 한 잔", status: "hello", avatar: "🍶", seat: "테이블 B", joinedAt: Date.now() - 300000 },
];

const QUESTS = [
  { id: "q1", title: "바에 안착하기", desc: "자리에 앉아 첫 주문을 해보세요", icon: "🪑", xp: 10 },
  { id: "q2", title: "사장님과 인사하기", desc: "바텐더에게 가볍게 인사를 건네보세요", icon: "👋", xp: 15 },
  { id: "q3", title: "옆 사람 술 구경하기", desc: "옆 손님이 마시는 술이 뭔지 살짝 확인!", icon: "👀", xp: 10 },
  { id: "q4", title: "토크 월에 글 남기기", desc: "익명 피드에 첫 글을 올려보세요", icon: "✍️", xp: 20 },
  { id: "q5", title: "공감 보내기", desc: "다른 사람의 글에 하트를 눌러보세요", icon: "💛", xp: 10 },
  { id: "q6", title: "대화 환영 시그널 켜기", desc: "상태를 대화 환영으로 바꿔보세요", icon: "💬", xp: 15 },
  { id: "q7", title: "단골 인증", desc: "모든 퀘스트를 클리어하세요!", icon: "🏆", xp: 30 },
];

const STATUS_MAP = {
  open: { label: "대화 환영", color: "#D4A537", icon: <Smile size={14} /> },
  hello: { label: "인사만", color: "#8B7355", icon: <HandMetal size={14} /> },
  alone: { label: "혼자이고 싶음", color: "#4A4035", icon: <Moon size={14} /> },
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "방금 전";
  if (diff < 60) return diff + "분 전";
  return Math.floor(diff / 60) + "시간 전";
}

function AmbientBG() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", width: "80vw", maxWidth: 340, height: "80vw", maxHeight: 340, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,165,55,0.08) 0%, transparent 70%)",
        top: "-10vw", right: "-8vw", filter: "blur(40px)"
      }} />
      <div style={{
        position: "absolute", width: "65vw", maxWidth: 260, height: "65vw", maxHeight: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,120,40,0.06) 0%, transparent 70%)",
        bottom: "15vh", left: "-10vw", filter: "blur(50px)"
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(212,165,55,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />
    </div>
  );
}

function GlassCard({ children, style, onClick, animate = true, delay = 0 }) {
  const base = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "clamp(12px, 3.5vw, 16px)",
    padding: "clamp(12px, 3.5vw, 16px)",
    ...style,
  };
  if (!animate) return <div style={base} onClick={onClick}>{children}</div>;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={base} onClick={onClick}>{children}</motion.div>
  );
}

function PulseDot({ color = "#D4A537", size = 8 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size }}>
      <motion.span animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, position: "relative" }} />
    </span>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: "hub", icon: Home, label: "허브" },
    { id: "status", icon: Radio, label: "시그널" },
    { id: "wall", icon: MessageSquare, label: "토크 월" },
    { id: "quest", icon: Trophy, label: "퀘스트" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(13,11,8,0.95)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      paddingTop: 8,
    }}>
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "none", border: "none", cursor: "pointer",
            padding: "6px 0", minWidth: 56, minHeight: 44,
            borderRadius: 12, position: "relative",
            color: isActive ? "#D4A537" : "rgba(255,255,255,0.35)",
            transition: "color 0.25s",
            WebkitTapHighlightColor: "transparent",
          }}>
            {isActive && (
              <motion.div layoutId="tab-glow" style={{
                position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)",
                width: 24, height: 2, borderRadius: 1, background: "#D4A537",
              }} />
            )}
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: "0.02em" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HubScreen({ userCount, myStatus, onGoTo }) {
  const greetings = ["오늘 밤도 수고했어요.", "이 한 잔의 여유, 당신 것입니다.", "혼자여도 외롭지 않은 밤."];
  const [gi, setGi] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setGi(p => (p + 1) % greetings.length), 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: "clamp(12px, 3vw, 20px)" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
        style={{ textAlign: "center", marginBottom: "clamp(16px, 5vw, 28px)" }}>
        <div style={{
          fontSize: "clamp(9px, 2.5vw, 11px)", letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(212,165,55,0.6)", marginBottom: 8,
          fontFamily: "'Cormorant Garamond', serif"
        }}>
          HONSUL BAR · SOCIAL GUIDE
        </div>
        <div style={{
          fontSize: "clamp(22px, 6vw, 28px)", fontWeight: 300, color: "#F5E6C8",
          fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.3
        }}>
          <AnimatePresence mode="wait">
            <motion.span key={gi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} style={{ display: "block" }}>
              {greetings[gi]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      <GlassCard delay={0.1} style={{ textAlign: "center", padding: "clamp(14px, 4vw, 20px) clamp(12px, 3vw, 16px)", marginBottom: "clamp(10px, 3vw, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <PulseDot />
          <span style={{ fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>지금 이 바에</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
          <motion.span key={userCount} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ fontSize: "clamp(36px, 10vw, 48px)", fontWeight: 200, color: "#D4A537", fontFamily: "'Cormorant Garamond', serif" }}>
            {userCount}
          </motion.span>
          <span style={{ fontSize: "clamp(12px, 3.5vw, 15px)", color: "rgba(255,255,255,0.4)" }}>명이 함께하고 있어요</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: "clamp(10px, 3vw, 16px)", fontSize: 12 }}>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, color: v.color }}>
              {v.icon} <span>{k === "open" ? 3 : k === "hello" ? 2 : 1}</span>
            </span>
          ))}
        </div>
      </GlassCard>

      <GlassCard delay={0.2} style={{ marginBottom: "clamp(10px, 3vw, 16px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4, letterSpacing: "0.08em" }}>나의 시그널</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: STATUS_MAP[myStatus].color,
                boxShadow: "0 0 8px " + STATUS_MAP[myStatus].color + "60"
              }} />
              <span style={{ color: "#F5E6C8", fontSize: "clamp(13px, 3.5vw, 15px)", fontWeight: 500 }}>{STATUS_MAP[myStatus].label}</span>
            </div>
          </div>
          <button onClick={() => onGoTo("status")} style={{
            background: "rgba(212,165,55,0.12)", border: "1px solid rgba(212,165,55,0.2)",
            borderRadius: 10, padding: "8px 14px", color: "#D4A537",
            fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            minHeight: 44, WebkitTapHighlightColor: "transparent",
          }}>
            변경 <ChevronRight size={14} />
          </button>
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(8px, 2.5vw, 12px)", marginBottom: "clamp(10px, 3vw, 16px)" }}>
        {[
          { label: "토크 월", sub: "익명 피드", icon: <MessageSquare size={20} />, tab: "wall", delay: 0.3 },
          { label: "뉴비 퀘스트", sub: "미션 도전", icon: <Trophy size={20} />, tab: "quest", delay: 0.35 },
        ].map(item => (
          <GlassCard key={item.tab} delay={item.delay} onClick={() => onGoTo(item.tab)}
            style={{ cursor: "pointer", padding: "clamp(14px, 4vw, 18px) clamp(10px, 3vw, 14px)", minHeight: 44, WebkitTapHighlightColor: "transparent" }}>
            <div style={{ color: "#D4A537", marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#F5E6C8", marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.35)" }}>{item.sub}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard delay={0.4} style={{ background: "rgba(212,165,55,0.04)", borderColor: "rgba(212,165,55,0.1)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Sparkles size={16} style={{ color: "#D4A537", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: "#D4A537", fontWeight: 500, marginBottom: 4 }}>오늘의 팁</div>
            <div style={{ fontSize: "clamp(12px, 3vw, 13px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              바텐더에게 "추천 한 잔"이라고 말해보세요. 대화의 시작이 됩니다.
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function StatusScreen({ myStatus, setMyStatus, users }) {
  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>SOCIAL SIGNAL</div>
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8", fontFamily: "'Cormorant Garamond', serif", marginBottom: 24 }}>
        나의 시그널 설정
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {Object.entries(STATUS_MAP).map(([key, val], i) => {
          const active = myStatus === key;
          return (
            <GlassCard key={key} delay={i * 0.08} onClick={() => setMyStatus(key)}
              style={{
                cursor: "pointer", padding: "clamp(12px, 3.5vw, 16px) clamp(14px, 4vw, 18px)",
                borderColor: active ? val.color + "50" : "rgba(255,255,255,0.07)",
                background: active ? val.color + "10" : "rgba(255,255,255,0.04)",
                transition: "all 0.3s ease",
                minHeight: 44, WebkitTapHighlightColor: "transparent",
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2.5vw, 12px)" }}>
                  <motion.div animate={active ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.4 }}
                    style={{
                      width: "clamp(32px, 8vw, 36px)", height: "clamp(32px, 8vw, 36px)", borderRadius: 12,
                      background: val.color + (active ? "25" : "10"),
                      display: "flex", alignItems: "center", justifyContent: "center", color: val.color,
                    }}>{val.icon}</motion.div>
                  <div>
                    <div style={{ fontSize: "clamp(13px, 3.5vw, 15px)", fontWeight: 500, color: active ? val.color : "#F5E6C8" }}>{val.label}</div>
                    <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {key === "open" ? "누구든 편하게 말 걸어주세요" : key === "hello" ? "가벼운 인사 정도는 OK" : "조용히 시간을 보내고 싶어요"}
                    </div>
                  </div>
                </div>
                {active && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                    <Check size={18} style={{ color: val.color }} />
                  </motion.div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 12 }}>지금 바에 있는 사람들</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map((u, i) => {
          const st = STATUS_MAP[u.status];
          return (
            <GlassCard key={u.id} delay={0.3 + i * 0.06} style={{ padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2.5vw, 12px)" }}>
                <div style={{
                  width: "clamp(36px, 9vw, 40px)", height: "clamp(36px, 9vw, 40px)", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(16px, 4.5vw, 20px)",
                  border: "1.5px solid " + st.color + "30",
                }}>{u.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#F5E6C8" }}>{u.nickname}</span>
                    <span style={{
                      fontSize: 9, padding: "2px 7px", borderRadius: 6,
                      background: st.color + "18", color: st.color, fontWeight: 500,
                      letterSpacing: "0.02em", whiteSpace: "nowrap",
                    }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                    {u.seat} · {timeAgo(u.joinedAt)}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function QuestScreen({ completed, onComplete }) {
  const totalXp = QUESTS.reduce((s, q) => s + q.xp, 0);
  const earnedXp = QUESTS.filter(q => completed.has(q.id)).reduce((s, q) => s + q.xp, 0);
  const pct = Math.round((earnedXp / totalXp) * 100);
  const allDone = completed.size >= QUESTS.length - 1;

  useEffect(() => {
    if (allDone && !completed.has("q7")) onComplete("q7");
  }, [allDone]);

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>NEWBIE QUEST</div>
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8", fontFamily: "'Cormorant Garamond', serif", marginBottom: 20 }}>
        아이스브레이킹 퀘스트
      </div>
      <GlassCard delay={0.1} style={{ marginBottom: 20, textAlign: "center", padding: "clamp(14px, 4vw, 20px) clamp(12px, 3vw, 16px)" }}>
        <div style={{ position: "relative", width: "clamp(80px, 22vw, 100px)", height: "clamp(80px, 22vw, 100px)", margin: "0 auto 14px" }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#D4A537" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={2 * Math.PI * 42}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
              transition={{ duration: 1, ease: "easeOut" }} />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 300, color: "#D4A537", fontFamily: "'Cormorant Garamond', serif" }}>{pct}%</span>
          </div>
        </div>
        <div style={{ fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(255,255,255,0.5)" }}>{earnedXp} / {totalXp} XP 획득</div>
        {pct === 100 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
            style={{ marginTop: 10, fontSize: 14, color: "#D4A537", fontWeight: 500 }}>
            🎉 축하합니다! 단골 인증 완료!
          </motion.div>
        )}
      </GlassCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {QUESTS.map((q, i) => {
          const done = completed.has(q.id);
          return (
            <GlassCard key={q.id} delay={0.2 + i * 0.05} style={{ padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2.5vw, 12px)" }}>
                <motion.div whileTap={!done && q.id !== "q7" ? { scale: 0.9 } : {}}
                  onClick={() => { if (!done && q.id !== "q7") onComplete(q.id); }}
                  style={{
                    width: "clamp(36px, 9vw, 42px)", height: "clamp(36px, 9vw, 42px)",
                    borderRadius: 12, flexShrink: 0,
                    background: done ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)",
                    border: "1.5px solid " + (done ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.08)"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "clamp(14px, 4vw, 18px)",
                    cursor: done || q.id === "q7" ? "default" : "pointer",
                    transition: "all 0.3s",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                  {done ? <Check size={18} style={{ color: "#D4A537" }} /> : q.icon}
                </motion.div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500,
                    color: done ? "rgba(212,165,55,0.7)" : "#F5E6C8",
                    textDecoration: done ? "line-through" : "none",
                    textDecorationColor: "rgba(212,165,55,0.3)",
                  }}>{q.title}</div>
                  <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{q.desc}</div>
                </div>
                <span style={{ fontSize: 11, color: done ? "#D4A537" : "rgba(255,255,255,0.2)", fontWeight: 600, flexShrink: 0 }}>+{q.xp}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function SOSFAB({ onClick }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.9 }}
      style={{
        position: "fixed",
        bottom: "calc(68px + max(8px, env(safe-area-inset-bottom)))",
        right: "clamp(12px, 4vw, 20px)",
        zIndex: 40,
        width: "clamp(46px, 12vw, 52px)", height: "clamp(46px, 12vw, 52px)",
        borderRadius: 16,
        background: "rgba(212,165,55,0.1)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(212,165,55,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#D4A537",
        boxShadow: "0 4px 24px rgba(212,165,55,0.1)",
        WebkitTapHighlightColor: "transparent",
      }}>
      <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }}>
        <Bell size={22} />
      </motion.div>
    </motion.button>
  );
}

export default function App() {
  const [tab, setTab] = useState("hub");
  const [myStatus, setMyStatus] = useState("hello");
  const [completedQuests, setCompletedQuests] = useState(new Set(["q1"]));
  const [sosOpen, setSosOpen] = useState(false);
  const [userCount] = useState(6);

  const completeQuest = useCallback((qid) => {
    setCompletedQuests(prev => {
      const next = new Set(prev);
      next.add(qid);
      return next;
    });
  }, []);

  const handleStatusChange = useCallback((s) => {
    setMyStatus(s);
    if (s === "open") completeQuest("q6");
  }, [completeQuest]);

  return (
    <div style={{
      width: "100%", maxWidth: 430, margin: "0 auto",
      minHeight: "100vh", minHeight: "100dvh",
      position: "relative",
      background: "#0D0B08", color: "#F5E6C8",
      fontFamily: "'DM Sans', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: "hidden",
    }}>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');"
      }</style>
      <AmbientBG />
      <div style={{
        position: "relative", zIndex: 1,
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "calc(70px + max(8px, env(safe-area-inset-bottom)))",
      }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {tab === "hub" && <HubScreen userCount={userCount} myStatus={myStatus} onGoTo={setTab} />}
            {tab === "status" && <StatusScreen myStatus={myStatus} setMyStatus={handleStatusChange} users={INITIAL_USERS} />}
            {tab === "wall" && <TalkWallScreen onQuestComplete={completeQuest} />}
            {tab === "quest" && <QuestScreen completed={completedQuests} onComplete={completeQuest} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <SOSFAB onClick={() => setSosOpen(true)} />
      <SOSModal open={sosOpen} onClose={() => setSosOpen(false)} seatLabel="바 3번석" />
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}