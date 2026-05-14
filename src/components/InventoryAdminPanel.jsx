import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Minus, AlertTriangle, Loader2, X, Check,
  ArrowDownToLine, Settings, History as HistoryIcon,
  MoreVertical, Pencil, Trash2, Archive, RotateCcw,
} from "lucide-react";
import { useInventory } from "../hooks/useInventory";

// ───────── 카테고리 정의 ─────────
const CATEGORIES = [
  { key: "all",     label: "전체",     icon: "📦" },
  { key: "spirit",  label: "베이스",   icon: "🥃" },
  { key: "liqueur", label: "리큐르",   icon: "🍹" },
  { key: "mixer",   label: "주스/믹서", icon: "🧃" },
  { key: "syrup",   label: "시럽",     icon: "🍯" },
  { key: "other",   label: "기타",     icon: "📦" },
];

const CATEGORY_OPTIONS_FOR_FORM = [
  { value: "spirit",  label: "🥃 베이스 (술)" },
  { value: "liqueur", label: "🍹 리큐르" },
  { value: "mixer",   label: "🧃 주스/믹서" },
  { value: "syrup",   label: "🍯 시럽" },
  { value: "other",   label: "📦 기타" },
];

const CATEGORY_LABEL = {
  spirit: "베이스",
  liqueur: "리큐르",
  mixer: "주스/믹서",
  syrup: "시럽",
  other: "기타",
};

// ───────── 헬퍼 함수 ─────────
function isLowStock(ing) {
  return ing.current_stock <= (ing.low_stock_threshold || 0);
}

function isCriticalStock(ing) {
  return ing.current_stock <= 0;
}

function calcBottles(ing) {
  if (!ing.bottle_size || ing.bottle_size <= 0) return "0";
  const ratio = ing.current_stock / ing.bottle_size;
  return ratio.toFixed(1);
}

function calcBarPercent(ing) {
  const max = (ing.bottle_size || 700) * 2;
  return Math.min(100, Math.max(0, (ing.current_stock / max) * 100));
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function groupByDay(movements) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  const groups = { today: [], yesterday: [], older: [] };
  movements.forEach((m) => {
    const d = new Date(m.created_at).toDateString();
    if (d === today) groups.today.push(m);
    else if (d === yesterday) groups.yesterday.push(m);
    else groups.older.push(m);
  });
  return groups;
}

// ───────── 재료 카드 (점 메뉴 인라인 통합) ─────────
function IngredientCard({ ing, onRestock, onAdjust, onEdit, onDelete, onRestore }) {
  const critical = isCriticalStock(ing);
  const low = isLowStock(ing) && !critical;
  const inactive = ing.is_active === false;
  const bottles = calcBottles(ing);
  const barPct = calcBarPercent(ing);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // 비활성 카드
  if (inactive) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.7, y: 0 }}
        style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 14, padding: "12px 14px", marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500, textDecoration: "line-through" }}>
              {ing.name}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
              비활성 · {CATEGORY_LABEL[ing.category]} · 재고 {ing.current_stock}ml
            </div>
          </div>
          <button
            onClick={() => onRestore(ing)}
            style={{
              padding: "6px 10px", borderRadius: 7,
              background: "rgba(106,176,106,0.1)",
              border: "1px solid rgba(106,176,106,0.3)",
              color: "#6AB06A", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 4,
            }}
          ><RotateCcw size={11} /> 복원</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "relative",  // ⭐ 자식 absolute의 기준점
        zIndex: menuOpen ? 100 : 1,  // ⭐ 메뉴 열렸을 때만 z-index 올림
        background: critical ? "rgba(226,75,74,0.08)"
                  : low      ? "rgba(226,75,74,0.04)"
                             : "rgba(255,255,255,0.02)",
        border: "1px solid " + (
          critical ? "rgba(226,75,74,0.35)"
                  : low      ? "rgba(226,75,74,0.2)"
                             : "rgba(255,255,255,0.06)"
        ),
        backdropFilter: "blur(16px)",
        borderRadius: 14, padding: "14px 16px", marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: "#F5E6C8", fontWeight: 500 }}>{ing.name}</div>
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3,
            display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap",
          }}>
            <span style={{
              padding: "1px 6px", borderRadius: 4,
              background: "rgba(212,165,55,0.12)",
              color: "rgba(212,165,55,0.85)",
              fontWeight: 600, fontSize: 9,
            }}>
              {CATEGORY_LABEL[ing.category] || "기타"}
            </span>
            <span>·</span>
            <span>{ing.bottle_size}ml/병</span>
            {(low || critical) && (
              <>
                <span>·</span>
                <span style={{ color: "rgba(226,75,74,0.85)" }}>
                  부족 기준 {ing.low_stock_threshold}ml
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
          <div style={{
            fontSize: 17, fontWeight: 500, fontFamily: "'Noto Serif KR', serif", lineHeight: 1,
            color: critical ? "#FF5050" : low ? "#E87A79" : "#D4A537",
          }}>
            {ing.current_stock.toLocaleString()}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 2, fontFamily: "'Pretendard', sans-serif", fontWeight: 400 }}>ml</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{bottles}병</div>
        </div>
      </div>

      <div style={{
        height: 4, background: "rgba(255,255,255,0.05)",
        borderRadius: 999, overflow: "hidden", marginBottom: 10,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: barPct + "%" }}
          transition={{ duration: 0.4 }}
          style={{
            height: "100%",
            background: critical ? "linear-gradient(90deg, #FF5050, #CC2020)"
                      : low      ? "linear-gradient(90deg, #E24B4A, #B03838)"
                                 : "linear-gradient(90deg, #D4A537, #B8861F)",
            borderRadius: 999,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onAdjust(ing)}
          style={{
            flex: 1, padding: 7, borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        ><Settings size={11} /> 조정</button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onRestock(ing)}
          style={{
            flex: 1, padding: 7, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(212,165,55,0.18), rgba(180,120,30,0.08))",
            border: "1px solid rgba(212,165,55,0.35)",
            color: "#D4A537",
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        ><ArrowDownToLine size={11} /> 입고</motion.button>

        {/* ━━━━━━ 점 메뉴 (카드 안 절대 위치) ━━━━━━ */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          ><MoreVertical size={14} /></button>

          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "absolute",
                top: 36,
                right: 0,
                zIndex: 200,
                minWidth: 140,
                background: "rgba(26,22,18,0.98)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                overflow: "hidden",
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(ing); setMenuOpen(false); }}
                style={{
                  width: "100%", padding: "10px 12px",
                  background: "transparent", border: "none",
                  color: "#F5E6C8", fontSize: 12, fontFamily: "inherit",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,165,55,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              ><Pencil size={12} /> 정보 편집</button>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(ing); setMenuOpen(false); }}
                style={{
                  width: "100%", padding: "10px 12px",
                  background: "transparent", border: "none",
                  color: "#E87A79", fontSize: 12, fontFamily: "inherit",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(226,75,74,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              ><Trash2 size={12} /> 삭제</button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ───────── 추가/편집 모달 ─────────
function IngredientFormModal({ mode, initial, onClose, onConfirm }) {
  const [name, setName] = useState(initial?.name || "");
  const [nameJa, setNameJa] = useState(initial?.name_ja || "");
  const [category, setCategory] = useState(initial?.category || "spirit");
  const [bottleSize, setBottleSize] = useState(initial?.bottle_size || 700);
  const [threshold, setThreshold] = useState(initial?.low_stock_threshold || 0);
  const [cost, setCost] = useState(initial?.cost_per_bottle || 0);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) return alert("재료명을 입력해주세요");
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      name_ja: nameJa.trim() || null,
      category,
      bottle_size: Number(bottleSize) || 700,
      low_stock_threshold: Number(threshold) || 0,
      cost_per_bottle: Number(cost) || 0,
    };
    const result = await onConfirm(payload);
    setSubmitting(false);
    if (result.success) onClose();
    else alert(result.error || "처리 실패");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflow: "auto",
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto",
          background: "#1A1612",
          border: "1px solid rgba(212,165,55,0.2)",
          borderRadius: 16, padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, color: "#F5E6C8", fontWeight: 500, fontFamily: "'Noto Serif KR', serif" }}>
              {mode === "create" ? "➕ 새 재료 추가" : "✏️ 재료 정보 편집"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
              {mode === "create" ? "재료의 기본 정보를 입력하세요" : initial?.name}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", padding: 4,
          }}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            재료명 <span style={{ color: "#E87A79" }}>*</span>
          </div>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="예: 짐빔"
            style={{
              width: "100%", padding: "10px 12px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "#F5E6C8",
              fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            일본어 <span style={{ color: "rgba(255,255,255,0.3)" }}>(선택)</span>
          </div>
          <input
            type="text" value={nameJa} onChange={(e) => setNameJa(e.target.value)}
            placeholder="예: ジムビーム"
            style={{
              width: "100%", padding: "10px 12px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "#F5E6C8",
              fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            카테고리 <span style={{ color: "#E87A79" }}>*</span>
          </div>
          <select
            value={category} onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "#F5E6C8",
              fontSize: 13, fontFamily: "inherit", outline: "none",
              cursor: "pointer",
            }}
          >
            {CATEGORY_OPTIONS_FOR_FORM.map((c) => (
              <option key={c.value} value={c.value} style={{ background: "#1A1612" }}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
              병 용량
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="number" value={bottleSize}
                onChange={(e) => setBottleSize(e.target.value)}
                min={0}
                style={{
                  width: "100%", padding: "10px 32px 10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, color: "#F5E6C8",
                  fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)", fontSize: 11, pointerEvents: "none",
              }}>ml</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
              부족 기준
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="number" value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                min={0}
                style={{
                  width: "100%", padding: "10px 32px 10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, color: "#F5E6C8",
                  fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)", fontSize: 11, pointerEvents: "none",
              }}>ml</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            병당 원가 <span style={{ color: "rgba(255,255,255,0.3)" }}>(선택)</span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="number" value={cost}
              onChange={(e) => setCost(e.target.value)}
              min={0}
              placeholder="0"
              style={{
                width: "100%", padding: "10px 32px 10px 12px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, color: "#F5E6C8",
                fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            />
            <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.4)", fontSize: 11, pointerEvents: "none",
            }}>원</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={submitting}
            style={{
              flex: 1, padding: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "rgba(255,255,255,0.6)",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >취소</button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={submitting || !name.trim()}
            style={{
              flex: 2, padding: 12,
              background: (submitting || !name.trim()) ? "rgba(212,165,55,0.3)" : "linear-gradient(135deg, #D4A537, #B8861F)",
              border: "none", borderRadius: 10,
              color: "#0D0B08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {submitting ? "처리 중..." : (mode === "create" ? "추가하기" : "수정 저장")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────── 삭제 확인 모달 ─────────
function DeleteConfirmModal({ ing, usage, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);
  const inUse = usage?.isInUse;

  const handleConfirm = async () => {
    setSubmitting(true);
    const result = await onConfirm(ing.id);
    setSubmitting(false);
    if (result.success) onClose();
    else alert(result.error || "삭제 실패");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400,
          background: "#1A1612",
          border: "1px solid " + (inUse ? "rgba(212,165,55,0.25)" : "rgba(226,75,74,0.3)"),
          borderRadius: 16, padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ fontSize: 15, color: "#F5E6C8", fontWeight: 500, fontFamily: "'Noto Serif KR', serif" }}>
            {inUse ? "📦 비활성화 확인" : "🗑️ 완전 삭제"}
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", padding: 4,
          }}><X size={16} /></button>
        </div>

        <div style={{
          padding: 14, marginBottom: 14,
          background: inUse ? "rgba(212,165,55,0.06)" : "rgba(226,75,74,0.06)",
          border: "1px solid " + (inUse ? "rgba(212,165,55,0.15)" : "rgba(226,75,74,0.2)"),
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 13, color: "#F5E6C8", marginBottom: 8 }}>
            <strong>"{ing.name}"</strong>
          </div>

          {inUse ? (
            <>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10 }}>
                이 재료는 사용 중입니다:
              </div>
              <ul style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", paddingLeft: 16, marginBottom: 10, lineHeight: 1.8 }}>
                {usage.recipeCount > 0 && <li>📋 메뉴 레시피 {usage.recipeCount}개</li>}
                {usage.movementCount > 0 && <li>📊 입출고 이력 {usage.movementCount}건</li>}
              </ul>
              <div style={{
                padding: 10,
                background: "rgba(212,165,55,0.08)",
                border: "1px solid rgba(212,165,55,0.2)",
                borderRadius: 8,
                fontSize: 11, color: "rgba(212,165,55,0.9)",
                lineHeight: 1.6,
              }}>
                📌 <strong>비활성화만 됩니다.</strong><br/>
                목록에서 숨겨지지만 데이터는 안전하게 보존되어
                나중에 복원할 수 있어요.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10 }}>
                이 재료는 사용 이력이 없어 완전히 삭제됩니다.
              </div>
              <div style={{
                padding: 10,
                background: "rgba(226,75,74,0.08)",
                border: "1px solid rgba(226,75,74,0.2)",
                borderRadius: 8,
                fontSize: 11, color: "rgba(255,180,180,0.9)",
                lineHeight: 1.6,
              }}>
                ❌ <strong>이 작업은 되돌릴 수 없습니다.</strong>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={submitting}
            style={{
              flex: 1, padding: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "rgba(255,255,255,0.6)",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >취소</button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              flex: 2, padding: 12,
              background: submitting ? "rgba(150,150,150,0.3)"
                       : inUse      ? "linear-gradient(135deg, #D4A537, #B8861F)"
                                    : "linear-gradient(135deg, #E24B4A, #B03838)",
              border: "none", borderRadius: 10,
              color: inUse ? "#0D0B08" : "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {submitting ? "처리 중..." : (
              <>
                {inUse ? <><Archive size={13} /> 비활성화</> : <><Trash2 size={13} /> 완전 삭제</>}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────── 입고 모달 ─────────
function RestockModal({ ing, onClose, onConfirm }) {
  const [bottles, setBottles] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const totalMl = bottles * (ing.bottle_size || 0);
  const afterStock = (ing.current_stock || 0) + totalMl;

  const handleConfirm = async () => {
    if (bottles <= 0) return;
    setSubmitting(true);
    const result = await onConfirm(ing.id, bottles);
    setSubmitting(false);
    if (result.success) onClose();
    else alert(result.error || "입고 처리 실패");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400,
          background: "#1A1612",
          border: "1px solid rgba(212,165,55,0.2)",
          borderRadius: 16, padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontSize: 15, color: "#F5E6C8", fontWeight: 500, fontFamily: "'Noto Serif KR', serif" }}>
            📥 {ing.name} 입고
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", padding: 4,
          }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
          몇 병을 입고하시겠어요?
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: 14,
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(212,165,55,0.15)",
          borderRadius: 10, marginBottom: 14,
        }}>
          <button
            onClick={() => setBottles(Math.max(1, bottles - 1))}
            style={{
              width: 36, height: 36,
              background: "rgba(212,165,55,0.1)",
              border: "1px solid rgba(212,165,55,0.3)",
              borderRadius: 8, color: "#D4A537",
              fontSize: 18, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          ><Minus size={16} /></button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 36, color: "#D4A537", fontWeight: 300, fontFamily: "'Noto Serif KR', serif", lineHeight: 1 }}>
              {bottles}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              병 · 총 {totalMl.toLocaleString()}ml
            </div>
          </div>
          <button
            onClick={() => setBottles(bottles + 1)}
            style={{
              width: 36, height: 36,
              background: "rgba(212,165,55,0.1)",
              border: "1px solid rgba(212,165,55,0.3)",
              borderRadius: 8, color: "#D4A537",
              fontSize: 18, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          ><Plus size={16} /></button>
        </div>

        <div style={{ fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>병 용량</span>
            <span style={{ color: "#F5E6C8", fontWeight: 500 }}>{ing.bottle_size}ml</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>현재 재고</span>
            <span style={{ color: "#F5E6C8", fontWeight: 500 }}>{ing.current_stock.toLocaleString()}ml</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>입고 후 재고</span>
            <span style={{ color: "#D4A537", fontWeight: 600, fontFamily: "'Noto Serif KR', serif", fontSize: 16 }}>
              {afterStock.toLocaleString()}ml
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={submitting}
            style={{
              flex: 1, padding: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "rgba(255,255,255,0.6)",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >취소</button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              flex: 2, padding: 12,
              background: submitting ? "rgba(212,165,55,0.3)" : "linear-gradient(135deg, #D4A537, #B8861F)",
              border: "none", borderRadius: 10,
              color: "#0D0B08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {submitting ? "처리 중..." : "입고 확정"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────── 조정 모달 ─────────
function AdjustModal({ ing, onClose, onConfirm }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const afterStock = (ing.current_stock || 0) + delta;

  const handleConfirm = async () => {
    if (delta === 0) return alert("조정량을 입력해주세요");
    if (!reason.trim()) return alert("조정 사유를 입력해주세요");
    setSubmitting(true);
    const result = await onConfirm(ing.id, delta, reason);
    setSubmitting(false);
    if (result.success) onClose();
    else alert(result.error || "조정 실패");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400,
          background: "#1A1612",
          border: "1px solid rgba(196,122,255,0.25)",
          borderRadius: 16, padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontSize: 15, color: "#F5E6C8", fontWeight: 500, fontFamily: "'Noto Serif KR', serif" }}>
            ⚙️ {ing.name} 수동 조정
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", padding: 4,
          }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
          파손/감모/실측 보정용 (현재 {ing.current_stock}ml)
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>조정량 (+증가 / −감소)</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[-100, -50, -10, +10, +50, +100].map((v) => (
              <button key={v} onClick={() => setDelta(delta + v)}
                style={{
                  flex: 1, padding: 8,
                  background: v < 0 ? "rgba(226,75,74,0.08)" : "rgba(106,176,106,0.08)",
                  border: "1px solid " + (v < 0 ? "rgba(226,75,74,0.2)" : "rgba(106,176,106,0.2)"),
                  borderRadius: 7, color: v < 0 ? "#E87A79" : "#6AB06A",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >{v > 0 ? "+" : ""}{v}</button>
            ))}
          </div>
        </div>

        <div style={{
          padding: 14, background: "rgba(0,0,0,0.3)",
          border: "1px solid " + (delta < 0 ? "rgba(226,75,74,0.2)" : delta > 0 ? "rgba(106,176,106,0.2)" : "rgba(255,255,255,0.08)"),
          borderRadius: 10, marginBottom: 12, textAlign: "center",
        }}>
          <div style={{
            fontSize: 28, fontWeight: 300, fontFamily: "'Noto Serif KR', serif", lineHeight: 1,
            color: delta < 0 ? "#E87A79" : delta > 0 ? "#6AB06A" : "rgba(255,255,255,0.3)",
          }}>
            {delta > 0 ? "+" : ""}{delta}<span style={{ fontSize: 13, marginLeft: 2 }}>ml</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
            조정 후: {afterStock.toLocaleString()}ml
          </div>
          <button onClick={() => setDelta(0)}
            style={{
              marginTop: 6, padding: "3px 10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "rgba(255,255,255,0.5)",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit",
            }}
          >리셋</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>사유 (필수)</div>
          <input
            type="text" value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 병 파손, 실측 보정, 시음용 등"
            style={{
              width: "100%", padding: "10px 12px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "#F5E6C8",
              fontSize: 12, fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={submitting}
            style={{
              flex: 1, padding: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "rgba(255,255,255,0.6)",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >취소</button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={submitting || delta === 0 || !reason.trim()}
            style={{
              flex: 2, padding: 12,
              background: (submitting || delta === 0 || !reason.trim()) ? "rgba(196,122,255,0.3)" : "linear-gradient(135deg, #C47AFF, #9540D9)",
              border: "none", borderRadius: 10,
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {submitting ? "처리 중..." : "조정 확정"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────── 이력 항목 ─────────
function MovementItem({ m }) {
  const isOut = m.movement_type === "out" || m.movement_type === "adjust_out";
  const isAdjust = m.movement_type === "adjust_in" || m.movement_type === "adjust_out";

  const iconBg = isAdjust ? "rgba(196,122,255,0.1)"
              : isOut    ? "rgba(226,75,74,0.1)"
                         : "rgba(106,176,106,0.1)";
  const iconColor = isAdjust ? "#C47AFF" : isOut ? "#E87A79" : "#6AB06A";
  const amountColor = isAdjust ? "#C47AFF" : isOut ? "#E87A79" : "#6AB06A";
  const sign = isOut ? "−" : "+";
  const iconChar = isAdjust ? "⚙" : isOut ? "−" : "+";

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 14px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 10, marginBottom: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 600, flexShrink: 0,
        }}>{iconChar}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: "#F5E6C8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.ingredient?.name || "(삭제된 재료)"}
          </div>
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {m.reason || "이력"} · {formatTime(m.created_at)}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 500, fontFamily: "'Noto Serif KR', serif",
        color: amountColor, flexShrink: 0, marginLeft: 8,
      }}>
        {sign}{m.amount}ml
      </div>
    </div>
  );
}

// ───────── 메인 패널 ─────────
export default function InventoryAdminPanel({ storeId }) {
  const [showInactive, setShowInactive] = useState(false);

  const {
    ingredients, movements, loading, lowStockCount,
    restock, adjust,
    createIngredient, updateIngredient, deleteIngredient, restoreIngredient,
    checkIngredientUsage,
  } = useInventory(storeId, { includeInactive: showInactive });

  const [subTab, setSubTab] = useState("status");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [restockTarget, setRestockTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const categoryCounts = useMemo(() => {
    const activeOnly = ingredients.filter((i) => i.is_active !== false);
    const counts = { all: activeOnly.length };
    activeOnly.forEach((ing) => {
      counts[ing.category] = (counts[ing.category] || 0) + 1;
    });
    return counts;
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    let list = categoryFilter === "all"
      ? ingredients
      : ingredients.filter((i) => i.category === categoryFilter);
    return [...list].sort((a, b) => {
      if (a.is_active === false && b.is_active !== false) return 1;
      if (b.is_active === false && a.is_active !== false) return -1;
      return (a.display_order || 0) - (b.display_order || 0);
    });
  }, [ingredients, categoryFilter]);

  const activeIngredients = filteredIngredients.filter((i) => i.is_active !== false);
  const inactiveIngredients = filteredIngredients.filter((i) => i.is_active === false);
  const lowStockIngs = activeIngredients.filter(isLowStock);
  const normalIngs = activeIngredients.filter((i) => !isLowStock(i));

  const groupedMovements = useMemo(() => groupByDay(movements), [movements]);

  const handleDeleteClick = async (ing) => {
    const usage = await checkIngredientUsage(ing.id);
    setDeleteTarget({ ing, usage });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-block", color: "rgba(212,165,55,0.4)" }}>
          <Loader2 size={32} />
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, padding: "0 4px" }}>
        <div style={{ fontSize: 16, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", fontWeight: 500 }}>
          📦 재고 관리
        </div>
        {lowStockCount > 0 && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              padding: "4px 10px",
              background: "rgba(226,75,74,0.12)",
              border: "1px solid rgba(226,75,74,0.3)",
              borderRadius: 8, color: "#E87A79",
              fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <AlertTriangle size={11} /> 부족 {lowStockCount}개
          </motion.div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", padding: "0 4px", marginBottom: 14 }}>
        현재 재고와 부족한 재료를 확인하세요
      </div>

      <div style={{
        display: "flex", gap: 4, marginBottom: 14,
        padding: 4, background: "rgba(255,255,255,0.02)",
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)",
      }}>
        {[
          { key: "status",  label: "📊 현황" },
          { key: "restock", label: "📥 입고" },
          { key: "history", label: "📋 이력" },
        ].map((t) => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{
              flex: 1, padding: 9, borderRadius: 9, border: "none",
              background: subTab === t.key ? "rgba(212,165,55,0.15)" : "transparent",
              color: subTab === t.key ? "#D4A537" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >{t.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === "status" && (
          <motion.div key="status"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormTarget({ mode: "create", initial: null })}
                style={{
                  flex: 1, padding: "10px 12px",
                  background: "linear-gradient(135deg, rgba(212,165,55,0.18), rgba(180,120,30,0.08))",
                  border: "1px solid rgba(212,165,55,0.35)",
                  borderRadius: 10,
                  color: "#D4A537",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Plus size={14} /> 재료 추가
              </motion.button>
              <button
                onClick={() => setShowInactive(!showInactive)}
                style={{
                  padding: "10px 14px",
                  background: showInactive ? "rgba(196,122,255,0.12)" : "rgba(255,255,255,0.03)",
                  border: "1px solid " + (showInactive ? "rgba(196,122,255,0.3)" : "rgba(255,255,255,0.06)"),
                  borderRadius: 10,
                  color: showInactive ? "#C47AFF" : "rgba(255,255,255,0.5)",
                  fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <Archive size={12} />
                {showInactive ? "보관함 보는중" : "보관함"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
              {CATEGORIES.map((c) => {
                const count = categoryCounts[c.key] || 0;
                if (c.key !== "all" && count === 0) return null;
                const active = categoryFilter === c.key;
                return (
                  <button key={c.key} onClick={() => setCategoryFilter(c.key)}
                    style={{
                      padding: "6px 12px",
                      background: active ? "rgba(212,165,55,0.12)" : "rgba(255,255,255,0.03)",
                      border: "1px solid " + (active ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.06)"),
                      borderRadius: 999,
                      color: active ? "#D4A537" : "rgba(255,255,255,0.5)",
                      fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >{c.icon} {c.label} {count}</button>
                );
              })}
            </div>

            {lowStockIngs.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", padding: "0 4px" }}>
                  <span style={{
                    fontSize: 10, letterSpacing: "0.15em",
                    color: "rgba(226,75,74,0.7)", fontWeight: 600,
                    textTransform: "uppercase", fontFamily: "'Noto Serif KR', serif",
                  }}>⚠ 부족한 재료</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(226,75,74,0.15)" }} />
                </div>
                <AnimatePresence>
                  {lowStockIngs.map((ing) => (
                    <IngredientCard
                      key={ing.id} ing={ing}
                      onRestock={setRestockTarget}
                      onAdjust={setAdjustTarget}
                      onEdit={(i) => setFormTarget({ mode: "edit", initial: i })}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </AnimatePresence>
              </>
            )}

            {normalIngs.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", padding: "0 4px" }}>
                  <span style={{
                    fontSize: 10, letterSpacing: "0.15em",
                    color: "rgba(212,165,55,0.5)", fontWeight: 600,
                    textTransform: "uppercase", fontFamily: "'Noto Serif KR', serif",
                  }}>정상</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(212,165,55,0.1)" }} />
                </div>
                <AnimatePresence>
                  {normalIngs.map((ing) => (
                    <IngredientCard
                      key={ing.id} ing={ing}
                      onRestock={setRestockTarget}
                      onAdjust={setAdjustTarget}
                      onEdit={(i) => setFormTarget({ mode: "edit", initial: i })}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </AnimatePresence>
              </>
            )}

            {showInactive && inactiveIngredients.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", padding: "0 4px" }}>
                  <span style={{
                    fontSize: 10, letterSpacing: "0.15em",
                    color: "rgba(196,122,255,0.6)", fontWeight: 600,
                    textTransform: "uppercase", fontFamily: "'Noto Serif KR', serif",
                  }}>📦 보관함 ({inactiveIngredients.length})</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(196,122,255,0.15)" }} />
                </div>
                <AnimatePresence>
                  {inactiveIngredients.map((ing) => (
                    <IngredientCard
                      key={ing.id} ing={ing}
                      onRestock={setRestockTarget}
                      onAdjust={setAdjustTarget}
                      onEdit={(i) => setFormTarget({ mode: "edit", initial: i })}
                      onDelete={handleDeleteClick}
                      onRestore={(i) => restoreIngredient(i.id)}
                    />
                  ))}
                </AnimatePresence>
              </>
            )}

            {filteredIngredients.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>📦</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                  이 카테고리에 재료가 없어요
                </div>
              </div>
            )}
          </motion.div>
        )}

        {subTab === "restock" && (
          <motion.div key="restock"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{
              padding: 14, marginBottom: 14,
              background: "linear-gradient(135deg, rgba(212,165,55,0.06), rgba(180,120,30,0.02))",
              border: "1px solid rgba(212,165,55,0.15)",
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500, marginBottom: 4 }}>
                💡 입고할 재료를 선택하세요
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                병 개수만 입력하면 자동으로 ml 환산되어 재고에 추가됩니다
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
              {CATEGORIES.map((c) => {
                const count = categoryCounts[c.key] || 0;
                if (c.key !== "all" && count === 0) return null;
                const active = categoryFilter === c.key;
                return (
                  <button key={c.key} onClick={() => setCategoryFilter(c.key)}
                    style={{
                      padding: "6px 12px",
                      background: active ? "rgba(212,165,55,0.12)" : "rgba(255,255,255,0.03)",
                      border: "1px solid " + (active ? "rgba(212,165,55,0.3)" : "rgba(255,255,255,0.06)"),
                      borderRadius: 999,
                      color: active ? "#D4A537" : "rgba(255,255,255,0.5)",
                      fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >{c.icon} {c.label} {count}</button>
                );
              })}
            </div>

            {activeIngredients.map((ing) => (
              <motion.button
                key={ing.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => setRestockTarget(ing)}
                style={{
                  width: "100%",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", marginBottom: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#F5E6C8", fontWeight: 500 }}>{ing.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {CATEGORY_LABEL[ing.category]} · {ing.bottle_size}ml/병 · 현재 {ing.current_stock}ml
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 10px",
                  background: "rgba(212,165,55,0.12)",
                  border: "1px solid rgba(212,165,55,0.3)",
                  borderRadius: 7, color: "#D4A537",
                  fontSize: 11, fontWeight: 600,
                }}>
                  <ArrowDownToLine size={11} /> 입고
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {subTab === "history" && (
          <motion.div key="history"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {movements.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                  아직 이력이 없어요
                </div>
              </div>
            ) : (
              <>
                {groupedMovements.today.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 10px", padding: "0 4px" }}>
                      <span style={{
                        fontSize: 10, letterSpacing: "0.15em",
                        color: "rgba(212,165,55,0.5)", fontWeight: 600,
                        textTransform: "uppercase", fontFamily: "'Noto Serif KR', serif",
                      }}>오늘</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(212,165,55,0.1)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{groupedMovements.today.length}건</span>
                    </div>
                    {groupedMovements.today.map((m) => <MovementItem key={m.id} m={m} />)}
                  </>
                )}
                {groupedMovements.yesterday.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", padding: "0 4px" }}>
                      <span style={{
                        fontSize: 10, letterSpacing: "0.15em",
                        color: "rgba(212,165,55,0.5)", fontWeight: 600,
                        textTransform: "uppercase", fontFamily: "'Noto Serif KR', serif",
                      }}>어제</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(212,165,55,0.1)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{groupedMovements.yesterday.length}건</span>
                    </div>
                    {groupedMovements.yesterday.map((m) => <MovementItem key={m.id} m={m} />)}
                  </>
                )}
                {groupedMovements.older.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", padding: "0 4px" }}>
                      <span style={{
                        fontSize: 10, letterSpacing: "0.15em",
                        color: "rgba(212,165,55,0.5)", fontWeight: 600,
                        textTransform: "uppercase", fontFamily: "'Noto Serif KR', serif",
                      }}>이전</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(212,165,55,0.1)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{groupedMovements.older.length}건</span>
                    </div>
                    {groupedMovements.older.map((m) => <MovementItem key={m.id} m={m} />)}
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {restockTarget && (
          <RestockModal
            key="restock-modal"
            ing={restockTarget}
            onClose={() => setRestockTarget(null)}
            onConfirm={restock}
          />
        )}
        {adjustTarget && (
          <AdjustModal
            key="adjust-modal"
            ing={adjustTarget}
            onClose={() => setAdjustTarget(null)}
            onConfirm={adjust}
          />
        )}
        {formTarget && (
          <IngredientFormModal
            key="form-modal"
            mode={formTarget.mode}
            initial={formTarget.initial}
            onClose={() => setFormTarget(null)}
            onConfirm={(payload) =>
              formTarget.mode === "create"
                ? createIngredient(payload)
                : updateIngredient(formTarget.initial.id, payload)
            }
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            key="delete-modal"
            ing={deleteTarget.ing}
            usage={deleteTarget.usage}
            onClose={() => setDeleteTarget(null)}
            onConfirm={deleteIngredient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
