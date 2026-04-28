import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Users, Moon, HandMetal, Smile, Clock, X } from "lucide-react";
import { useLocale } from "../lib/LocaleContext";

const STATUS_MAP = {
  open: { label: "대화 환영", color: "#D4A537", icon: <Smile size={12} /> },
  hello: { label: "인사만", color: "#8B7355", icon: <HandMetal size={12} /> },
  alone: { label: "혼자이고 싶음", color: "#4A4035", icon: <Moon size={12} /> },
};

function GlassCard({ children, style, onClick, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
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

export default function LoungeScreen({
  users,
  myId,
  myStatus,
  onSendInvite,
  outgoingInvite,
  onCancelOutgoing,
}) {
  const [filter, setFilter] = useState("all"); // all | open | nearby
  const { locale, t } = useLocale();

  const otherUsers = useMemo(() => users.filter((u) => u.id !== myId), [users, myId]);

  const filtered = useMemo(() => {
    if (filter === "open") return otherUsers.filter((u) => u.status === "open");
    if (filter === "nearby") {
      // 간단: 같은 섹션 (바 좌석 vs 테이블)
      const myIsBar = /바\s*\d/.test(/* 문자열 매칭용 — 실제 seat 전달 필요 */ "");
      return otherUsers; // 단순화: 필터 무시
    }
    return otherUsers;
  }, [otherUsers, filter]);

  return (
    <div
      style={{
        padding: "0 clamp(16px, 4vw, 24px)",
        paddingTop: 16,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.15em",
          color: "rgba(212,165,55,0.5)",
          marginBottom: 6,
        }}
      >
        LOUNGE
      </div>
      <div
        style={{
          fontSize: "clamp(18px, 5vw, 22px)",
          fontWeight: 300,
          color: "#F5E6C8",
          fontFamily: "'Noto Serif KR', serif",
          marginBottom: 16,
        }}
      >
        {locale === "ja" ? "ラウンジ · ザ・ナイン申請" : "라운지 · 더 나인 신청"}
      </div>

      {/* 내 상태 경고 */}
      {myStatus === "alone" && (
        <GlassCard
          delay={0.05}
          style={{
            marginBottom: 14,
            background: "rgba(226,75,74,0.05)",
            borderColor: "rgba(226,75,74,0.18)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,180,180,0.9)",
              lineHeight: 1.6,
            }}
          >
            {locale === "ja" ? (
              <>
                🌙 今 <strong>ひとりでいたい</strong> 状態のため、相手に申請できません。
                <br />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                  ステータスタブで状態を変更してください。
                </span>
              </>
            ) : (
              <>
                🌙 지금 <strong>혼자이고 싶음</strong> 상태라 상대에게 신청할 수 없어요.
                <br />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                  시그널 탭에서 상태를 바꿔주세요.
                </span>
              </>
            )}
          </div>
        </GlassCard>
      )}

      {/* 인원 카운트 */}
      <GlassCard
        delay={0.1}
        style={{
          marginBottom: 14,
          textAlign: "center",
          padding: "clamp(12px, 3.5vw, 16px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
          }}
        >
          <Users size={14} style={{ color: "#D4A537" }} />
          <span>
            <span
              style={{
                color: "#D4A537",
                fontSize: 20,
                fontWeight: 400,
                fontFamily: "'Noto Serif KR', serif",
                marginRight: 4,
              }}
            >
              {otherUsers.length}
            </span>
            {locale === "ja" ? "名のお客様がいらっしゃいます" : "명의 손님이 함께하고 있어요"}
          </span>
        </div>
      </GlassCard>

      {/* 필터 탭 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { id: "all", label: locale === "ja" ? "全員" : "전체" },
          { id: "open", label: locale === "ja" ? "話しかけOK" : "대화 환영" },
        ].map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: "1px solid " + (active ? "rgba(212,165,55,0.35)" : "rgba(255,255,255,0.06)"),
                background: active ? "rgba(212,165,55,0.12)" : "rgba(255,255,255,0.02)",
                color: active ? "#D4A537" : "rgba(255,255,255,0.45)",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                minHeight: 44,
                transition: "all 0.2s",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 유저 리스트 */}
      {filtered.length === 0 ? (
        <GlassCard delay={0.2} style={{ textAlign: "center", padding: "40px 16px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🌙</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            {filter === "open"
              ? (locale === "ja" ? "今、話しかけOKのお客様がいません" : "지금 대화 환영 상태인 손님이 없어요")
              : (locale === "ja" ? "まだ他のお客様はいません" : "아직 다른 손님이 없어요")}
            <br />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              {locale === "ja" ? "少しお待ちください" : "조금 기다려보세요"}
            </span>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((u, i) => {
            const st = STATUS_MAP[u.status] || STATUS_MAP.hello;
            const canInvite =
              myStatus !== "alone" &&
              u.status !== "alone" &&
              !outgoingInvite &&
              !u.inMatch; // ★ 상대가 게임 중이면 못 보냄

            return (
              <GlassCard
                key={u.id}
                delay={0.15 + i * 0.05}
                style={{
                  padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)",
                  opacity: u.inMatch ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(8px, 2.5vw, 12px)",
                  }}
                >
                  {/* 아바타 */}
                  <div
                    style={{
                      width: "clamp(38px, 10vw, 44px)",
                      height: "clamp(38px, 10vw, 44px)",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "clamp(18px, 5vw, 22px)",
                      border: "1.5px solid " + st.color + "30",
                      flexShrink: 0,
                    }}
                  >
                    {u.avatar}
                  </div>

                  {/* 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "clamp(13px, 3.5vw, 14px)",
                          fontWeight: 500,
                          color: "#F5E6C8",
                        }}
                      >
                        {u.nickname}
                      </span>
                      {u.inMatch ? (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: "rgba(226,75,74,0.15)",
                            color: "rgba(255,180,180,0.9)",
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          ⚔️ 대결 중
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: st.color + "18",
                            color: st.color,
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {st.icon} {st.label}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(10px, 2.5vw, 11px)",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 3,
                      }}
                    >
                      {u.seat}
                    </div>
                  </div>

                  {/* 대결 신청 버튼 */}
                  <motion.button
                    whileTap={canInvite ? { scale: 0.9 } : {}}
                    onClick={() => canInvite && onSendInvite(u)}
                    disabled={!canInvite}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid " + (canInvite ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.06)"),
                      background: canInvite
                        ? "linear-gradient(135deg, rgba(212,165,55,0.15), rgba(180,120,30,0.1))"
                        : "rgba(255,255,255,0.02)",
                      color: canInvite ? "#D4A537" : "rgba(255,255,255,0.2)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: canInvite ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      minHeight: 40,
                      WebkitTapHighlightColor: "transparent",
                      flexShrink: 0,
                    }}
                  >
                    <Swords size={13} /> 더 나인
                  </motion.button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* 도움말 */}
      <GlassCard
        delay={0.4}
        style={{
          marginTop: 16,
          background: "rgba(212,165,55,0.03)",
          borderColor: "rgba(212,165,55,0.1)",
          padding: "12px 14px",
        }}
      >
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          💡 <strong style={{ color: "rgba(212,165,55,0.8)" }}>더 나인</strong>은 1~9
          카드로 겨루는 9라운드 심리 게임이에요. 단,{" "}
          <strong style={{ color: "#D4A537" }}>1은 9를 잡는다!</strong>
        </div>
      </GlassCard>

      {/* 보낸 초대 상태 오버레이 */}
      <AnimatePresence>
        {outgoingInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: "rgba(20,15,10,0.95)",
                border: "1px solid rgba(212,165,55,0.25)",
                borderRadius: 18,
                padding: "32px 28px",
                maxWidth: 340,
                width: "100%",
                textAlign: "center",
              }}
            >
              {outgoingInvite.status === "pending" && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ fontSize: 44, marginBottom: 14 }}
                  >
                    ⚔️
                  </motion.div>
                  <div
                    style={{
                      fontSize: 16,
                      color: "#F5E6C8",
                      fontFamily: "'Noto Serif KR', serif",
                      marginBottom: 6,
                    }}
                  >
                    {outgoingInvite.toNickname}님에게
                    <br />
                    대결을 신청했어요
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: 20,
                    }}
                  >
                    <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                    응답을 기다리는 중...
                  </div>
                  <button
                    onClick={onCancelOutgoing}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      minHeight: 40,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <X size={13} /> 취소
                  </button>
                </>
              )}
              {outgoingInvite.status === "declined" && (
                <>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>
                    {outgoingInvite.reason === "busy" ? "⚔️" : "🥀"}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                    {outgoingInvite.reason === "busy"
                      ? `${outgoingInvite.toNickname}님은 지금 다른 대결 중이에요`
                      : `${outgoingInvite.toNickname}님이 지금은 어렵대요`}
                  </div>
                </>
              )}
              {outgoingInvite.status === "timeout" && (
                <>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>⏱</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                    응답이 없어요. 다른 손님을 찾아보세요.
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
