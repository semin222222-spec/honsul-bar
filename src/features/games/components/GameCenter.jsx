import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import StackingGame from "@/features/games/stacking/components/StackingGame";
import LoungeScreen from "@/features/presence/components/LoungeScreen";
import MyProfileCard from "@/features/presence/components/MyProfileCard";
import QuestionCard from "@/features/games/components/QuestionCard";
import { useLocale } from "@/shared/i18n/LocaleContext";

export default function GameCenter({
  users,
  myId,
  myNickname,
  myNicknameJa,
  myAvatar,
  mySeat,
  myStatus,
  onReroll,
  onSendInvite,
  outgoingInvite,
  onCancelOutgoing,
  onOpenFlirting,
  onOpenCatchmind,
}) {
  const [view, setView] = useState("menu");
  const { locale } = useLocale();

  if (view === "menu") {
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
          GAME CENTER
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
          {locale === "ja" ? "何を楽しみますか?" : "무엇을 즐기시겠어요?"}
        </div>

        {/* ✨ 내 프로필 (게임 탭에도 노출) */}
        <MyProfileCard
          nickname={myNickname}
          nicknameJa={myNicknameJa}
          avatar={myAvatar}
          seat={mySeat}
          onReroll={onReroll}
          delay={0.03}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 🆕 플러팅 게임 카드 (맨 위 - 가장 눈에 띄게) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenFlirting}
            style={{
              background:
                "linear-gradient(135deg, rgba(255,107,157,0.12), rgba(196,122,255,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,107,157,0.3)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              💕
            </Motion.div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                position: "relative",
              }}
            >
              <Motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(255,107,157,0.5))",
                }}
              >
                💕
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#FF6B9D",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  FLIRTING GAME
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(255,107,157,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#FFB0CD",
                    }}
                  >
                    HOT
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#F5E6C8",
                    fontFamily: "'Noto Serif KR', serif",
                    marginBottom: 4,
                  }}
                >
                  {locale === "ja"
                    ? "イ・グドンソン フラーティングゲーム"
                    : "이구동성 플러팅 게임"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,200,220,0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      5ラウンドの心理ゲーム。
                      <br />
                      <span style={{ color: "rgba(255,107,157,0.85)" }}>
                        同じ単語を選べば運命!
                      </span>{" "}
                      — 気になるお客様に申請!
                    </>
                  ) : (
                    <>
                      5라운드 이구동성 게임.
                      <br />
                      <span style={{ color: "rgba(255,107,157,0.85)" }}>
                        같은 단어 고르면 운명!
                      </span>{" "}
                      — 마음에 드는 손님께 신청!
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 🆕 캐치마인드 카드 (골드) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenCatchmind}
            style={{
              background:
                "linear-gradient(135deg, rgba(255,210,63,0.13), rgba(255,133,82,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,210,63,0.28)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              🎨
            </Motion.div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                position: "relative",
              }}
            >
              <Motion.div
                animate={{ rotate: [0, 6, -6, 6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(255,210,63,0.5))",
                }}
              >
                🎨
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#FFD23F",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  CATCH MIND
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(255,210,63,0.22)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#FFE08A",
                    }}
                  >
                    NEW
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#F5E6C8",
                    fontFamily: "'Noto Serif KR', serif",
                    marginBottom: 4,
                  }}
                >
                  {locale === "ja"
                    ? "キャッチマインド · 描いて当てる"
                    : "캐치마인드 · 그리고 맞히기"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(245,230,200,0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      <span style={{ color: "rgba(255,210,63,0.85)" }}>
                        2〜8人のドローイングクイズ。
                      </span>
                      <br />
                      80秒以内に絵を見て単語を当てよう!
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(255,210,63,0.85)" }}>
                        2~8명 드로잉 퀴즈.
                      </span>
                      <br />
                      80초 안에 그림을 보고 단어를 맞혀보세요!
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 🆕 카드 질문 게임 카드 (보라색) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.11 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView("question")}
            style={{
              background:
                "linear-gradient(135deg, rgba(170,130,255,0.12), rgba(120,90,200,0.05))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(170,130,255,0.25)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ rotate: [0, 5, -5, 0], opacity: [0.15, 0.22, 0.15] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              🃏
            </Motion.div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(170,130,255,0.4))",
                }}
              >
                🃏
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#AA82FF",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  TRUTH CARD
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(170,130,255,0.2)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#C8AFFF",
                    }}
                  >
                    TALK
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#F5E6C8",
                    fontFamily: "'Noto Serif KR', serif",
                    marginBottom: 4,
                  }}
                >
                  {locale === "ja" ? "カード質問ゲーム" : "카드 질문 게임"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(220,200,255,0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      <span style={{ color: "rgba(170,130,255,0.85)" }}>
                        お互いを知る時間。
                      </span>
                      <br />
                      一杯傾けながら素直な会話を交わしましょう
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(170,130,255,0.85)" }}>
                        서로를 알아가는 시간.
                      </span>
                      <br />한 잔 곁들이며 솔직한 대화를 나눠보세요
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 잔 쌓기 카드 */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView("stacking")}
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>
                🥃
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "rgba(212,165,55,0.5)",
                    marginBottom: 3,
                  }}
                >
                  SOLO
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#F5E6C8",
                    fontFamily: "'Noto Serif KR', serif",
                    marginBottom: 4,
                  }}
                >
                  {locale === "ja" ? "ウイスキーグラス積み" : "위스키 잔 쌓기"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      ひとりで楽しむタイミングゲーム。
                      <br />
                      グラスを高く積んで栄誉の殿堂に挑戦!
                    </>
                  ) : (
                    <>
                      혼자 즐기는 타이밍 게임.
                      <br />
                      잔을 높이 쌓아 명예의 전당에 도전!
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 더 나인 카드 */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView("nine")}
            style={{
              background:
                "linear-gradient(135deg, rgba(212,165,55,0.08), rgba(180,120,30,0.05))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(212,165,55,0.2)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 80% 30%, rgba(212,165,55,0.12), transparent 50%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                position: "relative",
              }}
            >
              <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>
                ⚔️
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#D4A537",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  1 vs 1 BATTLE
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(212,165,55,0.2)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 600,
                    }}
                  >
                    NEW
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#F5E6C8",
                    fontFamily: "'Noto Serif KR', serif",
                    marginBottom: 4,
                  }}
                >
                  {locale === "ja"
                    ? "ザ・ナイン · 対戦申請"
                    : "더 나인 · 대결 신청"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      9ラウンドの心理戦対決。
                      <br />
                      <span style={{ color: "rgba(212,165,55,0.7)" }}>
                        1は9を倒す
                      </span>{" "}
                      — 他のお客様に申請してみてください
                    </>
                  ) : (
                    <>
                      9라운드 심리전 대결.
                      <br />
                      <span style={{ color: "rgba(212,165,55,0.7)" }}>
                        1은 9를 잡는다
                      </span>{" "}
                      — 다른 손님에게 신청해보세요
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>
        </div>

        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{
            marginTop: 20,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12,
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.7,
            textAlign: "center",
          }}
        >
          🏆{" "}
          {locale === "ja" ? (
            <>
              すべてのゲーム記録は{" "}
              <strong style={{ color: "rgba(212,165,55,0.7)" }}>
                栄誉の殿堂
              </strong>
              に保存されます
            </>
          ) : (
            <>
              모든 게임 기록은{" "}
              <strong style={{ color: "rgba(212,165,55,0.7)" }}>
                명예의 전당
              </strong>
              에 저장됩니다
            </>
          )}
        </Motion.div>
      </div>
    );
  }

  if (view === "stacking") {
    return (
      <div>
        <div style={{ padding: "8px 16px 0" }}>
          <button
            onClick={() => setView("menu")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ChevronLeft size={12} />{" "}
            {locale === "ja" ? "ゲーム選択" : "게임 선택"}
          </button>
        </div>
        <StackingGame />
      </div>
    );
  }

  if (view === "nine") {
    return (
      <div>
        <div style={{ padding: "8px 16px 0" }}>
          <button
            onClick={() => setView("menu")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ChevronLeft size={12} />{" "}
            {locale === "ja" ? "ゲーム選択" : "게임 선택"}
          </button>
        </div>
        <LoungeScreen
          users={users}
          myId={myId}
          myStatus={myStatus}
          onSendInvite={onSendInvite}
          outgoingInvite={outgoingInvite}
          onCancelOutgoing={onCancelOutgoing}
        />
      </div>
    );
  }

  if (view === "question") {
    return (
      <div>
        <div style={{ padding: "8px 16px 0" }}>
          <button
            onClick={() => setView("menu")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ChevronLeft size={12} />{" "}
            {locale === "ja" ? "ゲーム選択" : "게임 선택"}
          </button>
        </div>
        <QuestionCard />
      </div>
    );
  }

  return null;
}
