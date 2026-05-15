import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Droplets, ShoppingBag, Check, Wifi, Copy, Plus, Minus } from "lucide-react";
import { enableSound, playOrderSuccess } from "../lib/sounds";

// ────── 메뉴 상세 + 옵션 선택 + 수량 선택 모달 ──────
function DrinkDetail({ drink, lineColor, options, onClose, onOrder, ordering }) {
  const hasOptions = options && options.length > 0;
  const [selectedOption, setSelectedOption] = useState(hasOptions ? options[0] : null);
  const [quantity, setQuantity] = useState(1);

  const unitPrice = selectedOption ? selectedOption.price : drink.priceNum;
  const totalPrice = unitPrice * quantity;

  const handleQuantityChange = (delta) => {
    setQuantity((q) => Math.max(1, Math.min(10, q + delta)));
  };

  const handleSubmit = () => {
    if (ordering) return;
    onOrder(drink, selectedOption, quantity);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !ordering) onClose(); }}
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
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button onClick={onClose} disabled={ordering} style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: ordering ? "not-allowed" : "pointer",
          color: "rgba(255,255,255,0.7)",
          zIndex: 10,
          opacity: ordering ? 0.5 : 1,
        }}>
          <X size={14} />
        </button>

        {drink.image_url ? (
          <div style={{
            width: "100%",
            aspectRatio: "1",
            position: "relative",
            background: "rgba(0,0,0,0.3)",
            marginBottom: 20,
          }}>
            <img src={drink.image_url} alt={drink.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
              background: "linear-gradient(180deg, transparent, rgba(20,18,14,1))",
              pointerEvents: "none",
            }} />
          </div>
        ) : (
          <div style={{ fontSize: 48, marginBottom: 16 }}>{drink.icon}</div>
        )}

        <div style={{ padding: drink.image_url ? "0 24px" : "0" }}>
          <div style={{
            fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 400, color: "#F5E6C8",
            fontFamily: "'Noto Serif KR', serif", marginBottom: 8,
          }}>{drink.name}</div>
          
          {drink.desc && (
            <div style={{
              fontSize: "clamp(12px, 3vw, 13px)", color: "rgba(255,255,255,0.45)",
              lineHeight: 1.7, marginBottom: 20,
            }}>{drink.desc}</div>
          )}
          
          {(drink.abv || drink.taste) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
              {drink.abv && (
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "10px 16px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <Droplets size={14} style={{ color: lineColor }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>도수</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{drink.abv}</span>
                </div>
              )}
              {drink.taste && (
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "10px 16px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <Sparkles size={14} style={{ color: lineColor }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>맛</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#F5E6C8" }}>{drink.taste}</span>
                </div>
              )}
            </div>
          )}

          {hasOptions && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 11, color: "rgba(212,165,55,0.7)",
                letterSpacing: "0.15em", marginBottom: 10,
                textAlign: "left",
              }}>
                옵션 선택
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {options.map(opt => {
                  const isSelected = selectedOption?.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOption(opt)}
                      disabled={ordering}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 14px",
                        background: isSelected ? hexToRgba(lineColor, 0.12) : "rgba(255,255,255,0.03)",
                        border: "1px solid " + (isSelected ? lineColor + "60" : "rgba(255,255,255,0.06)"),
                        borderRadius: 10,
                        cursor: ordering ? "not-allowed" : "pointer", fontFamily: "inherit",
                        transition: "all 0.2s",
                        textAlign: "left",
                        opacity: ordering ? 0.5 : 1,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: "2px solid " + (isSelected ? lineColor : "rgba(255,255,255,0.2)"),
                        position: "relative", flexShrink: 0,
                      }}>
                        {isSelected && (
                          <div style={{
                            position: "absolute", inset: 3,
                            background: lineColor, borderRadius: "50%",
                          }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500,
                          color: isSelected ? "#F5E6C8" : "rgba(245,230,200,0.7)",
                        }}>
                          {opt.name}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: isSelected ? lineColor : "rgba(212,165,55,0.7)",
                        fontFamily: "'Noto Serif KR', serif",
                        fontWeight: 500,
                      }}>
                        {opt.price.toLocaleString()}원
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 수량 선택 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, color: "rgba(212,165,55,0.7)",
              letterSpacing: "0.15em", marginBottom: 10,
              textAlign: "left",
            }}>
              수량
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 16, padding: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
            }}>
              <motion.button
                whileTap={!ordering && quantity > 1 ? { scale: 0.9 } : {}}
                onClick={() => handleQuantityChange(-1)}
                disabled={ordering || quantity <= 1}
                style={{
                  width: 40, height: 40,
                  borderRadius: 8,
                  background: hexToRgba(lineColor, 0.15),
                  border: "1px solid " + hexToRgba(lineColor, 0.3),
                  color: lineColor,
                  cursor: (ordering || quantity <= 1) ? "not-allowed" : "pointer",
                  opacity: (quantity <= 1 || ordering) ? 0.4 : 1,
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Minus size={16} />
              </motion.button>
              <motion.span
                key={quantity}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  fontSize: 22, fontWeight: 600, color: "#F5E6C8",
                  minWidth: 50, textAlign: "center",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                {quantity}
              </motion.span>
              <motion.button
                whileTap={!ordering && quantity < 10 ? { scale: 0.9 } : {}}
                onClick={() => handleQuantityChange(1)}
                disabled={ordering || quantity >= 10}
                style={{
                  width: 40, height: 40,
                  borderRadius: 8,
                  background: hexToRgba(lineColor, 0.15),
                  border: "1px solid " + hexToRgba(lineColor, 0.3),
                  color: lineColor,
                  cursor: (ordering || quantity >= 10) ? "not-allowed" : "pointer",
                  opacity: (quantity >= 10 || ordering) ? 0.4 : 1,
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Plus size={16} />
              </motion.button>
            </div>
            {quantity >= 10 && (
              <div style={{ fontSize: 9, color: "rgba(255,180,180,0.7)", marginTop: 4, textAlign: "center" }}>
                한 번에 최대 10잔까지 주문 가능해요
              </div>
            )}
          </div>

          {/* 합계 */}
          <div style={{
            padding: "14px 16px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 12,
            marginBottom: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
              합계 {quantity > 1 && <span style={{ marginLeft: 4, color: "rgba(255,255,255,0.3)" }}>({unitPrice.toLocaleString()}원 × {quantity})</span>}
            </span>
            <span style={{
              fontSize: 20, fontWeight: 400, color: lineColor,
              fontFamily: "'Noto Serif KR', serif",
            }}>
              {totalPrice.toLocaleString()}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>원</span>
            </span>
          </div>

          <motion.button
            whileTap={!ordering ? { scale: 0.96 } : {}}
            onClick={handleSubmit}
            disabled={ordering}
            style={{
              width: "100%", padding: "14px",
              border: "none", borderRadius: 12,
              background: ordering
                ? "rgba(255,255,255,0.08)"
                : `linear-gradient(135deg, ${lineColor}, ${lineColor}aa)`,
              color: ordering ? "rgba(255,255,255,0.4)" : "#0D0B08",
              fontSize: 14, fontWeight: 600,
              cursor: ordering ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.3s",
              WebkitTapHighlightColor: "transparent",
              minHeight: 48,
            }}
          >
            {ordering ? (
              "주문 중..."
            ) : (
              <>
                <ShoppingBag size={16} />
                {quantity > 1 ? `${quantity}잔 주문하기` : "주문하기"}
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

// ────── 주문 완료 모달 ──────
function OrderCompleteModal({ orderInfo, onClose }) {
  if (!orderInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        style={{
          width: "100%", maxWidth: 340,
          background: "linear-gradient(135deg, rgba(30,40,30,0.98), rgba(15,25,15,0.98))",
          backdropFilter: "blur(24px)",
          borderRadius: 20,
          border: "1px solid rgba(106,176,106,0.4)",
          padding: "32px 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
          style={{
            width: 70, height: 70,
            margin: "0 auto 16px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(106,176,106,0.25), rgba(60,120,60,0.15))",
            border: "2px solid rgba(106,176,106,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Check size={38} style={{ color: "#6AB06A", strokeWidth: 3 }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{
            fontSize: 20, fontFamily: "'Noto Serif KR', serif",
            color: "#F5E6C8", marginBottom: 6, fontWeight: 500,
          }}>
            주문이 완료되었어요!
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.5 }}>
            사장님이 곧 확인하실 거예요
          </div>

          <div style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            textAlign: "left",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 0", fontSize: 13, color: "rgba(255,255,255,0.85)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{orderInfo.icon}</span>
                <span>{orderInfo.name}</span>
                {orderInfo.optionName && (
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 3,
                    background: "rgba(212,165,55,0.15)", color: "rgba(212,165,55,0.9)",
                    fontWeight: 600,
                  }}>{orderInfo.optionName}</span>
                )}
                {orderInfo.quantity > 1 && (
                  <span style={{
                    color: "#D4A537", fontWeight: 700, fontSize: 13,
                  }}>× {orderInfo.quantity}</span>
                )}
              </span>
              <span style={{
                color: "rgba(212,165,55,0.85)",
                fontFamily: "'Noto Serif KR', serif",
              }}>
                {orderInfo.totalPrice.toLocaleString()}원
              </span>
            </div>

            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: "1px dashed rgba(212,165,55,0.2)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 11, color: "rgba(212,165,55,0.7)", fontWeight: 600, letterSpacing: "0.1em" }}>
                총 주문 금액
              </span>
              <span style={{
                fontSize: 18, color: "#D4A537", fontWeight: 600,
                fontFamily: "'Noto Serif KR', serif",
              }}>
                {orderInfo.totalPrice.toLocaleString()}원
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 13, color: "#6AB06A",
            marginBottom: 18,
            fontFamily: "'Noto Serif KR', serif",
          }}>
            🥃 곧 준비해드릴게요
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            style={{
              width: "100%", padding: 14, border: "none", borderRadius: 12,
              background: "linear-gradient(135deg, #6AB06A, #3A7A3A)",
              color: "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 48,
            }}
          >
            확인
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ────── WiFi 카드 ──────
function WifiCard({ ssid, password }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!ssid || !password) return null;

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
      } catch (err2) {
        console.error('복사 실패:', err2);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Wifi size={14} style={{ color: "#60A5FA" }} />
        <span style={{
          fontSize: 11, color: "rgba(212,165,55,0.7)",
          fontWeight: 600, letterSpacing: "0.05em",
        }}>
          매장 WiFi
        </span>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 0", fontSize: 12,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <span style={{ color: "rgba(255,255,255,0.4)", width: 32, fontSize: 10, letterSpacing: "0.05em" }}>ID</span>
        <span style={{
          flex: 1, color: "#F5E6C8",
          fontFamily: "'SF Mono', Monaco, monospace",
          fontWeight: 500, fontSize: 12,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{ssid}</span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleCopy(ssid, "ssid")}
          style={{
            padding: "4px 9px",
            background: copiedField === "ssid"
              ? "linear-gradient(135deg, #6AB06A, #4A9A4A)"
              : "rgba(212,165,55,0.1)",
            border: "1px solid " + (copiedField === "ssid" ? "transparent" : "rgba(212,165,55,0.2)"),
            borderRadius: 5,
            color: copiedField === "ssid" ? "#fff" : "#D4A537",
            fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 3,
            WebkitTapHighlightColor: "transparent",
            minWidth: 50, justifyContent: "center",
          }}
        >
          {copiedField === "ssid" ? (
            <><Check size={10} /><span>복사됨</span></>
          ) : (
            <><Copy size={10} /><span>복사</span></>
          )}
        </motion.button>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 0", fontSize: 12,
      }}>
        <span style={{ color: "rgba(255,255,255,0.4)", width: 32, fontSize: 10, letterSpacing: "0.05em" }}>PW</span>
        <span style={{
          flex: 1, color: "#F5E6C8",
          fontFamily: "'SF Mono', Monaco, monospace",
          fontWeight: 500, fontSize: 12,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{password}</span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleCopy(password, "password")}
          style={{
            padding: "4px 9px",
            background: copiedField === "password"
              ? "linear-gradient(135deg, #6AB06A, #4A9A4A)"
              : "rgba(212,165,55,0.1)",
            border: "1px solid " + (copiedField === "password" ? "transparent" : "rgba(212,165,55,0.2)"),
            borderRadius: 5,
            color: copiedField === "password" ? "#fff" : "#D4A537",
            fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 3,
            WebkitTapHighlightColor: "transparent",
            minWidth: 50, justifyContent: "center",
          }}
        >
          {copiedField === "password" ? (
            <><Check size={10} /><span>복사됨</span></>
          ) : (
            <><Copy size={10} /><span>복사</span></>
          )}
        </motion.button>
      </div>
    </motion.div>
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
        borderRadius: 14, padding: "14px 16px", marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(212,165,55,0.6)", fontFamily: "'Noto Serif KR', serif" }}>
            MY TAB
          </div>
          <div style={{ fontSize: 14, color: "#D4A537", fontWeight: 500, fontFamily: "'Noto Serif KR', serif", marginTop: 2 }}>
            📍 {seat}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>총 {orders.length}건</div>
          <div style={{ fontSize: 17, color: "#D4A537", fontWeight: 500, fontFamily: "'Noto Serif KR', serif", marginTop: 2 }}>
            {totalAmount.toLocaleString()}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>원</span>
          </div>
        </div>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 4,
        padding: "10px 12px", background: "rgba(0,0,0,0.25)",
        borderRadius: 10, maxHeight: 120, overflowY: "auto",
      }}>
        {orders.map((o) => (
          <div key={o.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 11, padding: "3px 0",
          }}>
            <span style={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{o.menu_icon}</span>
              <span>{o.menu_name}</span>
              {o.option_name && (
                <span style={{
                  fontSize: 9, padding: "1px 5px",
                  background: "rgba(212,165,55,0.15)", color: "#D4A537",
                  borderRadius: 3,
                }}>{o.option_name}</span>
              )}
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
export default function MenuScreen({ 
  createOrder, orders = [], totalAmount = 0, mySeat, 
  categories = [], menus = [], 
  optionsByMenu = new Map(),
  loading = false,
  wifiSsid = null,
  wifiPassword = null,
}) {
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedDrinkOptions, setSelectedDrinkOptions] = useState([]);
  const [ordering, setOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const sectionRefs = useRef({});

  const menuSections = categories.map(cat => {
    const items = menus
      .filter(m => m.category_id === cat.id)
      .map(m => {
        const opts = optionsByMenu.get(m.id) || [];
        const hasOpts = opts.length > 0;
        const minPrice = hasOpts ? Math.min(...opts.map(o => o.price)) : m.price;
        
        return {
          id: m.id,
          name: m.name,
          icon: m.icon,
          desc: m.description,
          abv: m.abv,
          taste: m.taste,
          priceNum: minPrice,
          price: minPrice.toLocaleString(),
          priceDisplay: hasOpts ? `${minPrice.toLocaleString()}~` : minPrice.toLocaleString(),
          image_url: m.image_url,
          hasOptions: hasOpts,
          options: opts,
          group_name: m.group_name || null,
          group_name_ja: m.group_name_ja || null,
          display_order: m.display_order || 0,
        };
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const colorMap = {
      "LIGHT LINE": { color: "#6AB06A", bg: "rgba(106,176,106,0.06)", border: "rgba(106,176,106,0.15)" },
      "DEEP LINE": { color: "#D4A537", bg: "rgba(212,165,55,0.06)", border: "rgba(212,165,55,0.15)" },
      "PREMIUM LINE": { color: "#C47AFF", bg: "rgba(196,122,255,0.06)", border: "rgba(196,122,255,0.15)" },
    };
    const fallback = colorMap[cat.name] || { color: "#D4A537", bg: "rgba(212,165,55,0.06)", border: "rgba(212,165,55,0.15)" };

    const itemsByGroup = [];
    const seenGroups = new Set();
    items.forEach(item => {
      const groupKey = item.group_name || '__no_group__';
      if (!seenGroups.has(groupKey)) {
        seenGroups.add(groupKey);
        itemsByGroup.push({
          groupName: item.group_name,
          groupNameJa: item.group_name_ja,
          items: [item],
        });
      } else {
        const last = itemsByGroup[itemsByGroup.length - 1];
        if ((last.groupName || '__no_group__') === groupKey) {
          last.items.push(item);
        } else {
          itemsByGroup.push({
            groupName: item.group_name,
            groupNameJa: item.group_name_ja,
            items: [item],
          });
        }
      }
    });

    return {
      id: cat.id,
      line: cat.name,
      price: cat.default_price?.toLocaleString() || "",
      priceNum: cat.default_price || 0,
      desc: cat.description || "",
      color: cat.color || fallback.color,
      bg: fallback.bg,
      border: fallback.border,
      items,
      groups: itemsByGroup,
    };
  });

  useEffect(() => {
    if (menuSections.length > 0 && !activeCategoryId) {
      setActiveCategoryId(menuSections[0].id);
    }
  }, [menuSections.length]);

  useEffect(() => {
    if (menuSections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        
        if (visible.length > 0) {
          const catId = visible[0].target.dataset.categoryId;
          if (catId) setActiveCategoryId(catId);
        }
      },
      {
        rootMargin: "-200px 0px -50% 0px",
        threshold: 0,
      }
    );

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [menuSections.length]);

  const handleTabClick = (catId) => {
    setActiveCategoryId(catId);
    const el = sectionRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 110;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleOrder = async (drink, selectedOption, quantity = 1) => {
    if (!createOrder) {
      alert("주문 기능을 사용할 수 없습니다");
      return;
    }
    if (ordering) return;

    enableSound();
    setOrdering(true);
    
    const finalPrice = selectedOption ? selectedOption.price : drink.priceNum;
    const finalMenuName = drink.name;
    
    const result = await createOrder({
      menuName: finalMenuName,
      menuIcon: drink.icon,
      price: finalPrice,
      optionId: selectedOption?.id || null,
      optionName: selectedOption?.name || null,
      quantity: quantity,
    });
    setOrdering(false);

    if (result) {
      playOrderSuccess();
      setSelectedDrink(null);
      setSelectedDrinkOptions([]);
      setOrderComplete({
        name: finalMenuName,
        icon: drink.icon,
        optionName: selectedOption?.name || null,
        quantity: quantity,
        unitPrice: finalPrice,
        totalPrice: finalPrice * quantity,
      });
    } else {
      alert("주문에 실패했어요. 다시 시도해주세요.");
    }
  };

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ padding: "0 clamp(16px, 4vw, 24px)" }}>
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

        <WifiCard ssid={wifiSsid} password={wifiPassword} />
      </div>

      {menuSections.length > 0 && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(13,11,8,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(212,165,55,0.15)",
          padding: "12px clamp(16px, 4vw, 24px)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {menuSections.map(section => {
              const isActive = activeCategoryId === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleTabClick(section.id)}
                  style={{
                    padding: "7px 14px",
                    background: isActive 
                      ? `linear-gradient(135deg, ${section.color}, ${section.color}CC)`
                      : "rgba(255,255,255,0.04)",
                    border: "1px solid " + (isActive ? "transparent" : "rgba(255,255,255,0.06)"),
                    color: isActive ? "#0D0B08" : "rgba(255,255,255,0.5)",
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    borderRadius: 100,
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  {section.line}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: "0 clamp(16px, 4vw, 24px) 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            메뉴를 불러오는 중...
          </div>
        ) : menuSections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            아직 등록된 메뉴가 없어요
          </div>
        ) : menuSections.map((section, si) => (
          <div
            key={section.id}
            ref={el => sectionRefs.current[section.id] = el}
            data-category-id={section.id}
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
                {section.desc && (
                  <div style={{
                    fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)",
                  }}>{section.desc}</div>
                )}
              </div>
              {section.price && (
                <div style={{
                  fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300,
                  color: section.color, fontFamily: "'Noto Serif KR', serif",
                  whiteSpace: "nowrap",
                }}>
                  {section.price}<span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>원</span>
                </div>
              )}
            </div>

            {section.groups.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 14 }}>
                {group.groupName && (
                  <div style={{
                    marginTop: gi === 0 ? 0 : 16,
                    marginBottom: 8,
                    padding: "7px 10px",
                    background: hexToRgba(section.color, 0.06),
                    borderLeft: `2px solid ${section.color}`,
                    borderRadius: "0 6px 6px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <span style={{
                      fontSize: "clamp(10px, 2.6vw, 11px)",
                      color: section.color,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}>
                      {group.groupName}
                    </span>
                    <span style={{
                      fontSize: "clamp(9px, 2.2vw, 10px)",
                      color: "rgba(255,255,255,0.4)",
                    }}>
                      · {group.items.length}종
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        setSelectedDrink(item);
                        setSelectedColor(section.color);
                        setSelectedDrinkOptions(item.options || []);
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
                      <div style={{
                        width: "clamp(44px, 11vw, 52px)", height: "clamp(44px, 11vw, 52px)",
                        borderRadius: 10, flexShrink: 0,
                        background: item.image_url ? "transparent" : section.bg,
                        border: "1px solid " + section.border,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "clamp(20px, 5.5vw, 24px)",
                        overflow: "hidden",
                      }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          item.icon
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "clamp(13px, 3.5vw, 14px)", fontWeight: 500, color: "#F5E6C8" }}>
                          {item.name}
                          {item.hasOptions && (
                            <span style={{
                              fontSize: 9, padding: "1px 5px", marginLeft: 5,
                              background: hexToRgba(section.color, 0.15),
                              color: section.color, borderRadius: 4, fontWeight: 600,
                            }}>
                              {item.options.length}옵션
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: "clamp(10px, 2.5vw, 11px)",
                          color: "rgba(255,255,255,0.3)", marginTop: 2,
                          display: "flex", gap: 8,
                        }}>
                          {item.taste && <span>{item.taste}</span>}
                          {item.abv && <span style={{ color: section.color }}>{item.abv}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: "clamp(12px, 3vw, 13px)",
                          color: section.color,
                          fontFamily: "'Noto Serif KR', serif",
                          fontWeight: 500,
                        }}>
                          {item.priceDisplay}원
                        </div>
                        <div style={{
                          fontSize: "clamp(9px, 2.2vw, 10px)", color: section.color, 
                          display: "flex", alignItems: "center", gap: 3, marginTop: 2,
                          justifyContent: "flex-end",
                        }}>
                          <ShoppingBag size={10} />
                          <span>{item.hasOptions ? "선택" : "주문"}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 주문 모달 */}
      <AnimatePresence>
        {selectedDrink && (
          <DrinkDetail
            drink={selectedDrink}
            lineColor={selectedColor}
            options={selectedDrinkOptions}
            onClose={() => {
              if (!ordering) {
                setSelectedDrink(null);
                setSelectedDrinkOptions([]);
              }
            }}
            onOrder={handleOrder}
            ordering={ordering}
          />
        )}
      </AnimatePresence>

      {/* 주문 완료 모달 */}
      <AnimatePresence>
        {orderComplete && (
          <OrderCompleteModal
            orderInfo={orderComplete}
            onClose={() => setOrderComplete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || hex[0] !== "#") return `rgba(212,165,55,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
