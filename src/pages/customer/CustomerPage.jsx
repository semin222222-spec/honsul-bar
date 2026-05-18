import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Home, Wine, Gamepad2 } from "lucide-react";
import SeatPicker from "@/features/seats/components/SeatPicker";
import CustomerOnboarding from "@/features/sessions/components/CustomerOnboarding";
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
import CatchmindModal from "@/features/games/catchmind/components/CatchmindModal";
import ShieldModal from "@/features/games/shield/components/ShieldModal";
import LiarModal from "@/features/games/liar/components/LiarModal";
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

  const [onboardingDismissedFor, setOnboardingDismissedFor] = useState(null);
  const sessionHasOnboarding = !!(session?.mbti || session?.mood);
  const onboardingMarker = session?.id
    ? `honsul_onboarded_${session.id}`
    : null;
  const onboardingPreviouslyMarked =
    onboardingMarker && typeof window !== "undefined"
      ? !!localStorage.getItem(onboardingMarker)
      : false;
  const needsOnboarding =
    !!session?.id &&
    !sessionHasOnboarding &&
    !onboardingPreviouslyMarked &&
    onboardingDismissedFor !== session.id;

  const handleOnboardingComplete = useCallback(() => {
    if (session?.id && typeof window !== "undefined") {
      try {
        localStorage.setItem(`honsul_onboarded_${session.id}`, "1");
      } catch (e) {
        console.error("[Onboarding] marker save failed:", e);
      }
    }
    setOnboardingDismissedFor(session?.id || null);
  }, [session?.id]);

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
    rerollNickname,
  } = presence;

  const flirting = useFlirtingGame(session?.id, mySeat, myNickname, storeId);

  const { sessions: allSessions } = useStoreSessions(storeId);
  const chat = useChatRoom(storeId, session?.id, mySeat, myNickname, myAvatar);

  const [showFlirtingSeatPicker, setShowFlirtingSeatPicker] = useState(false);
  const [invitingGame, setInvitingGame] = useState(false);
  const [gameSelectTarget, setGameSelectTarget] = useState(null);
  const [showCatchmind, setShowCatchmind] = useState(false);
  const [showShield, setShowShield] = useState(false);
  const [showLiar, setShowLiar] = useState(false);

  const mm = useMatchmaking({ myId, myNickname, myAvatar, mySeat });

  useEffect(() => {
    const timer = setTimeout(() => {
      setInMatchState(!!mm.match);
    }, 0);
    return () => clearTimeout(timer);
  }, [mm.match]);

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

  const handleOpenCatchmind = useCallback(() => {
    setShowCatchmind(true);
  }, []);

  const handleCloseCatchmind = useCallback(() => {
    setShowCatchmind(false);
  }, []);

  const handleOpenShield = useCallback(() => {
    setShowShield(true);
  }, []);

  const handleCloseShield = useCallback(() => {
    setShowShield(false);
  }, []);

  const handleOpenLiar = useCallback(() => {
    setShowLiar(true);
  }, []);

  const handleCloseLiar = useCallback(() => {
    setShowLiar(false);
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
    if (sessionLoading || session || autoSeatTried || !storeId) return;

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
    storeId,
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

  if (needsOnboarding) {
    return (
      <CustomerOnboarding
        storeId={storeId}
        sessionId={session.id}
        seatLabel={mySeat}
        onComplete={handleOnboardingComplete}
      />
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
                  onOpenCatchmind={handleOpenCatchmind}
                  onOpenShield={handleOpenShield}
                  onOpenLiar={handleOpenLiar}
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

      <AnimatePresence>
        {showCatchmind && (
          <CatchmindModal
            open={showCatchmind}
            onClose={handleCloseCatchmind}
            sessionId={session?.id}
            seatLabel={mySeat}
            storeId={storeId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShield && (
          <ShieldModal
            open={showShield}
            onClose={handleCloseShield}
            sessionId={session?.id}
            seatLabel={mySeat}
            storeId={storeId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLiar && (
          <LiarModal
            open={showLiar}
            onClose={handleCloseLiar}
            sessionId={session?.id}
            seatLabel={mySeat}
            storeId={storeId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
