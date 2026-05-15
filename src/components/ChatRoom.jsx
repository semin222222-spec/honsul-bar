import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

/**
 * ChatRoom - 익명 라운지 채팅 UI
 *
 * Props:
 *  - messages: 메시지 배열
 *  - sending: 전송 중 여부
 *  - mySessionId: 내 세션 ID (내 메시지 구분용)
 *  - onSendMessage: (content) => Promise<{ok, error}>
 *  - onNicknameClick: (message) => void  // 닉네임/아바타 클릭 시 호출
 *  - loading: 초기 로딩
 *  - activeUserCount: 현재 활성 손님 수 (헤더 표시용)
 */
export default function ChatRoom({
  messages = [],
  sending = false,
  mySessionId,
  onSendMessage,
  onNicknameClick,
  loading = false,
  activeUserCount = 0,
}) {
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  // 새 메시지 오면 스크롤 자동 내리기
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // 에러 메시지 자동 사라지기
  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(""), 2500);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const result = await onSendMessage(trimmed);
    if (result?.ok) {
      setInput("");
      inputRef.current?.focus();
    } else {
      setErrorMsg(result?.error || "전송에 실패했어요");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getMessageGroups = () => {
    const groups = [];
    let lastTimeKey = null;

    messages.forEach((msg) => {
      const d = new Date(msg.created_at);
      const timeKey = `${d.getHours()}:${Math.floor(d.getMinutes() / 10)}`;
      
      if (timeKey !== lastTimeKey) {
        groups.push({
          type: "divider",
          id: `divider-${timeKey}-${msg.id}`,
          time: formatTime(msg.created_at),
        });
        lastTimeKey = timeKey;
      }
      groups.push({ type: "message", ...msg });
    });

    return groups;
  };

  const groups = getMessageGroups();
  const inputLength = input.length;

  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
      border: "1px solid rgba(212,165,55,0.15)",
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 16,
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "14px 16px",
        background: "linear-gradient(135deg, rgba(212,165,55,0.12), rgba(180,120,30,0.06))",
        borderBottom: "1px solid rgba(212,165,55,0.15)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div
            animate={{ opacity: [1, 0.5, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 8, height: 8,
              borderRadius: "50%",
              background: "#6AB06A",
              boxShadow: "0 0 6px #6AB06A",
            }}
          />
          <span style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 16,
            color: "#D4A537",
            fontWeight: 600,
          }}>
            💬 익명 라운지
          </span>
        </div>
        {activeUserCount > 0 && (
          <span style={{
            fontSize: 11,
            color: "rgba(212,165,55,0.8)",
            background: "rgba(212,165,55,0.12)",
            padding: "3px 9px",
            borderRadius: 100,
            fontWeight: 600,
          }}>
            {activeUserCount}명
          </span>
        )}
      </div>

      {/* 안내 */}
      <div style={{
        padding: "7px 14px",
        background: "rgba(212,165,55,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        fontSize: 10,
        color: "rgba(212,165,55,0.65)",
        textAlign: "center",
      }}>
        🍷 12시간 후 사라져요 · 100자 이내 · 닉네임 클릭 → 게임 신청
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        style={{
          height: 380,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "rgba(0,0,0,0.2)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loading ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(255,255,255,0.4)",
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 size={24} />
            </motion.div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
            padding: "0 20px",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 13, marginBottom: 4, fontFamily: "'Noto Serif KR', serif" }}>
              아직 대화가 없어요
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
              첫 메시지를 남겨보세요!<br/>
              혼자만의 시간을 함께 나눠요 🥃
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groups.map((g) => {
              if (g.type === "divider") {
                return (
                  <div key={g.id} style={{ textAlign: "center", margin: "4px 0" }}>
                    <span style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.04)",
                      padding: "3px 10px",
                      borderRadius: 100,
                      letterSpacing: "0.05em",
                    }}>
                      {g.time}
                    </span>
                  </div>
                );
              }

              const isMine = g.session_id === mySessionId;
              return (
                <MessageBubble
                  key={g.id}
                  message={g}
                  isMine={isMine}
                  onNicknameClick={onNicknameClick}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* 입력 영역 */}
      <div style={{
        padding: "12px 14px",
        background: "rgba(255,255,255,0.02)",
        borderTop: "1px solid rgba(212,165,55,0.1)",
        position: "relative",
      }}>
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                top: -32,
                left: 14,
                right: 14,
                padding: "6px 12px",
                background: "rgba(226,75,74,0.15)",
                border: "1px solid rgba(226,75,74,0.3)",
                borderRadius: 8,
                color: "rgba(255,150,150,0.9)",
                fontSize: 11,
                textAlign: "center",
              }}
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length <= 100) setInput(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder="라운지에 메시지 남기기..."
            rows={1}
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.4)",
              border: "1px solid " + (inputLength >= 90 ? "rgba(226,75,74,0.4)" : "rgba(255,255,255,0.08)"),
              borderRadius: 18,
              padding: "10px 14px",
              color: "#F5E6C8",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              resize: "none",
              minHeight: 38,
              maxHeight: 80,
              lineHeight: 1.4,
              WebkitAppearance: "none",
            }}
          />
          <motion.button
            whileTap={!sending && input.trim() ? { scale: 0.9 } : {}}
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              width: 38, height: 38,
              background: sending || !input.trim()
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(135deg, #D4A537, #B8860B)",
              border: "none",
              borderRadius: "50%",
              color: sending || !input.trim() ? "rgba(255,255,255,0.3)" : "#0D0B08",
              cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: !sending && input.trim() ? "0 2px 8px rgba(212,165,55,0.3)" : "none",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s",
            }}
          >
            {sending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={15} />
              </motion.div>
            ) : (
              <Send size={14} style={{ marginLeft: 2 }} />
            )}
          </motion.button>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          padding: "0 4px",
          fontSize: 9,
          color: "rgba(255,255,255,0.3)",
        }}>
          <span>🤫 자리는 다른 손님께 보여요</span>
          <span style={{
            color: inputLength >= 90 ? "rgba(255,150,150,0.9)" : "rgba(212,165,55,0.5)",
            fontWeight: inputLength >= 90 ? 600 : 400,
          }}>
            {inputLength} / 100
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 메시지 버블 컴포넌트
// ─────────────────────────────────────────
function MessageBubble({ message, isMine, onNicknameClick }) {
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleClick = () => {
    if (isMine) return;
    if (onNicknameClick) onNicknameClick(message);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        flexDirection: isMine ? "row-reverse" : "row",
      }}
    >
      <motion.div
        whileHover={!isMine ? { scale: 1.1 } : {}}
        whileTap={!isMine ? { scale: 0.95 } : {}}
        onClick={handleClick}
        style={{
          width: 28, height: 28,
          borderRadius: "50%",
          background: isMine
            ? "rgba(212,165,55,0.12)"
            : "rgba(255,255,255,0.06)",
          border: "1.5px solid " + (isMine ? "rgba(212,165,55,0.6)" : "rgba(212,165,55,0.3)"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
          cursor: isMine ? "default" : "pointer",
          WebkitTapHighlightColor: "transparent",
          transition: "all 0.2s",
        }}
      >
        {message.avatar || "🥃"}
      </motion.div>

      <div style={{
        maxWidth: "70%",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 9,
          flexDirection: isMine ? "row-reverse" : "row",
        }}>
          {isMine ? (
            <>
              <span style={{ color: "#D4A537", fontWeight: 600 }}>나</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{formatTime(message.created_at)}</span>
            </>
          ) : (
            <>
              <span
                onClick={handleClick}
                style={{
                  color: "#D4A537",
                  fontWeight: 600,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {message.nickname || "익명"}
              </span>
              {message.seat_label && (
                <span style={{
                  color: "rgba(212,165,55,0.6)",
                  background: "rgba(212,165,55,0.1)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  fontSize: 8,
                }}>
                  📍{message.seat_label}
                </span>
              )}
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{formatTime(message.created_at)}</span>
            </>
          )}
        </div>

        <div style={{
          padding: "9px 12px",
          background: isMine
            ? "linear-gradient(135deg, rgba(212,165,55,0.2), rgba(180,120,30,0.1))"
            : "rgba(255,255,255,0.06)",
          border: isMine ? "1px solid rgba(212,165,55,0.3)" : "none",
          borderRadius: 14,
          borderBottomRightRadius: isMine ? 4 : 14,
          borderBottomLeftRadius: isMine ? 14 : 4,
          fontSize: 13,
          color: "#F5E6C8",
          lineHeight: 1.4,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}>
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
