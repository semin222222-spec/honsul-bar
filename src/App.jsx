import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MessageCircle, Trophy, Wine, Gamepad2,
  HandMetal, Bell, Sparkles, Smile, Moon,
  ChevronRight, Check, Swords,
} from "lucide-react";
import SOSModal from "./components/SOSModal";
import SeatPicker from "./components/SeatPicker";
import QuestionCardScreen from "./components/QuestionCard";
import MenuScreen from "./components/MenuScreen";
import ThankYouScreen from "./components/ThankYouScreen";
import AmbientBG from "./components/AmbientBG";
import GameCenter from "./components/GameCenter";
import WhiskyNine from "./components/WhiskyNine";
import MatchInviteModal from "./components/MatchInviteModal";
import MyProfileCard from "./components/MyProfileCard";
import { usePresence } from "./hooks/usePresence";
import { useMatchmaking } from "./hooks/useMatchmaking";
import { useSession } from "./hooks/useSession";
import { useOrders } from "./hooks/useOrders";

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

// ───── 내 프로필 카드는 components/MyProfileCard.jsx 에서 import하여 사용 ─────

function TabBar({ active, onChange }) {
  const tabs = [
    { id: "hub", icon: Home, label: "홈" },
    { id: "menu", icon: Wine, label: "메뉴" },
    { id: "question", icon: MessageCircle, label: "카드" },
    { id: "game", icon: Gamepad2, label: "게임" },
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
            padding: "4px 0", minWidth: 40, minHeight: 44,
            borderRadius: 10, position: "relative",
            color: isActive ? "#D4A537" : "rgba(255,255,255,0.35)",
            transition: "color 0.25s",
            WebkitTapHighlightColor: "transparent",
          }}>
            {isActive && (
              <motion.div layoutId="tab-glow" style={{
                position: "absolute", top: -1, left: "50%",
                width: 20, height: 2, borderRadius: 1, background: "#D4A537",
                marginLeft: -10,
              }} />
            )}
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HubScreen({ userCount, myStatus, onGoTo, users, mySeat, myNickname, myAvatar, onReroll }) {
  const greetings = ["오늘 밤도 수고했어요.", "이 한 잔의 여유, 당신 것입니다.", "혼자여도 외롭지 않은 밤."];
  const [gi, setGi] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setGi(p => (p + 1) % greetings.length), 5000);
    return () => clearInterval(iv);
  }, []);
  const statusCounts = { open: 0, hello: 0, alone: 0 };
  users.forEach(u => { if (statusCounts[u.status] !== undefined) statusCounts[u.status]++; });

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: "clamp(12px, 3vw, 20px)" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
        style={{ textAlign: "center", marginBottom: "clamp(16px, 5vw, 28px)" }}>
        <div style={{ fontSize: "clamp(9px, 2.5vw, 11px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,165,55,0.6)", marginBottom: 8, fontFamily: "'Noto Serif KR', serif" }}>오늘, 혼술</div>
        <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", letterSpacing: "0.12em", color: "rgba(212,165,55,0.4)", marginTop: 4, fontFamily: "'Noto Serif KR', serif" }}>혼술바 소셜 가이드</div>
        <div style={{ fontSize: "clamp(22px, 6vw, 28px)", fontWeight: 300, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", lineHeight: 1.3 }}>
          <AnimatePresence mode="wait">
            <motion.span key={gi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} style={{ display: "block" }}>{greetings[gi]}</motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ✨ 내 프로필 카드 (맨 위로!) */}
      <MyProfileCard
        nickname={myNickname}
        avatar={myAvatar}
        seat={mySeat}
        onReroll={onReroll}
        delay={0.05}
      />

      <GlassCard delay={0.1} style={{ textAlign: "center", padding: "clamp(14px, 4vw, 20px)", marginBottom: "clamp(10px, 3vw, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <PulseDot /><span style={{ fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(255,255,255,0.5)" }}>지금 이 바에</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
          <motion.span key={userCount} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: "clamp(36px, 10vw, 48px)", fontWeight: 200, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>{userCount}</motion.span>
          <span style={{ fontSize: "clamp(12px, 3.5vw, 15px)", color: "rgba(255,255,255,0.4)" }}>명이 함께하고 있어요</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: "clamp(10px, 3vw, 16px)", fontSize: 12 }}>
          {Object.entries(STATUS_MAP).map(([k, v]) => (<span key={k} style={{ display: "flex", alignItems: "center", gap: 4, color: v.color }}>{v.icon} <span>{statusCounts[k]}</span></span>))}
        </div>
      </GlassCard>

      <GlassCard delay={0.2} style={{ marginBottom: "clamp(10px, 3vw, 16px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>나의 시그널</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_MAP[myStatus].color, boxShadow: "0 0 8px " + STATUS_MAP[myStatus].color + "60" }} />
              <span style={{ color: "#F5E6C8", fontSize: "clamp(13px, 3.5vw, 15px)", fontWeight: 500 }}>{STATUS_MAP[myStatus].label}</span>
            </div>
          </div>
          <button onClick={() => onGoTo("status")} style={{ background: "rgba(212,165,55,0.12)", border: "1px solid rgba(212,165,55,0.2)", borderRadius: 10, padding: "8px 14px", color: "#D4A537", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, minHeight: 44, WebkitTapHighlightColor: "transparent" }}>변경 <ChevronRight size={14} /></button>
        </div>
      </GlassCard>

      <div style={{ marginBottom: "clamp(10px, 3vw, 16px)" }}>
        {[
          { label: "대결 신청", sub: "더 나인 1:1", icon: <Swords size={20} />, tab: "game", delay: 0.3 },
        ].map(item => (
          <GlassCard key={item.tab} delay={item.delay} onClick={() => onGoTo(item.tab)} style={{ cursor: "pointer", padding: "clamp(14px, 4vw, 18px) clamp(14px, 4vw, 18px)", minHeight: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ color: "#D4A537", flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "clamp(13px, 3.5vw, 15px)", fontWeight: 500, color: "#F5E6C8", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.35)" }}>{item.sub}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard delay={0.4} style={{ background: "rgba(212,165,55,0.04)", borderColor: "rgba(212,165,55,0.1)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Sparkles size={16} style={{ color: "#D4A537", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: "#D4A537", fontWeight: 500, marginBottom: 4 }}>오늘의 팁</div>
            <div style={{ fontSize: "clamp(12px, 3vw, 13px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>바텐더에게 "추천 한 잔"이라고 말해보세요. 대화의 시작이 됩니다.</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function StatusScreen({ myStatus, setMyStatus, users, myId }) {
  const otherUsers = users.filter(u => u.id !== myId);
  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>SOCIAL SIGNAL</div>
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", marginBottom: 24 }}>나의 시그널 설정</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {Object.entries(STATUS_MAP).map(([key, val], i) => {
          const active = myStatus === key;
          return (
            <GlassCard key={key} delay={i * 0.08} onClick={() => setMyStatus(key)} style={{ cursor: "pointer", padding: "clamp(12px, 3.5vw, 16px) clamp(14px, 4vw, 18px)", borderColor: active ? val.color + "50" : "rgba(255,255,255,0.07)", background: active ? val.color + "10" : "rgba(255,255,255,0.04)", minHeight: 44 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2.5vw, 12px)" }}>
                  <motion.div animate={active ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.4 }} style={{ width: "clamp(32px, 8vw, 36px)", height: "clamp(32px, 8vw, 36px)", borderRadius: 12, background: val.color + (active ? "25" : "10"), display: "flex", alignItems: "center", justifyContent: "center", color: val.color }}>{val.icon}</motion.div>
                  <div>
                    <div style={{ fontSize: "clamp(13px, 3.5vw, 15px)", fontWeight: 500, color: active ? val.color : "#F5E6C8" }}>{val.label}</div>
                    <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{key === "open" ? "누구든 편하게 말 걸어주세요" : key === "hello" ? "가벼운 인사 정도는 OK" : "조용히 시간을 보내고 싶어요"}</div>
                  </div>
                </div>
                {active && (<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}><Check size={18} style={{ color: val.color }} /></motion.div>)}
              </div>
            </GlassCard>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)" }}>지금 바에 있는 사람들</span>
        <span style={{ fontSize: 10, color: "rgba(212,165,55,0.4)", background: "rgba(212,165,55,0.08)", padding: "2px 8px", borderRadius: 8 }}>{otherUsers.length}명</span>
      </div>
      {otherUsers.length === 0 ? (
        <GlassCard delay={0.3} style={{ textAlign: "center", padding: "30px 16px" }}><div style={{ fontSize: 28, marginBottom: 8 }}>🌙</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>아직 다른 손님이 없어요</div></GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {otherUsers.map((u, i) => {
            const st = STATUS_MAP[u.status] || STATUS_MAP.hello;
            return (
              <GlassCard key={u.id} delay={0.3 + i * 0.06} style={{ padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2.5vw, 12px)" }}>
                  <div style={{ width: "clamp(36px, 9vw, 40px)", height: "clamp(36px, 9vw, 40px)", borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(16px, 4.5vw, 20px)", border: "1.5px solid " + st.color + "30" }}>{u.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#F5E6C8" }}>{u.nickname}</span>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: st.color + "18", color: st.color, fontWeight: 500 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{u.seat}</div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestScreen({ completed, onComplete }) {
  const totalXp = QUESTS.reduce((s, q) => s + q.xp, 0);
  const earnedXp = QUESTS.filter(q => completed.has(q.id)).reduce((s, q) => s + q.xp, 0);
  const pct = Math.round((earnedXp / totalXp) * 100);
  const allDone = completed.size >= QUESTS.length - 1;
  useEffect(() => { if (allDone && !completed.has("q7")) onComplete("q7"); }, [allDone]);

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>NEWBIE QUEST</div>
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", marginBottom: 20 }}>아이스브레이킹 퀘스트</div>
      <GlassCard delay={0.1} style={{ marginBottom: 20, textAlign: "center", padding: "clamp(14px, 4vw, 20px)" }}>
        <div style={{ position: "relative", width: "clamp(80px, 22vw, 100px)", height: "clamp(80px, 22vw, 100px)", margin: "0 auto 14px" }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#D4A537" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} initial={{ strokeDashoffset: 2 * Math.PI * 42 }} animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }} transition={{ duration: 1, ease: "easeOut" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 300, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>{pct}%</span>
          </div>
        </div>
        <div style={{ fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(255,255,255,0.5)" }}>{earnedXp} / {totalXp} XP</div>
        {pct === 100 && (<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.3 }} style={{ marginTop: 10, fontSize: 14, color: "#D4A537", fontWeight: 500 }}>🎉 단골 인증 완료!</motion.div>)}
      </GlassCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {QUESTS.map((q, i) => {
          const done = completed.has(q.id);
          return (
            <GlassCard key={q.id} delay={0.2 + i * 0.05} style={{ padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2.5vw, 12px)" }}>
                <motion.div whileTap={!done && q.id !== "q7" ? { scale: 0.9 } : {}} onClick={() => { if (!done && q.id !== "q7") onComplete(q.id); }}
                  style={{ width: "clamp(36px, 9vw, 42px)", height: "clamp(36px, 9vw, 42px)", borderRadius: 12, flexShrink: 0, background: done ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)", border: "1.5px solid " + (done ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.08)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(14px, 4vw, 18px)", cursor: done || q.id === "q7" ? "default" : "pointer" }}>
                  {done ? <Check size={18} style={{ color: "#D4A537" }} /> : q.icon}
                </motion.div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: done ? "rgba(212,165,55,0.7)" : "#F5E6C8", textDecoration: done ? "line-through" : "none" }}>{q.title}</div>
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
    <motion.button onClick={onClick} whileTap={{ scale: 0.9 }} style={{
      position: "fixed", bottom: "calc(68px + max(8px, env(safe-area-inset-bottom)))", right: "clamp(12px, 4vw, 20px)", zIndex: 40,
      width: "clamp(46px, 12vw, 52px)", height: "clamp(46px, 12vw, 52px)", borderRadius: 16,
      background: "rgba(212,165,55,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(212,165,55,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#D4A537",
      boxShadow: "0 4px 24px rgba(212,165,55,0.1)", WebkitTapHighlightColor: "transparent",
    }}>
      <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }}><Bell size={22} /></motion.div>
    </motion.button>
  );
}

export default function App() {
  const [tab, setTab] = useState("hub");
  const [inMatchState, setInMatchState] = useState(false);

  // 1. 기본 UUID + 닉네임 만들기 (좌석 없어도 생성됨)
  // 2. session 훅으로 DB의 내 세션 확인 → 자동 복구
  // 3. session이 있으면 mySeat도 자동 세팅됨

  // 먼저 customer 정보 확보 (localStorage에 persist)
  const [myId] = useState(() => {
    let id = localStorage.getItem("honsul_customer_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("honsul_customer_id", id);
    }
    return id;
  });

  // 세션 훅
  const { session, loading: sessionLoading, createSession, justSettled, seatMoveNotice, dismissSeatMove } = useSession({
    myId,
    myNickname: null, // 나중에 presence에서 업데이트
    myAvatar: null,
  });

  // 정산 완료된 세션의 주문 기록 (ThankYou 화면에 표시용)
  const [settledOrders, setSettledOrders] = useState([]);
  useEffect(() => {
    if (!justSettled?.id) {
      setSettledOrders([]);
      return;
    }
    // 정산된 세션의 주문 조회
    import("./lib/supabaseClient").then(({ supabase }) => {
      supabase
        .from("orders")
        .select("*")
        .eq("session_id", justSettled.id)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          setSettledOrders(data || []);
        });
    });
  }, [justSettled?.id]);

  const mySeat = session?.seat_label || null;

  // 주문 훅
  const { orders, totalAmount, createOrder } = useOrders(session?.id, mySeat);

  const presence = usePresence(mySeat, inMatchState, {
    myId,
    initialNickname: session?.nickname,
    initialAvatar: session?.avatar,
  });
  const { users, userCount, myNickname, myAvatar, myStatus, setMyStatus, rerollNickname } = presence;

  const [completedQuests, setCompletedQuests] = useState(new Set(["q1"]));
  const [sosOpen, setSosOpen] = useState(false);

  const mm = useMatchmaking({ myId, myNickname, myAvatar, mySeat });

  // 매치 시작/종료 시 presence inMatch 플래그 갱신
  useEffect(() => {
    setInMatchState(!!mm.match);
  }, [mm.match]);

  const completeQuest = useCallback((qid) => {
    setCompletedQuests(prev => { const next = new Set(prev); next.add(qid); return next; });
  }, []);

  const handleStatusChange = useCallback((s) => {
    setMyStatus(s);
    if (s === "open") completeQuest("q6");
  }, [setMyStatus, completeQuest]);

  // 좌석 선택 → 세션 생성
  const handleSeatSelect = useCallback(async (seatLabel) => {
    await createSession(seatLabel);
  }, [createSession]);

  // 세션 로딩 중 (재접속 복구 체크)
  if (sessionLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0D0B08", color: "#F5E6C8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Pretendard', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>
            잠시만요...
          </div>
        </div>
      </div>
    );
  }

  // 정산 완료 → ThankYouScreen 표시 (세션 없어질 때까지 유지)
  if (justSettled) {
    const settledTotal = settledOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    return (
      <ThankYouScreen
        orders={settledOrders}
        totalAmount={settledTotal}
        nickname={justSettled.nickname}
        seat={justSettled.seat_label}
      />
    );
  }

  if (!mySeat) return <SeatPicker onSelect={handleSeatSelect} />;

  const inMatch = !!mm.match;

  return (
    <div style={{
      width: "100%", maxWidth: 430, margin: "0 auto",
      minHeight: "100vh", position: "relative",
      background: "#0D0B08", color: "#F5E6C8",
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: "hidden",
    }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700;900&family=Pretendard:wght@300;400;500;600;700&display=swap');"}</style>
      <AmbientBG />
      <div style={{
        position: "relative", zIndex: 1,
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "calc(70px + max(8px, env(safe-area-inset-bottom)))",
      }}>
        {inMatch ? (
          <WhiskyNine
            match={mm.match}
            opponentMove={mm.opponentMove}
            opponentReady={mm.opponentReady}
            onSendMove={mm.sendMove}
            onLeave={mm.leaveMatch}
            myNickname={myNickname}
            myAvatar={myAvatar}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                const swipeThreshold = 80; // 최소 스와이프 거리(px)
                const tabOrder = ["hub", "menu", "question", "game", "quest"];
                const currentIdx = tabOrder.indexOf(tab);
                if (currentIdx === -1) return;

                // 왼쪽으로 스와이프 → 다음 탭
                if (info.offset.x < -swipeThreshold && currentIdx < tabOrder.length - 1) {
                  setTab(tabOrder[currentIdx + 1]);
                }
                // 오른쪽으로 스와이프 → 이전 탭
                else if (info.offset.x > swipeThreshold && currentIdx > 0) {
                  setTab(tabOrder[currentIdx - 1]);
                }
              }}
            >
              {tab === "hub" && (
                <HubScreen
                  userCount={userCount}
                  myStatus={myStatus}
                  onGoTo={setTab}
                  users={users}
                  mySeat={mySeat}
                  myNickname={myNickname}
                  myAvatar={myAvatar}
                  onReroll={rerollNickname}
                />
              )}
              {tab === "status" && <StatusScreen myStatus={myStatus} setMyStatus={handleStatusChange} users={users} myId={myId} />}
              {tab === "question" && <QuestionCardScreen />}
              {tab === "menu" && <MenuScreen createOrder={createOrder} orders={orders} totalAmount={totalAmount} mySeat={mySeat} />}
              {tab === "game" && (
                <GameCenter
                  users={users}
                  myId={myId}
                  myNickname={myNickname}
                  myAvatar={myAvatar}
                  mySeat={mySeat}
                  myStatus={myStatus}
                  onReroll={rerollNickname}
                  onSendInvite={mm.sendInvite}
                  outgoingInvite={mm.outgoingInvite}
                  onCancelOutgoing={mm.cancelOutgoing}
                />
              )}
              {tab === "quest" && <QuestScreen completed={completedQuests} onComplete={completeQuest} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {!inMatch && <SOSFAB onClick={() => setSosOpen(true)} />}
      <SOSModal open={sosOpen} onClose={() => setSosOpen(false)} seatLabel={mySeat} />

      {/* 좌석 이동 알림 토스트 (손님용) */}
      <AnimatePresence>
        {seatMoveNotice && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={dismissSeatMove}
            style={{
              position: "fixed",
              top: "max(20px, env(safe-area-inset-top))",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "linear-gradient(135deg, rgba(100,180,220,0.95), rgba(60,120,180,0.92))",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(170,200,255,0.4)",
              borderRadius: 14,
              padding: "12px 18px",
              minWidth: 280,
              maxWidth: "90%",
              boxShadow: "0 10px 40px rgba(60,120,180,0.4)",
              cursor: "pointer",
              fontFamily: "'Pretendard', -apple-system, sans-serif",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28 }}>🔄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 3 }}>
                  자리가 변경되었어요
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                  📍 <strong>{seatMoveNotice.from}</strong> → <strong>{seatMoveNotice.to}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!inMatch && <TabBar active={tab} onChange={setTab} />}

      <MatchInviteModal
        invite={mm.incomingInvite}
        onAccept={mm.acceptInvite}
        onDecline={mm.declineInvite}
      />
    </div>
  );
}
