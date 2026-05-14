import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/**
 * ManualOrderModal - 사장님이 손님 좌석에 메뉴를 직접 추가하는 모달
 *
 * Props:
 *  - session: 대상 세션 (필수)
 *  - categories: 카테고리 목록
 *  - menus: 메뉴 목록
 *  - optionsByMenu: Map<menuId, options[]>
 *  - onClose: 닫기 콜백
 *  - onSuccess: 성공 시 콜백 (toast 메시지 받음)
 */
export default function ManualOrderModal({
  session,
  categories = [],
  menus = [],
  optionsByMenu = new Map(),
  onClose,
  onSuccess,
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 카테고리 필터링 + 정렬
  const filteredMenus = useMemo(() => {
    let list = menus.filter((m) => m.is_active !== false);
    if (selectedCategoryId !== "all") {
      list = list.filter((m) => m.category_id === selectedCategoryId);
    }
    return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [menus, selectedCategoryId]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    [categories]
  );

  const currentOptions = selectedMenu ? (optionsByMenu.get(selectedMenu.id) || []) : [];
  const hasOptions = currentOptions.length > 0;

  // 가격 계산
  const unitPrice = useMemo(() => {
    if (!selectedMenu) return 0;
    if (hasOptions) {
      const opt = currentOptions.find((o) => o.id === selectedOptionId);
      return opt?.price || 0;
    }
    return selectedMenu.price || 0;
  }, [selectedMenu, hasOptions, currentOptions, selectedOptionId]);

  const totalPrice = unitPrice * quantity;

  const handleSelectMenu = (menu) => {
    setSelectedMenu(menu);
    setSelectedOptionId(null);
    setQuantity(1);
    const opts = optionsByMenu.get(menu.id) || [];
    if (opts.length > 0) {
      const cheapest = [...opts].sort((a, b) => a.price - b.price)[0];
      setSelectedOptionId(cheapest.id);
    }
  };

  const canSubmit = selectedMenu && (!hasOptions || selectedOptionId) && quantity > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !session) return;
    setSubmitting(true);

    try {
      const selectedOption = hasOptions
        ? currentOptions.find((o) => o.id === selectedOptionId)
        : null;

      // 수량만큼 orders 행 생성
      const orderRows = Array.from({ length: quantity }, () => ({
        session_id: session.id,
        seat_label: session.seat_label,
        menu_name: selectedMenu.name,
        menu_icon: selectedMenu.icon || "🍸",
        option_name: selectedOption?.name || null,
        price: unitPrice,
        status: "pending",
        memo: memo.trim() || null,
        is_manual: true,
      }));

      const { error } = await supabase.from("orders").insert(orderRows);

      if (error) {
        console.error("수동 주문 추가 실패:", error);
        alert("주문 추가에 실패했어요: " + error.message);
        setSubmitting(false);
        return;
      }

      await supabase
        .from("sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", session.id);

      const optionLabel = selectedOption ? ` (${selectedOption.name})` : "";
      const qtyLabel = quantity > 1 ? ` ×${quantity}` : "";
      onSuccess?.(`${session.seat_label}에 "${selectedMenu.name}${optionLabel}"${qtyLabel} 추가됨`);
      onClose();
    } catch (err) {
      console.error("수동 주문 예외:", err);
      alert("오류가 발생했어요: " + err.message);
      setSubmitting(false);
    }
  };

  const renderMenuItem = (menu) => {
    const opts = optionsByMenu.get(menu.id) || [];
    const isSelected = selectedMenu?.id === menu.id;
    const displayPrice = opts.length > 0
      ? `${Math.min(...opts.map((o) => o.price)).toLocaleString()}원~`
      : `${(menu.price || 0).toLocaleString()}원`;

    return (
      <motion.div
        key={menu.id}
        onClick={() => handleSelectMenu(menu)}
        whileTap={{ scale: 0.98 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: isSelected ? "rgba(212,165,55,0.1)" : "rgba(255,255,255,0.02)",
          border: "1px solid " + (isSelected ? "rgba(212,165,55,0.4)" : "rgba(255,255,255,0.04)"),
          borderRadius: 9,
          marginBottom: 6,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: "rgba(212,165,55,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>
          {menu.icon || "🍸"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500, marginBottom: 2 }}>
            {menu.name}
            {menu.group_name && (
              <span style={{
                fontSize: 9, color: "rgba(212,165,55,0.6)", marginLeft: 6,
                padding: "1px 5px", background: "rgba(212,165,55,0.08)", borderRadius: 4,
              }}>
                {menu.group_name}
              </span>
            )}
          </div>
          {(menu.abv || menu.taste) && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              {[menu.abv, menu.taste].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 12, color: isSelected ? "#D4A537" : "rgba(212,165,55,0.7)",
          fontFamily: "'Noto Serif KR', serif",
          flexShrink: 0, fontWeight: isSelected ? 600 : 400,
        }}>
          {isSelected ? "선택됨 ✓" : displayPrice}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: 380,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "linear-gradient(135deg, rgba(40,30,20,0.98), rgba(20,15,10,0.98))",
          border: "1px solid rgba(212,165,55,0.3)",
          borderRadius: 18,
          padding: 24,
          position: "relative",
          fontFamily: "'Pretendard', -apple-system, sans-serif",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12,
          width: 32, height: 32,
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
          color: "rgba(255,255,255,0.5)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={14} />
        </button>

        <div style={{
          fontSize: 18, color: "#F5E6C8",
          fontFamily: "'Noto Serif KR', serif",
          fontWeight: 500, marginBottom: 4,
        }}>
          + 주문 추가
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
          손님 좌석에 메뉴를 직접 추가합니다
        </div>

        {/* 좌석 정보 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: "rgba(212,165,55,0.08)",
          border: "1px solid rgba(212,165,55,0.2)",
          borderRadius: 10,
          marginBottom: 16,
        }}>
          <span style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 17, color: "#D4A537", fontWeight: 600,
          }}>
            📍 {session.seat_label}
          </span>
          <span style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {session.avatar || "🥃"} {session.nickname || "손님"}
          </span>
        </div>

        {/* 카테고리 탭 */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 14,
          overflowX: "auto", paddingBottom: 4,
          msOverflowStyle: "none", scrollbarWidth: "none",
        }}>
          <button
            onClick={() => setSelectedCategoryId("all")}
            style={{
              padding: "6px 12px", borderRadius: 100,
              background: selectedCategoryId === "all" ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)",
              border: "1px solid " + (selectedCategoryId === "all" ? "rgba(212,165,55,0.4)" : "rgba(255,255,255,0.06)"),
              color: selectedCategoryId === "all" ? "#D4A537" : "rgba(255,255,255,0.5)",
              fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            전체
          </button>
          {sortedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              style={{
                padding: "6px 12px", borderRadius: 100,
                background: selectedCategoryId === cat.id ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)",
                border: "1px solid " + (selectedCategoryId === cat.id ? (cat.color || "#D4A537") + "66" : "rgba(255,255,255,0.06)"),
                color: selectedCategoryId === cat.id ? (cat.color || "#D4A537") : "rgba(255,255,255,0.5)",
                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 메뉴 리스트 */}
        <div style={{
          maxHeight: selectedMenu ? 180 : 320,
          overflowY: "auto",
          marginBottom: 14,
          transition: "max-height 0.3s",
        }}>
          {filteredMenus.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "30px 0",
              fontSize: 12, color: "rgba(255,255,255,0.3)",
            }}>
              메뉴가 없어요
            </div>
          ) : (
            filteredMenus.map(renderMenuItem)
          )}
        </div>

        {/* 선택된 메뉴 패널 */}
        <AnimatePresence>
          {selectedMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                padding: 12,
                background: "rgba(212,165,55,0.06)",
                border: "1px solid rgba(212,165,55,0.2)",
                borderRadius: 10,
                marginBottom: 14,
              }}
            >
              {hasOptions && (
                <>
                  <div style={{
                    fontSize: 10, color: "rgba(212,165,55,0.7)",
                    letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600,
                  }}>
                    옵션 선택
                  </div>
                  <div style={{
                    display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap",
                  }}>
                    {currentOptions.map((opt) => {
                      const isActive = selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOptionId(opt.id)}
                          style={{
                            flex: "1 1 auto", minWidth: 80,
                            padding: 8,
                            background: isActive ? "rgba(212,165,55,0.18)" : "rgba(255,255,255,0.03)",
                            border: "1px solid " + (isActive ? "rgba(212,165,55,0.5)" : "rgba(255,255,255,0.06)"),
                            borderRadius: 8,
                            color: isActive ? "#D4A537" : "rgba(255,255,255,0.7)",
                            fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                            fontWeight: isActive ? 700 : 500,
                          }}
                        >
                          {opt.name} {opt.price.toLocaleString()}원
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={{
                fontSize: 10, color: "rgba(212,165,55,0.7)",
                letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600,
              }}>
                수량
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 14, padding: 6,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 9, marginBottom: 12,
              }}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: "rgba(212,165,55,0.12)",
                    border: "1px solid rgba(212,165,55,0.2)",
                    color: "#D4A537", fontSize: 16, fontWeight: 700,
                    cursor: quantity <= 1 ? "not-allowed" : "pointer",
                    opacity: quantity <= 1 ? 0.4 : 1,
                    fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Minus size={14} />
                </button>
                <span style={{
                  fontSize: 17, fontWeight: 600, color: "#F5E6C8",
                  minWidth: 30, textAlign: "center",
                  fontFamily: "'Noto Serif KR', serif",
                }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: "rgba(212,165,55,0.12)",
                    border: "1px solid rgba(212,165,55,0.2)",
                    color: "#D4A537", fontSize: 16, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모 (선택) - 예: 얼음 적게"
                maxLength={50}
                style={{
                  width: "100%", padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  color: "#F5E6C8", fontSize: 11,
                  fontFamily: "inherit", outline: "none",
                  marginBottom: 10,
                  boxSizing: "border-box",
                }}
              />

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 4px",
                borderTop: "1px dashed rgba(212,165,55,0.2)",
              }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>합계</span>
                <span style={{
                  fontSize: 18, color: "#D4A537", fontWeight: 600,
                  fontFamily: "'Noto Serif KR', serif",
                }}>
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            취소
          </button>
          <motion.button
            whileTap={canSubmit ? { scale: 0.96 } : {}}
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1.5, padding: 12, borderRadius: 10,
              background: canSubmit
                ? "linear-gradient(135deg, #D4A537, #B8860B)"
                : "rgba(255,255,255,0.05)",
              border: "none",
              color: canSubmit ? "#0D0B08" : "rgba(255,255,255,0.3)",
              fontSize: 12, fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {submitting ? (
              "추가 중..."
            ) : (
              <><Check size={13} /> + 추가</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
