import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Wine,
  Gamepad2,
  HandMetal,
  Sparkles,
  Smile,
  Moon,
  ChevronRight,
  Check,
  Swords,
} from "lucide-react";
import SeatPicker from "@/features/seats/components/SeatPicker";
import MenuScreen from "@/features/menus/components/MenuScreen";
import ThankYouScreen from "@/shared/ui/ThankYouScreen";
import AmbientBG from "@/shared/ui/AmbientBG";
import GameCenter from "@/features/games/components/GameCenter";
import GameSelectModal from "@/features/games/components/GameSelectModal";
import WhiskyNine from "@/features/games/whisky-nine/components/WhiskyNine";
import MatchInviteModal from "@/features/games/whisky-nine/components/MatchInviteModal";
import MyProfileCard from "@/features/presence/components/MyProfileCard";
import ChatRoom from "@/features/messages/components/ChatRoom";
import FlirtingSeatPicker from "@/features/games/flirting/components/FlirtingSeatPicker";
import FlirtingGameModal from "@/features/games/flirting/components/FlirtingGameModal";
import IncomingFlirtingModal from "@/features/games/flirting/components/IncomingFlirtingModal";
import { usePresence } from "@/features/presence/hooks/usePresence";
import { useMatchmaking } from "@/features/games/whisky-nine/hooks/useMatchmaking";
import { useSession } from "@/features/sessions/hooks/useSession";
import { useOrders } from "@/features/orders/hooks/useOrders";
import { useMenus } from "@/features/menus/hooks/useMenus";
import { useMenuOptionsCustomer } from "@/features/menus/hooks/useMenuOptionsCustomer";
import { useChatRoom } from "@/features/messages/hooks/useChatRoom";
import { useFlirtingGame } from "@/features/games/flirting/hooks/useFlirtingGame";
import { useStoreSessions } from "@/features/sessions/hooks/useStoreSessions";
import { useStoreId, useStore } from "@/shared/store/StoreContext";
import { useLocale, pickLocaleField } from "@/shared/i18n/LocaleContext";
import LanguageToggle from "@/shared/ui/LanguageToggle";
import { orderRepository } from "@/repositories/orders/orderRepository";

const STATUS_MAP = {
  open: {
    label: "대화 환영",
    labelJa: "話しかけOK",
    color: "#D4A537",
    icon: <Smile size={14} />,
  },
  hello: {
    label: "인사만",
    labelJa: "挨拶のみ",
    color: "#8B7355",
    icon: <HandMetal size={14} />,
  },
  alone: {
    label: "혼자이고 싶음",
    labelJa: "ひとりで",
    color: "#4A4035",
    icon: <Moon size={14} />,
  },
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
  if (!animate)
    return (
      <div style={base} onClick={onClick}>
        {children}
      </div>
    );
  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={base}
      onClick={onClick}
    >
      {children}
    </Motion.div>
  );
}

function PulseDot({ color = "#D4A537", size = 8 }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: size,
        height: size,
      }}
    >
      <Motion.span
        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          position: "relative",
        }}
      />
    </span>
  );
}

function TabBar({ active, onChange }) {
  const { t } = useLocale();
  const tabs = [
    { id: "hub", icon: Home, label: t("tabs.hub") },
    { id: "menu", icon: Wine, label: t("tabs.menu") },
    { id: "game", icon: Gamepad2, label: t("tabs.game") },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(13,11,8,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingTop: 12,
        paddingLeft: 8,
        paddingRight: 8,
      }}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <Motion.button
            key={t.id}
            onClick={() => onChange(t.id)}
            whileTap={{ scale: 0.92 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              minWidth: 72,
              minHeight: 62,
              borderRadius: 14,
              position: "relative",
              color: isActive ? "#0D0B08" : "rgba(255,255,255,0.5)",
              background: isActive
                ? "linear-gradient(135deg, #FFD700, #D4A537)"
                : "transparent",
              boxShadow: isActive ? "0 4px 12px rgba(212,165,55,0.3)" : "none",
              transition: "background 0.3s, color 0.3s, box-shadow 0.3s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Icon size={28} strokeWidth={isActive ? 2.5 : 1.5} />
            <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>
              {t.label}
            </span>
          </Motion.button>
        );
      })}
    </div>
  );
}

function HubScreen({
  userCount,
  myStatus,
  onGoTo,
  users,
  mySeat,
  myNickname,
  myNicknameJa,
  myAvatar,
  onReroll,
  store,
  chat,
  mySessionId,
  onNicknameClick,
}) {
  const { locale, t } = useLocale();
  const greetings = t("home.greetings");
  const [gi, setGi] = useState(0);
  useEffect(() => {
    const iv = setInterval(
      () =>
        setGi(
          (p) => (p + 1) % (Array.isArray(greetings) ? greetings.length : 1),
        ),
      5000,
    );
    return () => clearInterval(iv);
  }, [greetings]);
  const statusCounts = { open: 0, hello: 0, alone: 0 };
  users.forEach((u) => {
    if (statusCounts[u.status] !== undefined) statusCounts[u.status]++;
  });

  const storeName = pickLocaleField(store, "name", locale) || "오늘, 혼술";

  return (
    <div
      style={{
        padding: "0 clamp(16px, 4vw, 24px)",
        paddingTop: "clamp(12px, 3vw, 20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 8,
        }}
      >
        <LanguageToggle variant="compact" />
      </div>

      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: "center", marginBottom: "clamp(16px, 5vw, 28px)" }}
      >
        <Motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            fontSize: "clamp(20px, 5.5vw, 26px)",
            color: "#D4A537",
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 500,
            letterSpacing: "0.02em",
            marginBottom: 10,
          }}
        >
          {storeName}
        </Motion.div>
        <div
          style={{
            fontSize: "clamp(10px, 2.5vw, 12px)",
            letterSpacing: "0.12em",
            color: "rgba(212,165,55,0.4)",
            marginBottom: 18,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {t("home.subtitle")}
        </div>
        <div
          style={{
            fontSize: "clamp(22px, 6vw, 28px)",
            fontWeight: 300,
            color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif",
            lineHeight: 1.3,
          }}
        >
          <AnimatePresence mode="wait">
            <Motion.span
              key={gi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              style={{ display: "block" }}
            >
              {Array.isArray(greetings) ? greetings[gi] : ""}
            </Motion.span>
          </AnimatePresence>
        </div>
      </Motion.div>

      <MyProfileCard
        nickname={myNickname}
        nicknameJa={myNicknameJa}
        avatar={myAvatar}
        seat={mySeat}
        onReroll={onReroll}
        delay={0.05}
      />

      <ChatRoom
        messages={chat.messages}
        sending={chat.sending}
        mySessionId={mySessionId}
        onSendMessage={chat.sendMessage}
        onNicknameClick={onNicknameClick}
        loading={chat.loading}
        activeUserCount={userCount}
      />

      <GlassCard
        delay={0.1}
        style={{
          textAlign: "center",
          padding: "clamp(14px, 4vw, 20px)",
          marginBottom: "clamp(10px, 3vw, 16px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <PulseDot />
          <span
            style={{
              fontSize: "clamp(11px, 3vw, 13px)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {t("home.atBar")}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Motion.span
            key={userCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: "clamp(36px, 10vw, 48px)",
              fontWeight: 200,
              color: "#D4A537",
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            {userCount}
          </Motion.span>
          <span
            style={{
              fontSize: "clamp(12px, 3.5vw, 15px)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {t("home.peopleHere")}
          </span>
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            gap: "clamp(10px, 3vw, 16px)",
            fontSize: 12,
          }}
        >
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <span
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: v.color,
              }}
            >
              {v.icon} <span>{statusCounts[k]}</span>
            </span>
          ))}
        </div>
      </GlassCard>

      <GlassCard delay={0.2} style={{ marginBottom: "clamp(10px, 3vw, 16px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                marginBottom: 4,
              }}
            >
              {locale === "ja" ? "ステータス" : "나의 시그널"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: STATUS_MAP[myStatus].color,
                  boxShadow: "0 0 8px " + STATUS_MAP[myStatus].color + "60",
                }}
              />
              <span
                style={{
                  color: "#F5E6C8",
                  fontSize: "clamp(13px, 3.5vw, 15px)",
                  fontWeight: 500,
                }}
              >
                {locale === "ja"
                  ? STATUS_MAP[myStatus].labelJa
                  : STATUS_MAP[myStatus].label}
              </span>
            </div>
          </div>
          <button
            onClick={() => onGoTo("status")}
            style={{
              background: "rgba(212,165,55,0.12)",
              border: "1px solid rgba(212,165,55,0.2)",
              borderRadius: 10,
              padding: "8px 14px",
              color: "#D4A537",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              minHeight: 44,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {locale === "ja" ? "変更" : "변경"} <ChevronRight size={14} />
          </button>
        </div>
      </GlassCard>

      <div style={{ marginBottom: "clamp(10px, 3vw, 16px)" }}>
        {[
          {
            label: locale === "ja" ? "対戦申請" : "대결 신청",
            sub: locale === "ja" ? "ザ・ナイン 1:1" : "더 나인 1:1",
            icon: <Swords size={20} />,
            tab: "game",
            delay: 0.3,
          },
        ].map((item) => (
          <GlassCard
            key={item.tab}
            delay={item.delay}
            onClick={() => onGoTo(item.tab)}
            style={{
              cursor: "pointer",
              padding: "clamp(14px, 4vw, 18px) clamp(14px, 4vw, 18px)",
              minHeight: 44,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ color: "#D4A537", flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "clamp(13px, 3.5vw, 15px)",
                    fontWeight: 500,
                    color: "#F5E6C8",
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "clamp(10px, 2.5vw, 11px)",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  {item.sub}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard
        delay={0.4}
        style={{
          background: "rgba(212,165,55,0.04)",
          borderColor: "rgba(212,165,55,0.1)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Sparkles
            size={16}
            style={{ color: "#D4A537", marginTop: 2, flexShrink: 0 }}
          />
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#D4A537",
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {locale === "ja" ? "今日のヒント" : "오늘의 팁"}
            </div>
            <div
              style={{
                fontSize: "clamp(12px, 3vw, 13px)",
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.6,
              }}
            >
              {locale === "ja" ? (
                <>
                  バーテンダーに「おまかせ一杯」と言ってみてください。会話のきっかけになります。
                </>
              ) : (
                <>
                  바텐더에게 "추천 한 잔"이라고 말해보세요. 대화의 시작이
                  됩니다.
                </>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function StatusScreen({ myStatus, setMyStatus, users, myId }) {
  const otherUsers = users.filter((u) => u.id !== myId);
  const { locale } = useLocale();
  const statusDescs = {
    open:
      locale === "ja"
        ? "誰でもお気軽にお声がけください"
        : "누구든 편하게 말 걸어주세요",
    hello: locale === "ja" ? "軽い挨拶程度ならOK" : "가벼운 인사 정도는 OK",
    alone:
      locale === "ja" ? "静かに過ごしたいです" : "조용히 시간을 보내고 싶어요",
  };
  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.15em",
          color: "rgba(212,165,55,0.5)",
          marginBottom: 6,
        }}
      >
        SOCIAL SIGNAL
      </div>
      <div
        style={{
          fontSize: "clamp(18px, 5vw, 22px)",
          fontWeight: 300,
          color: "#F5E6C8",
          fontFamily: "'Noto Serif KR', serif",
          marginBottom: 24,
        }}
      >
        {locale === "ja" ? "ステータス設定" : "나의 시그널 설정"}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {Object.entries(STATUS_MAP).map(([key, val], i) => {
          const active = myStatus === key;
          return (
            <GlassCard
              key={key}
              delay={i * 0.08}
              onClick={() => setMyStatus(key)}
              style={{
                cursor: "pointer",
                padding: "clamp(12px, 3.5vw, 16px) clamp(14px, 4vw, 18px)",
                borderColor: active
                  ? val.color + "50"
                  : "rgba(255,255,255,0.07)",
                background: active
                  ? val.color + "10"
                  : "rgba(255,255,255,0.04)",
                minHeight: 44,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(8px, 2.5vw, 12px)",
                  }}
                >
                  <Motion.div
                    animate={active ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    style={{
                      width: "clamp(32px, 8vw, 36px)",
                      height: "clamp(32px, 8vw, 36px)",
                      borderRadius: 12,
                      background: val.color + (active ? "25" : "10"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: val.color,
                    }}
                  >
                    {val.icon}
                  </Motion.div>
                  <div>
                    <div
                      style={{
                        fontSize: "clamp(13px, 3.5vw, 15px)",
                        fontWeight: 500,
                        color: active ? val.color : "#F5E6C8",
                      }}
                    >
                      {locale === "ja" ? val.labelJa : val.label}
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(10px, 2.5vw, 11px)",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                      }}
                    >
                      {statusDescs[key]}
                    </div>
                  </div>
                </div>
                {active && (
                  <Motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Check size={18} style={{ color: val.color }} />
                  </Motion.div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            color: "rgba(212,165,55,0.5)",
          }}
        >
          {locale === "ja" ? "今このバーにいる人たち" : "지금 바에 있는 사람들"}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(212,165,55,0.4)",
            background: "rgba(212,165,55,0.08)",
            padding: "2px 8px",
            borderRadius: 8,
          }}
        >
          {otherUsers.length}
          {locale === "ja" ? "名" : "명"}
        </span>
      </div>
      {otherUsers.length === 0 ? (
        <GlassCard
          delay={0.3}
          style={{ textAlign: "center", padding: "30px 16px" }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌙</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            {locale === "ja"
              ? "まだ他のお客様はいません"
              : "아직 다른 손님이 없어요"}
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {otherUsers.map((u, i) => {
            const st = STATUS_MAP[u.status] || STATUS_MAP.hello;
            return (
              <GlassCard
                key={u.id}
                delay={0.3 + i * 0.06}
                style={{
                  padding: "clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(8px, 2.5vw, 12px)",
                  }}
                >
                  <div
                    style={{
                      width: "clamp(36px, 9vw, 40px)",
                      height: "clamp(36px, 9vw, 40px)",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "clamp(16px, 4.5vw, 20px)",
                      border: "1.5px solid " + st.color + "30",
                    }}
                  >
                    {u.avatar}
                  </div>
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
                          fontSize: "clamp(12px, 3.5vw, 14px)",
                          fontWeight: 500,
                          color: "#F5E6C8",
                        }}
                      >
                        {u.nickname}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: st.color + "18",
                          color: st.color,
                          fontWeight: 500,
                        }}
                      >
                        {st.label}
                      </span>
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
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecoveryModal({ prompt, onRecover, onCancel }) {
  if (!prompt) return null;
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        style={{
          background:
            "linear-gradient(135deg, rgba(40,30,20,0.98), rgba(20,15,10,0.98))",
          border: "1px solid rgba(212,165,55,0.3)",
          borderRadius: 16,
          padding: "24px 20px",
          maxWidth: 360,
          width: "100%",
          color: "#F5E6C8",
          fontFamily: "'Pretendard', -apple-system, sans-serif",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔄</div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "#D4A537",
              fontFamily: "'Noto Serif KR', serif",
              marginBottom: 6,
            }}
          >
            혹시 이전에 사용하던 자리세요?
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#D4A537" }}>{prompt.seatLabel}</strong>{" "}
            자리에
            <br />
            조금 전까지 사용 중이던 세션이 있어요.
          </div>
        </div>

        <div
          style={{
            background: "rgba(212,165,55,0.08)",
            border: "1px solid rgba(212,165,55,0.15)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 18,
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.5,
          }}
        >
          💡 실수로 사이트를 나가셨거나 사파리가 종료됐을 수 있어요.
          <br />
          본인이라면 <strong style={{ color: "#D4A537" }}>"네, 재입장"</strong>
          을 눌러주세요.
          <br />
          본인이 아니라면 사장님께 문의해주세요.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onRecover}
            style={{
              background: "linear-gradient(135deg, #D4A537, #B8902F)",
              color: "#0D0B08",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 48,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            네, 재입장 할게요
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "12px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              minHeight: 44,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            아니요, 다른 자리 선택
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

export default function App() {
  const [tab, setTab] = useState("hub");
  const [inMatchState, setInMatchState] = useState(false);
  const storeId = useStoreId();
  const { store } = useStore();

  const [myId] = useState(() => {
    let id = localStorage.getItem("honsul_customer_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("honsul_customer_id", id);
    }
    return id;
  });

  const {
    session,
    loading: sessionLoading,
    createSession,
    takeoverSession,
    justSettled,
    seatMoveNotice,
    dismissSeatMove,
  } = useSession({
    myId,
    myNickname: null,
    myAvatar: null,
    storeId,
  });

  const [recoveryPrompt, setRecoveryPrompt] = useState(null);

  const [settledOrders, setSettledOrders] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!justSettled?.id || !storeId) {
        setSettledOrders([]);
        return;
      }
      orderRepository
        .listSessionOrders({
          storeId,
          sessionId: justSettled.id,
        })
        .then((data) => {
          if (cancelled) return;
          setSettledOrders(data || []);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [justSettled?.id, storeId]);

  const mySeat = session?.seat_label || null;

  const { orders, totalAmount, createOrder } = useOrders(
    session?.id,
    mySeat,
    storeId,
  );

  const {
    categories: menuCategories,
    menus: menuItems,
    loading: menusLoading,
  } = useMenus(storeId);
  const { optionsByMenu } = useMenuOptionsCustomer(storeId);

  const presence = usePresence(mySeat, inMatchState, {
    myId,
    initialNickname: session?.nickname,
    initialNicknameJa: session?.nickname_ja,
    initialAvatar: session?.avatar,
  });
  const {
    users,
    userCount,
    myNickname,
    myNicknameJa,
    myAvatar,
    myStatus,
    setMyStatus,
    rerollNickname,
  } = presence;

  const flirting = useFlirtingGame(session?.id, mySeat, myNickname, storeId);

  const { sessions: allSessions } = useStoreSessions(storeId);
  const chat = useChatRoom(storeId, session?.id, mySeat, myNickname, myAvatar);

  const [showFlirtingSeatPicker, setShowFlirtingSeatPicker] = useState(false);
  const [invitingGame, setInvitingGame] = useState(false);
  const [gameSelectTarget, setGameSelectTarget] = useState(null);

  const mm = useMatchmaking({ myId, myNickname, myAvatar, mySeat });

  useEffect(() => {
    const timer = setTimeout(() => {
      setInMatchState(!!mm.match);
    }, 0);
    return () => clearTimeout(timer);
  }, [mm.match]);

  const handleStatusChange = useCallback(
    (s) => {
      setMyStatus(s);
    },
    [setMyStatus],
  );

  const handleSeatSelect = useCallback(
    async (seatLabel) => {
      const result = await createSession(seatLabel);
      if (!result.ok) {
        if (result.recoverable && result.existingSession) {
          setRecoveryPrompt({
            seatLabel,
            existingSession: result.existingSession,
          });
          return false;
        }
        alert(result.message);
        return false;
      }
      return true;
    },
    [createSession],
  );

  const handleRecoverSession = useCallback(async () => {
    if (!recoveryPrompt) return;
    const result = await takeoverSession(
      recoveryPrompt.existingSession.id,
      recoveryPrompt.seatLabel,
    );
    setRecoveryPrompt(null);
    if (!result.ok) {
      alert(result.message || "재입장에 실패했어요. 사장님께 문의해주세요.");
    }
  }, [recoveryPrompt, takeoverSession]);

  const handleCancelRecovery = useCallback(() => {
    setRecoveryPrompt(null);
  }, []);

  const handleOpenFlirting = useCallback(() => {
    setShowFlirtingSeatPicker(true);
  }, []);

  const handleFlirtingSelect = useCallback(
    async (targetSession) => {
      setInvitingGame(true);
      const result = await flirting.inviteGame(targetSession);
      setInvitingGame(false);
      if (result.ok) {
        setShowFlirtingSeatPicker(false);
      } else {
        alert(result.error || "신청에 실패했어요. 다시 시도해주세요.");
      }
    },
    [flirting],
  );

  const handleCloseFlirtingPicker = useCallback(() => {
    if (invitingGame) return;
    setShowFlirtingSeatPicker(false);
  }, [invitingGame]);

  const handleNicknameClick = useCallback(
    (message) => {
      if (message.session_id === session?.id) return;
      setGameSelectTarget(message);
    },
    [session?.id],
  );

  const handleSelectFlirting = useCallback(async () => {
    if (!gameSelectTarget) return;

    // 채팅 메시지의 session_id는 상대가 재입장하면 바뀌어 있을 수 있으니
    // seat_label로도 한 번 더 찾아본다. 못 찾으면 라이브 세션이 없는 것.
    const targetSession =
      allSessions.find((s) => s.id === gameSelectTarget.session_id) ||
      (gameSelectTarget.seat_label
        ? allSessions.find(
            (s) => s.seat_label === gameSelectTarget.seat_label,
          )
        : null);

    if (!targetSession) {
      setGameSelectTarget(null);
      alert("상대방을 찾을 수 없어요. 자리를 비웠을 수도 있어요.");
      return;
    }

    setGameSelectTarget(null);
    setInvitingGame(true);
    const result = await flirting.inviteGame(targetSession);
    setInvitingGame(false);

    if (!result.ok) {
      alert(result.error || "신청에 실패했어요");
    }
  }, [gameSelectTarget, allSessions, flirting]);

  const handleSelectNine = useCallback(() => {
    if (!gameSelectTarget) return;

    const targetSession = allSessions.find(
      (s) => s.id === gameSelectTarget.session_id,
    );

    if (!targetSession) {
      alert("상대방을 찾을 수 없어요. 자리를 비웠을 수도 있어요.");
      setGameSelectTarget(null);
      return;
    }

    const targetUser = users.find((u) => u.seat === targetSession.seat_label);

    if (!targetUser) {
      alert("상대방이 게임을 받을 수 없는 상태예요.");
      setGameSelectTarget(null);
      return;
    }

    setGameSelectTarget(null);
    mm.sendInvite(targetUser);
  }, [gameSelectTarget, allSessions, users, mm]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [autoSeatTried, setAutoSeatTried] = useState(false);

  useEffect(() => {
    if (sessionLoading || session || autoSeatTried) return;

    const seatFromUrl = searchParams.get("seat");
    if (!seatFromUrl) return;

    const timer = setTimeout(() => {
      setAutoSeatTried(true);

      const valid = /^[A-Za-z가-힣]+-\d{1,3}$/.test(seatFromUrl);
      if (!valid) {
        setSearchParams({});
        return;
      }

      handleSeatSelect(seatFromUrl).then(() => {
        setSearchParams({});
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [
    sessionLoading,
    session,
    autoSeatTried,
    searchParams,
    setSearchParams,
    handleSeatSelect,
  ]);

  if (sessionLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0D0B08",
          color: "#F5E6C8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Pretendard', -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.15em",
            }}
          >
            잠시만요...
          </div>
        </div>
      </div>
    );
  }

  if (justSettled) {
    const settledTotal = settledOrders.reduce(
      (sum, o) => sum + (o.price || 0),
      0,
    );
    return (
      <ThankYouScreen
        orders={settledOrders}
        totalAmount={settledTotal}
        nickname={justSettled.nickname}
        seat={justSettled.seat_label}
      />
    );
  }

  if (!mySeat) {
    return (
      <>
        <SeatPicker onSelect={handleSeatSelect} />
        <AnimatePresence>
          {recoveryPrompt && (
            <RecoveryModal
              prompt={recoveryPrompt}
              onRecover={handleRecoverSession}
              onCancel={handleCancelRecovery}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  const inMatch = !!mm.match;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        position: "relative",
        background: "#0D0B08",
        color: "#F5E6C8",
        fontFamily: "var(--font-sans)",
        overflowX: "hidden",
      }}
    >
      <AmbientBG />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingBottom: "calc(82px + max(8px, env(safe-area-inset-bottom)))",
        }}
      >
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
            <Motion.div
              key={tab}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                const swipeThreshold = 80;
                const tabOrder = ["hub", "menu", "game"];
                const currentIdx = tabOrder.indexOf(tab);
                if (currentIdx === -1) return;

                if (
                  info.offset.x < -swipeThreshold &&
                  currentIdx < tabOrder.length - 1
                ) {
                  setTab(tabOrder[currentIdx + 1]);
                } else if (info.offset.x > swipeThreshold && currentIdx > 0) {
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
                  myNicknameJa={myNicknameJa}
                  myAvatar={myAvatar}
                  onReroll={rerollNickname}
                  store={store}
                  chat={chat}
                  mySessionId={session?.id}
                  onNicknameClick={handleNicknameClick}
                />
              )}
              {tab === "status" && (
                <StatusScreen
                  myStatus={myStatus}
                  setMyStatus={handleStatusChange}
                  users={users}
                  myId={myId}
                />
              )}
              {tab === "menu" && (
                <MenuScreen
                  createOrder={createOrder}
                  orders={orders}
                  totalAmount={totalAmount}
                  mySeat={mySeat}
                  categories={menuCategories}
                  menus={menuItems}
                  optionsByMenu={optionsByMenu}
                  loading={menusLoading}
                  wifiSsid={store?.wifi_ssid}
                  wifiPassword={store?.wifi_password}
                />
              )}
              {tab === "game" && (
                <GameCenter
                  users={users}
                  myId={myId}
                  myNickname={myNickname}
                  myNicknameJa={myNicknameJa}
                  myAvatar={myAvatar}
                  mySeat={mySeat}
                  myStatus={myStatus}
                  onReroll={rerollNickname}
                  onSendInvite={mm.sendInvite}
                  outgoingInvite={mm.outgoingInvite}
                  onCancelOutgoing={mm.cancelOutgoing}
                  onOpenFlirting={handleOpenFlirting}
                />
              )}
            </Motion.div>
          </AnimatePresence>
        )}
      </div>
      {/* SOS 요청은 운영 안정화 전까지 임시 비활성화한다. */}

      <AnimatePresence>
        {seatMoveNotice && (
          <Motion.div
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
              background:
                "linear-gradient(135deg, rgba(100,180,220,0.95), rgba(60,120,180,0.92))",
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
                <div
                  style={{
                    fontSize: 13,
                    color: "#fff",
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                >
                  자리가 변경되었어요
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                  📍 <strong>{seatMoveNotice.from}</strong> →{" "}
                  <strong>{seatMoveNotice.to}</strong>
                </div>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recoveryPrompt && (
          <RecoveryModal
            prompt={recoveryPrompt}
            onRecover={handleRecoverSession}
            onCancel={handleCancelRecovery}
          />
        )}
      </AnimatePresence>

      {!inMatch && <TabBar active={tab} onChange={setTab} />}

      <MatchInviteModal
        invite={mm.incomingInvite}
        onAccept={mm.acceptInvite}
        onDecline={mm.declineInvite}
      />

      <AnimatePresence>
        {showFlirtingSeatPicker && (
          <FlirtingSeatPicker
            mySeatLabel={mySeat}
            sessions={allSessions}
            onSelect={handleFlirtingSelect}
            onCancel={handleCloseFlirtingPicker}
            loading={invitingGame}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flirting.currentGame && (
          <FlirtingGameModal
            game={flirting.currentGame}
            myChoices={flirting.myChoices}
            opponentChoices={flirting.opponentChoices}
            gameResult={flirting.gameResult}
            isInviter={flirting.isInviter}
            mySeatLabel={mySeat}
            onSubmitChoice={flirting.submitChoice}
            onNextRound={flirting.goToNextRound}
            onCancelInvite={() =>
              flirting.cancelInvite(flirting.currentGame.id)
            }
            onClose={flirting.closeGame}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flirting.incomingGame && !flirting.currentGame && (
          <IncomingFlirtingModal
            game={flirting.incomingGame}
            onAccept={() => flirting.acceptGame(flirting.incomingGame.id)}
            onDecline={() => flirting.declineGame(flirting.incomingGame.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameSelectTarget && (
          <GameSelectModal
            target={gameSelectTarget}
            onSelectFlirting={handleSelectFlirting}
            onSelectNine={handleSelectNine}
            onClose={() => setGameSelectTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
