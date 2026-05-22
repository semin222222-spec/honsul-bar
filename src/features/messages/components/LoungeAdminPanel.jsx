import { useState, useRef, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Loader2, Send, MapPin } from "lucide-react";
import {
  isOwnerMessage,
  buildMentionPrefix,
} from "@/features/messages/lib/loungeMessage";

/**
 * LoungeAdminPanel - 어드민 익명 라운지 (채팅형)
 *
 * - 오래된 글이 위, 최신이 아래 (채팅 앱과 동일) · 새 글 오면 자동 스크롤
 * - 하단 고정 입력창으로 사장님이 글/답글 작성 (author_type='owner')
 * - 사장님 글은 우측 골드 버블, 손님 글은 좌측 + 자리(📍) 표시
 * - 손님 글 탭 → 입력창에 @닉네임 멘션 prefill
 * - 글이 많아도 가볍도록 메시지별 타이머 없이 렌더 시 시각 1회 계산
 */

const ACCENT = "#C47AFF";
const GOLD = "#D4A537";
const OWNER_MAX_LEN = 200;

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function OwnerBubble({ msg }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
      <div style={{ maxWidth: "78%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 5,
            fontSize: 10,
            marginBottom: 3,
          }}
        >
          <span style={{ color: GOLD, fontWeight: 700 }}>
            ✨ {msg.nickname || "사장님"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>
            {formatTime(msg.created_at)}
          </span>
        </div>
        <div
          style={{
            padding: "9px 13px",
            background:
              "linear-gradient(135deg, rgba(212,165,55,0.28), rgba(180,120,30,0.16))",
            border: "1px solid rgba(212,165,55,0.45)",
            borderRadius: 14,
            borderBottomRightRadius: 4,
            fontSize: 13,
            color: "#FFF4D8",
            lineHeight: 1.5,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function CustomerBubble({ msg, onMention }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          border: "1.5px solid " + ACCENT + "40",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        {msg.avatar || "🥃"}
      </div>
      <div style={{ maxWidth: "78%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            fontSize: 10,
            marginBottom: 3,
          }}
        >
          <button
            onClick={() => onMention(msg.nickname)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: GOLD,
              fontWeight: 600,
              fontFamily: "inherit",
              fontSize: 10,
            }}
            title="이 손님에게 답글 (@멘션)"
          >
            {msg.nickname || "익명"}
          </button>
          {msg.seat_label && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                padding: "1px 6px",
                borderRadius: 5,
                background: ACCENT + "1F",
                color: ACCENT,
                fontWeight: 600,
              }}
            >
              <MapPin size={9} />
              {msg.seat_label}
            </span>
          )}
          <span style={{ color: "rgba(255,255,255,0.3)" }}>
            {formatTime(msg.created_at)}
          </span>
        </div>
        <div
          onClick={() => onMention(msg.nickname)}
          style={{
            padding: "9px 13px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            borderBottomLeftRadius: 4,
            fontSize: 13,
            color: "#F5E6C8",
            lineHeight: 1.5,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            cursor: "pointer",
          }}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

export default function LoungeAdminPanel({
  messages = [],
  loading = false,
  sending = false,
  onSendOwnerMessage,
}) {
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const prevLenRef = useRef(0);

  // 오래된 글 위 → 최신 아래
  const ordered = [...messages].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );

  // 새 글이 오면 맨 아래로 스크롤
  useEffect(() => {
    if (ordered.length > prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLenRef.current = ordered.length;
  }, [ordered.length]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(""), 2500);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const handleMention = (nickname) => {
    const prefix = buildMentionPrefix(nickname);
    if (!prefix) return;
    setInput((prev) => (prev.startsWith(prefix) ? prev : prefix + prev));
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const result = await onSendOwnerMessage(trimmed);
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

  const inputLength = input.length;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(212,165,55,0.12)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        style={{
          height: "clamp(300px, 52vh, 480px)",
          overflowY: "auto",
          padding: "12px 14px",
          background: "rgba(0,0,0,0.2)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: ACCENT + "99",
            }}
          >
            <Motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 size={28} />
            </Motion.div>
          </div>
        ) : ordered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              padding: "0 20px",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
            <div
              style={{
                fontSize: 14,
                marginBottom: 4,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              아직 라운지 대화가 없어요
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              먼저 인사를 건네보세요 — 손님에게 바로 전달돼요
            </div>
          </div>
        ) : (
          ordered.map((msg) =>
            isOwnerMessage(msg) ? (
              <OwnerBubble key={msg.id} msg={msg} />
            ) : (
              <CustomerBubble key={msg.id} msg={msg} onMention={handleMention} />
            ),
          )
        )}
      </div>

      {/* 입력 영역 (하단 고정) */}
      <div
        style={{
          padding: "10px 12px",
          background: "rgba(255,255,255,0.02)",
          borderTop: "1px solid rgba(212,165,55,0.12)",
          position: "relative",
        }}
      >
        {errorMsg && (
          <Motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "absolute",
              top: -32,
              left: 12,
              right: 12,
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
          </Motion.div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length <= OWNER_MAX_LEN) setInput(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder="✨ 사장님으로 답글 남기기..."
            rows={1}
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.4)",
              border:
                "1px solid " +
                (inputLength >= OWNER_MAX_LEN - 10
                  ? "rgba(226,75,74,0.4)"
                  : "rgba(212,165,55,0.25)"),
              borderRadius: 16,
              padding: "9px 13px",
              color: "#F5E6C8",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              resize: "none",
              minHeight: 38,
              maxHeight: 90,
              lineHeight: 1.4,
              WebkitAppearance: "none",
            }}
          />
          <Motion.button
            whileTap={!sending && input.trim() ? { scale: 0.9 } : {}}
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              width: 38,
              height: 38,
              background:
                sending || !input.trim()
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
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {sending ? (
              <Motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={15} />
              </Motion.div>
            ) : (
              <Send size={14} style={{ marginLeft: 2 }} />
            )}
          </Motion.button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 5,
            padding: "0 4px",
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          <span>손님 글을 누르면 @멘션이 채워져요</span>
          <span
            style={{
              color:
                inputLength >= OWNER_MAX_LEN - 10
                  ? "rgba(255,150,150,0.9)"
                  : "rgba(212,165,55,0.5)",
            }}
          >
            {inputLength} / {OWNER_MAX_LEN}
          </span>
        </div>
      </div>
    </div>
  );
}
