import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Droplets, Shuffle, ShoppingBag, Check } from "lucide-react";
import { enableSound, playOrderSuccess } from "../lib/sounds";

// ────── 메뉴 상세 모달 ──────
function DrinkDetail({ drink, lineColor, onClose, onOrder, ordering, justOrdered }) {
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
          padding: drink.image_url ? "0 0 28px 0" : "28px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 닫기 버튼 */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.7)",
          zIndex: 10,
        }}>
          <X size={14} />
        </button>

        {/* 🆕 이미지 있으면 큰 사진 (라이트박스 느낌) */}
        {drink.image_url ? (
          <div style={{
            width: "100%",
            aspectRatio: "1",
            position: "relative",
            background: "rgba(0,0,0,0.3)",
            marginBottom: 20,
          }}>
            <img
              src={drink.image_url}
              alt={drink.name}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* 하단 그라데이션 (텍스트 가독성) */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 60,
              background: "linear-gradient(180deg, transparent, rgba(20,18,14,1))",
              pointerEvents: "none",
            }} />
          </div>
        ) : (
          // 이미지 없으면 큰 이모지 (기존)
          <div style={{ fontSize: 48, marginBottom: 16 }}>{drink.icon}</div>
        )}

        {/* 텍스트 영역 */}
        <div style={{ padding: drink.image_url ? "0 24px" : "0" }}>
          <div style={{
            fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 400, color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif", marginBottom: 8,
          }}>{drink.name}</div>
          <div style={{
            fontSize: "clamp(12px, 3vw, 13px)", color: "rgba(255,255,255,0.45)",
            lineHeight: 1.7, marginBottom: 20,
          }}>{drink.desc}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "10px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <Droplets size={14} style={{ color: lineColor }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>도수</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{drink.abv}</span>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "10px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <Sparkles size={14} style={{ color: lineColor }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>맛</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{drink.taste}</span>
            </div>
          </div>

          {/* 가격 */}
          <div style={{
            padding: "14px 16px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 12,
            marginBottom: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>가격</span>
            <span style={{
              fontSize: 20, fontWeight: 400, color: lineColor,
              fontFamily: "'Noto Serif KR', serif",
            }}>
              {drink.price}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>원</span>
            </span>
          </div>

          {/* 주문 버튼 */}
          <motion.button
            whileTap={!ordering && !justOrdered ? { scale: 0.96 } : {}}
            onClick={() => { if (!ordering && !justOrdered) onOrder(drink); }}
            disabled={ordering || justOrdered}
            style={{
              width: "100%", padding: "14px",
              border: "none", borderRadius: 12,
              background: justOrdered
                ? "linear-gradient(135deg, #6AB06A, #4A9A4A)"
                : ordering
                ? "rgba(255,255,255,0.08)"
                : `linear-gradient(135deg, ${lineColor}, ${lineColor}aa)`,
              color: justOrdered ? "#fff" : ordering ? "rgba(255,255,255,0.4)" : "#0D0B08",
              fontSize: 14, fontWeight: 600,
              cursor: ordering || justOrdered ? "default" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.3s",
              WebkitTapHighlightColor: "transparent",
              minHeight: 48,
            }}
          >
            {justOrdered ? (
              <>
                <Check size={16} />
                주문 완료!
              </>
            ) : ordering ? (
              "주문 중..."
            ) : (
              <>
                <ShoppingBag size={16} />
                주문하기
              </>
            )}
          </motion.button>

          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 10,
            lineHeight: 1.5,
          }}>
            주문 시 사장님께 바로 알림이 전달됩니다
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ────── 랜덤 픽커 ──────
function RandomPicker({ allDrinks = [] }) {
  const [picked, setPicked] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);

  const pickRandom = () => {
    if (spinning || allDrinks.length === 0) return;
    setSpinning(true);
    setPicked(null);

    let count = 0;
    const total = 12;
    const interval = setInterval(() => {
      setPicked(allDrinks[Math.floor(Math.random() * allDrinks.length)]);
      setSpinKey(prev => prev + 1);
      count++;
      if (count >= total) {
        clearInterval(interval);
        const final = allDrinks[Math.floor(Math.random() * allDrinks.length)];
        setPicked(final);
        setSpinKey(prev => prev + 1);
        setSpinning(false);
      }
    }, 120);
  };

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(212,165,55,0.06), rgba(255,255,255,0.02))",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(212,165,55,0.12)",
      borderRadius: "clamp(14px, 4vw, 18px)",
      padding: "clamp(16px, 4.5vw, 22px)",
      marginBottom: "clamp(20px, 6vw, 28px)",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: "clamp(11px, 2.8vw, 12px)", color: "rgba(212,165,55,0.6)",
        fontWeight: 500, marginBottom: 12, letterSpacing: "0.08em",
      }}>
        🎰 뭘 마실지 모르겠다면?
      </div>

      <AnimatePresence mode="wait">
        {picked ? (
          <motion.div
            key={spinKey}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: spinning ? 0.08 : 0.4, ease: spinning ? "linear" : [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "clamp(10px, 3vw, 14px)",
              padding: "clamp(12px, 3.5vw, 16px)",
              background: spinning ? "rgba(255,255,255,0.02)" : picked.lineBg,
              border: "1px solid " + (spinning ? "rgba(255,255,255,0.06)" : picked.lineBorder),
              borderRadius: 14,
              marginBottom: 14,
              minHeight: 70,
            }}
          >
            {/* 🆕 사진 있으면 사진, 없으면 이모지 */}
            {picked.image_url ? (
              <div style={{
                width: "clamp(44px, 11vw, 52px)",
                height: "clamp(44px, 11vw, 52px)",
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
              }}>
                <img
                  src={picked.image_url}
                  alt={picked.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : (
              <div style={{ fontSize: "clamp(28px, 8vw, 36px)" }}>{picked.icon}</div>
            )}
            <div style={{ textAlign: "left" }}>
              <div style={{
                fontSize: "clamp(14px, 3.8vw, 16px)", fontWeight: 500, color: "#F5E6C8",
              }}>{picked.name}</div>
              <div style={{
                fontSize: "clamp(10px, 2.5vw, 11px)",
                color: spinning ? "rgba(255,255,255,0.3)" : picked.lineColor,
                marginTop: 2,
                display: "flex", gap: 8, flexWrap: "wrap",
              }}>
                <span>{picked.taste}</span>
                <span>{picked.abv}</span>
                <span>{picked.price}원</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: "clamp(16px, 5vw, 24px)",
              color: "rgba(255,255,255,0.2)",
              fontSize: "clamp(12px, 3vw, 13px)",
              marginBottom: 14,
            }}
          >
            버튼을 눌러 오늘의 한 잔을 뽑아보세요!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={pickRandom}
        disabled={spinning}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "12px 24px",
          background: spinning
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #D4A537, #B8860B)",
          border: "none", borderRadius: 12,
          color: spinning ? "rgba(255,255,255,0.3)" : "#0D0B08",
          fontSize: "clamp(13px, 3.5vw, 14px)", fontWeight: 600,
          cursor: spinning ? "default" : "pointer",
          fontFamily: "inherit",
          WebkitTapHighlightColor: "transparent",
          minHeight: 44,
          transition: "all 0.3s",
        }}
      >
        <motion.div
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { duration: 0.6, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
        >
          <Shuffle size={16} />
        </motion.div>
        {spinning ? "뽑는 중..." : (picked ? "다시 뽑기" : "오늘의 추천 술 뽑기")}
      </motion.button>
    </div>
  );
}

// ────── MY TAB 카드 ──────
function MyTabCard({ orders, totalAmount, seat }) {
  if (orders.length === 0) return null;

  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(135deg, rgba(212,165,55,0.08), rgba(180,120,30,0.04))",
        border: "1px solid rgba(212,165,55,0.25)",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 20,
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10,
      }}>
        <div>
          <div style={{
            fontSize: 9, letterSpacing: "0.2em",
            color: "rgba(212,165,55,0.6)",
            fontFamily: "'Noto Serif KR', serif",
          }}>MY TAB</div>
          <div style={{
            fontSize: 14, color: "#D4A537", fontWeight: 500,
            fontFamily: "'Noto Serif KR', serif", marginTop: 2,
          }}>📍 {seat}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>총 {orders.length}건</div>
          <div style={{
            fontSize: 17, color: "#D4A537", fontWeight: 500,
            fontFamily: "'Noto Serif KR', serif", marginTop: 2,
          }}>
            {totalAmount.toLocaleString()}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>원</span>
          </div>
        </div>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 4,
        padding: "10px 12px",
        background: "rgba(0,0,0,0.25)",
        borderRadius: 10,
        maxHeight: 120, overflowY: "auto",
      }}>
        {orders.map((o) => (
          <div key={o.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 11, padding: "3px 0",
          }}>
            <span style={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{o.menu_icon}</span>
              <span>{o.menu_name}</span>
              {o.status === "served" && (
                <span style={{
                  fontSize: 8, padding: "1px 5px", borderRadius: 4,
                  background: "rgba(106,176,106,0.15)", color: "#6AB06A",
                }}>✓ 제공됨</span>
              )}
            </span>
            <span style={{ color: "rgba(212,165,55,0.7)" }}>
              {o.price.toLocaleString()}원
            </span>
          </div>
        ))}
      </div>
      {pendingCount > 0 && (
        <div style={{
          fontSize: 10, color: "rgba(212,165,55,0.6)",
          textAlign: "center", marginTop: 8,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
            ⏳
          </motion.span>
          {pendingCount}건 제조 중
        </div>
      )}
    </motion.div>
  );
}

// ────── 메인 ──────
export default function MenuScreen({ createOrder, orders = [], totalAmount = 0, mySeat, categories = [], menus = [], loading = false }) {
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [ordering, setOrdering] = useState(false);
  const [justOrdered, setJustOrdered] = useState(false);

  // DB 카테고리/메뉴를 화면용 구조로 변환
  const menuSections = categories.map(cat => {
    const items = menus
      .filter(m => m.category_id === cat.id)
      .map(m => ({
        name: m.name,
        icon: m.icon,
        desc: m.description,
        abv: m.abv,
        taste: m.taste,
        priceNum: m.price,
        price: m.price.toLocaleString(),
        image_url: m.image_url, // 🆕 이미지 URL 전달
      }));

    const colorMap = {
      "LIGHT LINE": { color: "#6AB06A", bg: "rgba(106,176,106,0.06)", border: "rgba(106,176,106,0.15)" },
      "DEEP LINE": { color: "#D4A537", bg: "rgba(212,165,55,0.06)", border: "rgba(212,165,55,0.15)" },
      "PREMIUM LINE": { color: "#C47AFF", bg: "rgba(196,122,255,0.06)", border: "rgba(196,122,255,0.15)" },
    };
    const fallback = colorMap[cat.name] || { color: "#D4A537", bg: "rgba(212,165,55,0.06)", border: "rgba(212,165,55,0.15)" };

    return {
      line: cat.name,
      price: cat.default_price?.toLocaleString() || "",
      priceNum: cat.default_price || 0,
      desc: cat.description || "",
      color: cat.color || fallback.color,
      bg: fallback.bg,
      border: fallback.border,
      items,
    };
  });

  const allDrinks = menuSections.flatMap(section =>
    section.items.map(item => ({
      ...item,
      line: section.line,
      price: section.price,
      priceNum: section.priceNum,
      lineColor: section.color,
      lineBg: section.bg,
      lineBorder: section.border,
    }))
  );

  const handleOrder = async (drink) => {
    if (!createOrder) {
      alert("주문 기능을 사용할 수 없습니다");
      return;
    }
    enableSound();
    setOrdering(true);
    const result = await createOrder({
      menuName: drink.name,
      menuIcon: drink.icon,
      price: drink.priceNum,
    });
    setOrdering(false);

    if (result) {
      playOrderSuccess();
      setJustOrdered(true);
      setTimeout(() => {
        setSelectedDrink(null);
        setJustOrdered(false);
      }, 1500);
    } else {
      alert("주문에 실패했어요. 다시 시도해주세요.");
    }
  };

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
        COCKTAIL MENU
      </div>
      <div style={{
        fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
        fontFamily: "'Noto Serif KR', serif", marginBottom: "clamp(16px, 5vw, 24px)",
      }}>
        오늘 밤, 무엇을 마실까요?
      </div>

      <MyTabCard orders={orders} totalAmount={totalAmount} seat={mySeat} />

      <RandomPicker allDrinks={allDrinks} />

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          메뉴를 불러오는 중...
        </div>
      ) : menuSections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          아직 등록된 메뉴가 없어요
        </div>
      ) : menuSections.map((section, si) => (
        <motion.div
          key={section.line}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: "clamp(20px, 6vw, 28px)" }}
        >
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
              }}>{section.line}</div>
              <div style={{
                fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)",
              }}>{section.desc}</div>
            </div>
            <div style={{
              fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300,
              color: section.color, fontFamily: "'Noto Serif KR', serif",
              whiteSpace: "nowrap",
            }}>
              {section.price}<span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>원</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.items.map((item, ii) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: si * 0.12 + ii * 0.04 }}
                onClick={() => {
                  setSelectedDrink({ ...item, price: section.price, priceNum: section.priceNum });
                  setSelectedColor(section.color);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "clamp(10px, 3vw, 14px)",
                  padding: "clamp(10px, 3vw, 13px) clamp(12px, 3.5vw, 14px)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "clamp(10px, 3vw, 12px)",
                  cursor: "pointer", transition: "all 0.2s",
                  WebkitTapHighlightColor: "transparent", minHeight: 44,
                }}
              >
                {/* 🆕 썸네일 (이미지 있으면 사진, 없으면 이모지) */}
                <div style={{
                  width: "clamp(44px, 11vw, 52px)",
                  height: "clamp(44px, 11vw, 52px)",
                  borderRadius: 10, flexShrink: 0,
                  background: item.image_url ? "transparent" : section.bg,
                  border: item.image_url ? "1px solid " + section.border : "1px solid " + section.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(20px, 5.5vw, 24px)",
                  overflow: "hidden",
                }}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      style={{
                        width: "100%", height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    item.icon
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "clamp(13px, 3.5vw, 14px)", fontWeight: 500, color: "#F5E6C8",
                  }}>{item.name}</div>
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
                  fontSize: "clamp(9px, 2.2vw, 10px)", color: section.color, flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <ShoppingBag size={10} />
                  <span>주문</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      <AnimatePresence>
        {selectedDrink && (
          <DrinkDetail
            drink={selectedDrink}
            lineColor={selectedColor}
            onClose={() => {
              if (!ordering) {
                setSelectedDrink(null);
                setJustOrdered(false);
              }
            }}
            onOrder={handleOrder}
            ordering={ordering}
            justOrdered={justOrdered}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
