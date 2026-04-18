import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Heart, HelpCircle, Loader2, WifiOff } from "lucide-react";
import { useMessages } from "../hooks/useMessages";

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return "방금 전";
  if (diff < 60) return diff + "분 전";
  if (diff < 1440) return Math.floor(diff / 60) + "시간 전";
  return Math.floor(diff / 1440) + "일 전";
}

const RANDOM_NAMES = [
  "위스키 탐험가", "맥주 초보", "하이볼 매니아", "칵테일 연구원",
  "와인 입문자", "소주 한 잔", "막걸리 전도사", "에일 덕후",
  "진토닉 마스터", "럼코크 러버", "사워 중독자", "논알콜 히어로",
];

function getRandomNickname() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

function GlassCard({ children, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "clamp(12px, 3.5vw, 16px)",
        padding: "clamp(12px, 3.5vw, 16px)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function MessageCard({ msg, onHeart, onCurious, isHearted, delay }) {
  const isOptimistic = msg._optimistic;
  return (
    <GlassCard
      delay={delay}
      style={{
        marginBottom: "clamp(8px, 2vw, 10px)",
        padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)",
        opacity: isOptimistic ? 0.6 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(212,165,55,0.6)", fontWeight: 500, letterSpacing: "0.02em" }}>
          {msg.nickname}
        </span>
        <span style={{ fontSize: "clamp(9px, 2.2vw, 10px)", color: "rgba(255,255,255,0.2)" }}>
          {isOptimistic ? "전송 중..." : timeAgo(msg.created_at)}
        </span>
      </div>
      <div style={{
        fontSize: "clamp(13px, 3.5vw, 14px)", color: "#F5E6C8",
        lineHeight: 1.6, marginBottom: 12,
        wordBreak: "keep-all", overflowWrap: "break-word",
      }}>
        {msg.content}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "clamp(10px, 3vw, 14px)" }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onHeart(msg.id)}
          disabled={isOptimistic}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "none", border: "none",
            cursor: isOptimistic ? "default" : "pointer",
            color: isHearted ? "#D4A537" : "rgba(255,255,255,0.3)",
            fontSize: 12, transition: "color 0.2s",
            padding: "6px", minHeight: 44, minWidth: 44,
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Heart size={15} fill={isHearted ? "#D4A537" : "none"} />
          {msg.hearts > 0 && msg.hearts}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onCurious(msg.id)}
          disabled={isOptimistic}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "none", border: "none",
            cursor: isOptimistic ? "default" : "pointer",
            color: "rgba(255,255,255,0.3)", fontSize: 12,
            padding: "6px", minHeight: 44, minWidth: 44,
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <HelpCircle size={15} />
          {msg.curious > 0 && msg.curious}
        </motion.button>
      </div>
    </GlassCard>
  );
}

export default function TalkWallScreen({ onQuestComplete }) {
  const { messages, loading, error, postMessage, addHeart, addCurious } = useMessages();
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [heartedIds, setHeartedIds] = useState(new Set());
  const [nickname] = useState(() => getRandomNickname());
  const feedRef = useRef(null);

  const handlePost = async () => {
    const text = input.trim();
    if (!text || posting) return;
    setPosting(true);
    setInput("");
    const result = await postMessage(nickname, text);
    if (result.success) {
      onQuestComplete?.("q4");
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    setPosting(false);
  };

  const handleHeart = (msgId) => {
    if (heartedIds.has(msgId)) return;
    setHeartedIds((prev) => new Set([...prev, msgId]));
    addHeart(msgId);
    onQuestComplete?.("q5");
  };

  const handleCurious = (msgId) => {
    addCurious(msgId);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>TALK WALL</div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: "clamp(14px, 4vw, 20px)", flexWrap: "wrap", gap: 6,
      }}>
        <div style={{
          fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
          fontFamily: "'Cormorant Garamond', serif",
        }}>
          익명 토크 월
        </div>
        <div style={{
          fontSize: "clamp(9px, 2.5vw, 11px)", color: "rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          닉네임:
          <span style={{ color: "rgba(212,165,55,0.7)", fontWeight: 500 }}>{nickname}</span>
        </div>
      </div>

      <GlassCard delay={0.1} style={{ marginBottom: "clamp(14px, 4vw, 20px)", padding: "clamp(10px, 3vw, 12px) clamp(10px, 3vw, 14px)" }}>
        <div style={{ display: "flex", gap: "clamp(6px, 2vw, 10px)", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="오늘 밤, 하고 싶은 말이 있나요?"
            maxLength={120}
            rows={2}
            disabled={posting}
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "10px 12px", color: "#F5E6C8",
              fontSize: 16, resize: "none", outline: "none",
              fontFamily: "inherit", lineHeight: 1.5, transition: "border-color 0.2s",
              WebkitAppearance: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(212,165,55,0.3)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePost}
            disabled={!input.trim() || posting}
            style={{
              width: 44, height: 44, borderRadius: 12, border: "none",
              background: input.trim() && !posting ? "linear-gradient(135deg, #D4A537, #B8860B)" : "rgba(255,255,255,0.06)",
              color: input.trim() && !posting ? "#0D0B08" : "rgba(255,255,255,0.2)",
              cursor: input.trim() && !posting ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.3s", flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {posting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 size={18} />
              </motion.div>
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 6, fontSize: "clamp(9px, 2.2vw, 10px)", color: "rgba(255,255,255,0.2)",
        }}>
          <span>Shift+Enter로 줄바꿈</span>
          <span>{input.length}/120</span>
        </div>
      </GlassCard>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "clamp(10px, 3vw, 12px) clamp(12px, 3.5vw, 16px)",
          marginBottom: 16,
          background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.15)",
          borderRadius: 12, color: "rgba(220,130,130,0.8)",
          fontSize: "clamp(11px, 3vw, 13px)",
        }}>
          <WifiOff size={16} style={{ flexShrink: 0 }} />
          <span>연결에 문제가 있어요. 잠시 후 다시 시도해주세요.</span>
        </motion.div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-block", color: "rgba(212,165,55,0.4)" }}>
            <Loader2 size={28} />
          </motion.div>
          <div style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>이야기를 불러오고 있어요...</div>
        </div>
      )}

      {!loading && (
        <div ref={feedRef}>
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ textAlign: "center", padding: "clamp(30px, 10vw, 48px) 20px", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: "clamp(28px, 8vw, 36px)", marginBottom: 12 }}>🌙</div>
              <div style={{ fontSize: "clamp(13px, 3.5vw, 15px)", marginBottom: 4 }}>아직 아무도 글을 남기지 않았어요</div>
              <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)" }}>첫 번째 이야기를 시작해 보세요</div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <MessageCard
                  key={msg.id}
                  msg={msg}
                  delay={i < 6 ? i * 0.05 : 0}
                  isHearted={heartedIds.has(msg.id)}
                  onHeart={handleHeart}
                  onCurious={handleCurious}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}