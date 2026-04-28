import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import StackingGame from "./StackingGame";
import LoungeScreen from "./LoungeScreen";
import MyProfileCard from "./MyProfileCard";
import { useLocale } from "../lib/LocaleContext";

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
}) {
  const [view, setView] = useState("menu");
  const { locale, t } = useLocale();

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
          {/* 잔 쌓기 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
              <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>🥃</div>
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
          </motion.div>

          {/* 더 나인 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.17 }}
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
            <motion.div
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
              <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>⚔️</div>
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
                  {locale === "ja" ? "ザ・ナイン · 対戦申請" : "더 나인 · 대결 신청"}
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
          </motion.div>
        </div>

        <motion.div
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
          🏆 {locale === "ja" ? (
            <>すべてのゲーム記録は <strong style={{ color: "rgba(212,165,55,0.7)" }}>栄誉の殿堂</strong>に保存されます</>
          ) : (
            <>모든 게임 기록은 <strong style={{ color: "rgba(212,165,55,0.7)" }}>명예의 전당</strong>에 저장됩니다</>
          )}
        </motion.div>
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
            <ChevronLeft size={12} /> {locale === "ja" ? "ゲーム選択" : "게임 선택"}
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
            <ChevronLeft size={12} /> {locale === "ja" ? "ゲーム選択" : "게임 선택"}
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

  return null;
}
