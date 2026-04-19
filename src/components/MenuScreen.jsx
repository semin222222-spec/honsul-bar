import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Droplets, Flame } from "lucide-react";

const MENU_DATA = [
  {
    line: "LIGHT LINE",
    price: "9,900",
    desc: "가볍게 시작하는 한 잔",
    color: "#6AB06A",
    bg: "rgba(106,176,106,0.06)",
    border: "rgba(106,176,106,0.15)",
    items: [
      { name: "오늘,혼술 하이볼", desc: "위스키 베이스에 토닉, 혼술의 시작을 위한 시그니처", abv: "8%", taste: "청량 · 깔끔", icon: "🥃" },
      { name: "진 토닉", desc: "드라이 진과 토닉워터의 클래식한 조합", abv: "10%", taste: "쌉싸름 · 상쾌", icon: "🫧" },
      { name: "말리부 오렌지", desc: "코코넛 럼과 오렌지 주스, 달콤한 트로피컬", abv: "7%", taste: "달콤 · 트로피컬", icon: "🍊" },
      { name: "피치 크러쉬", desc: "복숭아 리큐르 베이스, 과즙 가득 상큼함", abv: "6%", taste: "달콤 · 과일향", icon: "🍑" },
      { name: "미도리 사워", desc: "메론 리큐르와 레몬의 새콤달콤 밸런스", abv: "8%", taste: "새콤 · 달콤", icon: "🍈" },
      { name: "다이키리", desc: "화이트 럼과 라임, 쿠바의 클래식 칵테일", abv: "12%", taste: "시트러스 · 드라이", icon: "🍋" },
      { name: "블랙 러시안", desc: "보드카와 커피 리큐르, 은은한 커피 향", abv: "15%", taste: "쓴맛 · 커피", icon: "☕" },
    ],
  },
  {
    line: "DEEP LINE",
    price: "12,900",
    desc: "한 단계 깊어지는 밤",
    color: "#D4A537",
    bg: "rgba(212,165,55,0.06)",
    border: "rgba(212,165,55,0.15)",
    items: [
      { name: "얼그레이 하이볼", desc: "얼그레이 인퓨즈드 위스키, 은은한 찻향", abv: "10%", taste: "향긋 · 우아", icon: "🫖" },
      { name: "모스크 뮬", desc: "보드카와 진저비어, 라임의 킥이 있는 한 잔", abv: "10%", taste: "매콤 · 청량", icon: "🫚" },
      { name: "코스모폴리탄", desc: "보드카와 크랜베리, 뉴욕 감성 그 자체", abv: "14%", taste: "상큼 · 세련", icon: "🍸" },
      { name: "마가리타", desc: "데킬라와 라임, 소금 림의 멕시칸 클래식", abv: "13%", taste: "시트러스 · 짭짤", icon: "🧂" },
      { name: "섹스 온 더 비치", desc: "보드카와 복숭아, 오렌지의 서머 바이브", abv: "11%", taste: "달콤 · 프루티", icon: "🏖️" },
      { name: "준 벅", desc: "버번과 진저에일, 민트의 남부 스타일", abv: "12%", taste: "스파이시 · 민트", icon: "🌿" },
      { name: "애플 마티니", desc: "보드카와 사과 리큐르, 새콤한 그린 애플", abv: "15%", taste: "새콤 · 사과향", icon: "🍏" },
    ],
  },
  {
    line: "PREMIUM LINE",
    price: "14,900",
    desc: "오늘 밤의 주인공",
    color: "#C47AFF",
    bg: "rgba(196,122,255,0.06)",
    border: "rgba(196,122,255,0.15)",
    items: [
      { name: "블루 하와이", desc: "럼과 블루 큐라소, 눈으로 먼저 마시는 칵테일", abv: "12%", taste: "트로피컬 · 달콤", icon: "🌊" },
      { name: "갓파더", desc: "위스키와 아마레또, 묵직한 한 모금", abv: "20%", taste: "묵직 · 견과류", icon: "🎩" },
      { name: "네그로니", desc: "진, 캄파리, 베르무트의 쓴맛 삼총사", abv: "22%", taste: "비터 · 복합적", icon: "🔴" },
      { name: "올드 패션드", desc: "버번과 비터스, 바텐더의 자존심", abv: "25%", taste: "스모키 · 클래식", icon: "🥃" },
      { name: "마티니", desc: "진과 드라이 베르무트, 칵테일의 제왕", abv: "28%", taste: "드라이 · 강렬", icon: "🍸" },
      { name: "카타르시스", desc: "하우스 스페셜, 한 잔으로 정화되는 밤", abv: "18%", taste: "플로럴 · 미스터리", icon: "✨" },
      { name: "파우스트", desc: "하우스 시그니처, 악마에게 영혼을 판 맛", abv: "23%", taste: "다크 · 복합적", icon: "🖤" },
    ],
  },
];

function DrinkDetail({ drink, lineColor, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          width: "100%", maxWidth: 340,
          background: "rgba(20,18,14,0.97)",
          backdropFilter: "blur(24px)",
          borderRadius: 20,
          border: "1px solid " + lineColor + "30",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.4)",
        }}>
          <X size={14} />
        </button>

        <div style={{ fontSize: 48, marginBottom: 16 }}>{drink.icon}</div>

        <div style={{
          fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 400, color: "#F5E6C8",
          fontFamily: "'Cormorant Garamond', serif", marginBottom: 8,
        }}>
          {drink.name}
        </div>

        <div style={{
          fontSize: "clamp(12px, 3vw, 13px)", color: "rgba(255,255,255,0.45)",
          lineHeight: 1.7, marginBottom: 20,
        }}>
          {drink.desc}
        </div>

        <div style={{
          display: "flex", justifyContent: "center", gap: 12,
          marginBottom: 8,
        }}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "10px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <Droplets size={14} style={{ color: lineColor }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>도수</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{drink.abv}</span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "10px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <Sparkles size={14} style={{ color: lineColor }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>맛</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{drink.taste}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MenuScreen() {
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
        COCKTAIL MENU
      </div>
      <div style={{
        fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
        fontFamily: "'Cormorant Garamond', serif", marginBottom: "clamp(16px, 5vw, 24px)",
      }}>
        오늘 밤, 무엇을 마실까요?
      </div>

      {MENU_DATA.map((section, si) => (
        <motion.div
          key={section.line}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: "clamp(20px, 6vw, 28px)" }}
        >
          {/* 섹션 헤더 */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            marginBottom: "clamp(10px, 3vw, 14px)",
            paddingBottom: 10,
            borderBottom: "1px solid " + section.border,
          }}>
            <div>
              <div style={{
                fontSize: "clamp(11px, 2.8vw, 12px)", letterSpacing: "0.15em",
                color: section.color, fontWeight: 600, marginBottom: 3,
              }}>
                {section.line}
              </div>
              <div style={{
                fontSize: "clamp(10px, 2.5vw, 11px)",
                color: "rgba(255,255,255,0.3)",
              }}>
                {section.desc}
              </div>
            </div>
            <div style={{
              fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300,
              color: section.color,
              fontFamily: "'Cormorant Garamond', serif",
              whiteSpace: "nowrap",
            }}>
              {section.price}<span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>원</span>
            </div>
          </div>

          {/* 메뉴 아이템 리스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.items.map((item, ii) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: si * 0.12 + ii * 0.04 }}
                onClick={() => { setSelectedDrink(item); setSelectedColor(section.color); }}
                style={{
                  display: "flex", alignItems: "center", gap: "clamp(10px, 3vw, 14px)",
                  padding: "clamp(10px, 3vw, 13px) clamp(12px, 3.5vw, 14px)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "clamp(10px, 3vw, 12px)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  WebkitTapHighlightColor: "transparent",
                  minHeight: 44,
                }}
              >
                <div style={{
                  width: "clamp(36px, 9vw, 42px)", height: "clamp(36px, 9vw, 42px)",
                  borderRadius: 10, flexShrink: 0,
                  background: section.bg,
                  border: "1px solid " + section.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(16px, 4.5vw, 20px)",
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "clamp(13px, 3.5vw, 14px)", fontWeight: 500,
                    color: "#F5E6C8",
                  }}>
                    {item.name}
                  </div>
                  <div style={{
                    fontSize: "clamp(10px, 2.5vw, 11px)",
                    color: "rgba(255,255,255,0.3)", marginTop: 2,
                    display: "flex", gap: 8,
                  }}>
                    <span>{item.taste}</span>
                    <span style={{ color: section.color }}>{item.abv}</span>
                  </div>
                </div>
                <div style={{
                  fontSize: "clamp(9px, 2.2vw, 10px)",
                  color: "rgba(255,255,255,0.2)",
                  flexShrink: 0,
                }}>
                  상세보기
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* 드링크 상세 팝업 */}
      <AnimatePresence>
        {selectedDrink && (
          <DrinkDetail
            drink={selectedDrink}
            lineColor={selectedColor}
            onClose={() => setSelectedDrink(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}