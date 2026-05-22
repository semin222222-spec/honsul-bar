import { motion as Motion } from "framer-motion";
import { Loader2, MapPin } from "lucide-react";

/**
 * LoungeAdminPanel - 어드민 익명 라운지 글 목록 (읽기 전용)
 *
 * - 최신 글이 위로 (주문 탭과 동일 방향)
 * - 닉네임 · 자리 · 작성 시간 · 내용 표시
 *   (자리 정보는 손님 화면에선 숨겨지지만 사장님에겐 보여줌)
 * - 글이 많이 쌓여도 가볍도록 카드별 타이머 없이 렌더 시 시각 1회 계산
 */

const ACCENT = "#C47AFF";

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
}

function LoungeCard({ msg }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 8,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid " + ACCENT + "33",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        {msg.avatar || "🥃"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 5,
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 600, color: "#D4A537" }}
          >
            {msg.nickname || "익명"}
          </span>
          {msg.seat_label && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: ACCENT + "1F",
                color: ACCENT,
              }}
            >
              <MapPin size={10} />
              {msg.seat_label}
            </span>
          )}
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            {timeAgo(msg.created_at)}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#F5E6C8",
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

export default function LoungeAdminPanel({ messages = [], loading = false }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-block", color: ACCENT + "66" }}
        >
          <Loader2 size={32} />
        </Motion.div>
      </div>
    );
  }

  const sorted = [...messages].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  if (sorted.length === 0) {
    return (
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: "center", padding: "60px 20px" }}
      >
        <div style={{ fontSize: 44, marginBottom: 16 }}>💬</div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 300,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'Noto Serif KR', serif",
            marginBottom: 6,
          }}
        >
          아직 라운지 글이 없어요
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          손님이 라운지에 글을 남기면 여기에서 바로 보여드릴게요
        </div>
      </Motion.div>
    );
  }

  return (
    <div>
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
        <span>최근 12시간</span>
        <span>총 {sorted.length}건</span>
      </div>
      {sorted.map((msg) => (
        <LoungeCard key={msg.id} msg={msg} />
      ))}
    </div>
  );
}
