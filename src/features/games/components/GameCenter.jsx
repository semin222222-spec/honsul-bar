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
  onOpenShield,
  onOpenLiar,
  onOpenTelestrations,
  onOpenDripBattle,
  onOpenCallMyName,
  onOpenExposed,
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
          {/* 🆕 익명 폭로전 카드 (핑크 — 단체 익명 + 다수결) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenExposed}
            style={{
              background:
                "linear-gradient(135deg, rgba(255,42,122,0.16), rgba(157,78,255,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,42,122,0.34)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.28, 0.15] }}
              transition={{ duration: 2.1, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              🎭
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
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 2 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(255,42,122,0.55))",
                }}
              >
                🎭
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#FF5B9A",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  EXPOSED
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(255,42,122,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#FFADCB",
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
                    ? "匿名暴露戦 · 多数決の罠"
                    : "익명 폭로전 · 다수결의 함정"}
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
                      <span style={{ color: "rgba(255,91,154,0.85)" }}>
                        2〜8人 · 🎭 匿名 + 多数決。
                      </span>
                      <br />
                      🌶️ 中辛まで · 嘘がバレたら罰ゲーム 🥃
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(255,91,154,0.85)" }}>
                        2~8명 · 🎭 익명 + 다수결.
                      </span>
                      <br />
                      🌶️ 매운맛까지 · 거짓말 들키면 벌칙 🥃
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 🆕 콜 마이 네임 카드 (시안 — 단체 추리) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.085 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenCallMyName}
            style={{
              background:
                "linear-gradient(135deg, rgba(91,229,224,0.16), rgba(30,127,155,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(91,229,224,0.34)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.28, 0.15] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              🕵️
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
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 2 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(91,229,224,0.55))",
                }}
              >
                🕵️
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#5BE5E0",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  CALL MY NAME
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(91,229,224,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#A6F0EC",
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
                    ? "コール・マイ・ネーム · 私は誰?"
                    : "콜 마이 네임 · 나는 누구일까?"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(200,240,238,0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      <span style={{ color: "rgba(91,229,224,0.85)" }}>
                        2〜8人 · Yes/No 推理ゲーム。
                      </span>
                      <br />
                      自分の正体を当てろ、外せば罰ゲーム 🥃
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(91,229,224,0.85)" }}>
                        2~8명 · Yes/No 추리 게임.
                      </span>
                      <br />
                      내 정체를 맞혀라, 다 틀리면 벌칙 🥃
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 🆕 드립 배틀 카드 (골드 — 단체 빈칸 채우기) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.09 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenDripBattle}
            style={{
              background:
                "linear-gradient(135deg, rgba(255,182,39,0.16), rgba(255,107,53,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,182,39,0.34)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.28, 0.15] }}
              transition={{ duration: 2.3, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              🎤
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
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 2 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(255,182,39,0.55))",
                }}
              >
                🎤
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#FFB627",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  DRIP BATTLE
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(255,182,39,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#FFD065",
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
                    ? "ドリップバトル · 穴埋め大喜利"
                    : "드립 배틀 · 빈칸 채우기"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,225,170,0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      <span style={{ color: "rgba(255,182,39,0.85)" }}>
                        3〜8人 · 約10分。
                      </span>
                      <br />
                      一番ウケる答えで優勝、ノージャムは罰ゲーム 🥃
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(255,182,39,0.85)" }}>
                        3~8명 · 약 10분.
                      </span>
                      <br />
                      가장 웃긴 답이 우승, 노잼은 벌칙 🥃
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

          {/* 🆕 5초 쉴드 카드 (빨강) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.105 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenShield}
            style={{
              background:
                "linear-gradient(135deg, rgba(229,68,60,0.14), rgba(184,51,40,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(229,68,60,0.3)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.28, 0.15] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              💣
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
                animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.6 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(229,68,60,0.6))",
                }}
              >
                💣
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#FF5C52",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  5초 쉴드
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(229,68,60,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#FFB8B0",
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
                    ? "5秒シールド・初声爆弾"
                    : "5초 쉴드 · 초성 폭탄"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,200,200,0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {locale === "ja" ? (
                    <>
                      <span style={{ color: "rgba(255,92,82,0.85)" }}>
                        5秒以内に初声単語を叫べ!
                      </span>
                      <br />
                      逃せばテキーラ1杯 🥃
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(255,92,82,0.85)" }}>
                        5초 안에 초성 단어 외치기!
                      </span>
                      <br />
                      못 외치면 데킬라 1잔 🥃
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 🆕 플러팅 게임 카드 */}
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

          {/* 🆕 라이어 게임 카드 (보라) */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.108 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenLiar}
            style={{
              background:
                "linear-gradient(135deg, rgba(157,122,224,0.14), rgba(122,86,201,0.05))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(157,122,224,0.32)",
              borderRadius: 16,
              padding: "clamp(18px, 5vw, 24px)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.26, 0.15] }}
              transition={{ duration: 2.6, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 60,
                pointerEvents: "none",
              }}
            >
              🎭
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
                animate={{ rotate: [0, 8, -8, 8, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(157,122,224,0.6))",
                }}
              >
                🎭
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#B395E8",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  LIAR GAME
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(157,122,224,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#D2BCF5",
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
                    ? "ライアーゲーム · 嘘つきを当てる"
                    : "라이어 게임 · 거짓말쟁이 찾기"}
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
                      <span style={{ color: "rgba(179,149,232,0.85)" }}>
                        3〜8人の心理ゲーム。
                      </span>
                      <br />
                      正体不明のライアーを暴け 🥃
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(179,149,232,0.85)" }}>
                        3~8명 심리 게임.
                      </span>
                      <br />
                      라이어를 못 찾으면 데킬라 🥃
                    </>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>

          {/* 🎨 텔레스트레이션 카드 */}
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.13 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenTelestrations}
            style={{
              background:
                "linear-gradient(135deg, rgba(176,132,255,0.14), rgba(122,232,181,0.06))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(176,132,255,0.32)",
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
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 10px rgba(176,132,255,0.55))",
                }}
              >
                🎨
              </Motion.div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#B084FF",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  TELESTRATIONS
                  <span
                    style={{
                      padding: "1px 6px",
                      background: "rgba(176,132,255,0.25)",
                      borderRadius: 4,
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color: "#DCC7FF",
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
                    ? "テレストレーション(絵で伝言)"
                    : "텔레스트레이션(그림으로 전달해요)"}
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
                      <span style={{ color: "rgba(176,132,255,0.85)" }}>
                        4〜8人で順に絵と単語をリレー。
                      </span>
                      <br />
                      最後はどう変わってる? 🖌️
                    </>
                  ) : (
                    <>
                      <span style={{ color: "rgba(176,132,255,0.85)" }}>
                        4~8명이 그림과 단어를 이어가요.
                      </span>
                      <br />
                      처음 단어가 어떻게 변할까? 🖌️
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
