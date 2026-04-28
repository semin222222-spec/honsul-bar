import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown } from "lucide-react";
import { autoTranslateMenu, translateText } from "../lib/translateService";

// 사용 가능한 이모지 목록 (메뉴 아이콘용)
const ICON_OPTIONS = [
  "🥃", "🍸", "🍷", "🍹", "🫧", "🍾",
  "🍋", "🍊", "🍑", "🍈", "🍏", "🍒",
  "🌸", "🌿", "🌊", "🌙", "✨", "💫",
  "☕", "🫖", "🍯", "🧂", "🌶️", "🫚",
  "🏖️", "🎩", "🎭", "🔴", "⚫", "🖤",
];

// ────── 카테고리 모달 ──────
function CategoryModal({ category, onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name || "");
  const [price, setPrice] = useState(category?.default_price || "");
  const [color, setColor] = useState(category?.color || "#D4A537");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert("카테고리 이름을 입력해주세요");
    setSaving(true);
    await onSave({
      name: name.trim(),
      default_price: parseInt(price) || 0,
      color,
    });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          width: "100%", maxWidth: 380,
          background: "rgba(20,18,14,0.97)",
          borderRadius: 18,
          border: "1px solid rgba(212,165,55,0.3)",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", marginBottom: 4 }}>
          {category ? "카테고리 수정" : "새 카테고리 추가"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>
          메뉴를 분류할 카테고리
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, color: "rgba(212,165,55,0.6)", marginBottom: 5, letterSpacing: "0.05em" }}>
            카테고리 이름
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: SIGNATURE LINE"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>기본 가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="9900"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>강조 색상</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ ...inputStyle, height: 38, padding: 4, cursor: "pointer" }}
            />
          </div>
        </div>

        {/* 미리보기 */}
        <div style={{
          padding: 12,
          background: hexToRgba(color, 0.06),
          border: `1px solid ${hexToRgba(color, 0.2)}`,
          borderRadius: 9,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 4 }}>
            ● {name || "(이름 없음)"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            {price ? `${parseInt(price).toLocaleString()}원` : "(가격 미설정)"} · 미리보기
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {category && onDelete && (
            <button
              onClick={() => {
                if (confirm(`"${category.name}" 카테고리를 삭제하시겠어요?\n속한 메뉴는 카테고리 없음 상태가 됩니다.`)) {
                  onDelete();
                }
              }}
              style={{ ...btnStyle, ...deleteBtnStyle }}
            >
              🗑️
            </button>
          )}
          <button onClick={onClose} style={{ ...btnStyle, ...cancelBtnStyle, flex: 1 }}>
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...btnStyle, ...saveBtnStyle, flex: 1.5, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "..." : "저장"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ────── 메뉴 모달 ──────
function MenuModal({ menu, categories, onClose, onSave, onDelete }) {
  const [name, setName] = useState(menu?.name || "");
  const [icon, setIcon] = useState(menu?.icon || "🍸");
  const [price, setPrice] = useState(menu?.price || "");
  const [categoryId, setCategoryId] = useState(menu?.category_id || categories[0]?.id || "");
  const [abv, setAbv] = useState(menu?.abv || "");
  const [taste, setTaste] = useState(menu?.taste || "");
  const [description, setDescription] = useState(menu?.description || "");
  const [isActive, setIsActive] = useState(menu?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // 카테고리 변경하면 기본 가격 자동 채움 (새 메뉴 추가 시)
  const handleCategoryChange = (newCatId) => {
    setCategoryId(newCatId);
    if (!menu) {
      const cat = categories.find(c => c.id === newCatId);
      if (cat?.default_price) setPrice(cat.default_price);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("메뉴 이름을 입력해주세요");
    if (!price) return alert("가격을 입력해주세요");
    setSaving(true);
    await onSave({
      name: name.trim(),
      icon,
      price: parseInt(price),
      category_id: categoryId || null,
      abv: abv.trim(),
      taste: taste.trim(),
      description: description.trim(),
      is_active: isActive,
    });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          width: "100%", maxWidth: 380,
          background: "rgba(20,18,14,0.97)",
          borderRadius: 18,
          border: "1px solid rgba(212,165,55,0.3)",
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 18, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", marginBottom: 4 }}>
          {menu ? "메뉴 수정" : "새 메뉴 추가"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>
          {menu ? menu.name : "손님이 주문할 새 메뉴를 등록합니다"}
        </div>

        {/* 아이콘 피커 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>아이콘</label>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 5,
            padding: 8,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
            maxHeight: 120,
            overflowY: "auto",
          }}>
            {ICON_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                style={{
                  width: 32, height: 32,
                  background: icon === emoji ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)",
                  border: icon === emoji ? "2px solid #D4A537" : "2px solid transparent",
                  borderRadius: 7,
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>메뉴 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 트로피컬 선셋"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>카테고리</label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">(카테고리 없음)</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} {cat.default_price ? `(${cat.default_price.toLocaleString()}원)` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="9900"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>도수</label>
            <input
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder="8%"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>맛 표현</label>
          <input
            value={taste}
            onChange={(e) => setTaste(e.target.value)}
            placeholder="예: 달콤 · 트로피컬"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>메뉴 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="짧은 한 줄 설명"
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          />
        </div>

        {/* 활성화 토글 */}
        <div
          onClick={() => setIsActive(!isActive)}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: 12,
            background: isActive ? "rgba(255,255,255,0.02)" : "rgba(226,75,74,0.06)",
            border: isActive ? "1px solid transparent" : "1px solid rgba(226,75,74,0.2)",
            borderRadius: 9,
            marginBottom: 12,
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#F5E6C8", marginBottom: 2 }}>
              메뉴 활성화 {!isActive && <span style={{ color: "rgba(255,180,180,0.85)" }}>(품절)</span>}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              {isActive ? "손님 화면에 표시됨" : "손님 화면에 숨김"}
            </div>
          </div>
          <div style={{
            width: 38, height: 22,
            background: isActive ? "#D4A537" : "rgba(255,255,255,0.1)",
            borderRadius: 11,
            position: "relative",
            transition: "background 0.2s",
          }}>
            <div style={{
              position: "absolute",
              top: 2, left: 2,
              width: 18, height: 18,
              background: "#fff",
              borderRadius: "50%",
              transform: isActive ? "translateX(16px)" : "translateX(0)",
              transition: "transform 0.2s",
            }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {menu && onDelete && (
            <button
              onClick={() => {
                if (confirm(`"${menu.name}" 메뉴를 삭제하시겠어요?\n복구할 수 없습니다.`)) {
                  onDelete();
                }
              }}
              style={{ ...btnStyle, ...deleteBtnStyle }}
            >
              🗑️
            </button>
          )}
          <button onClick={onClose} style={{ ...btnStyle, ...cancelBtnStyle, flex: 1 }}>
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...btnStyle, ...saveBtnStyle, flex: 1.5, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "..." : menu ? "저장" : "+ 추가"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ────── 메인 패널 ──────
export default function MenuAdminPanel({
  categories, menus, loading,
  createMenu, updateMenu, deleteMenu,
  createCategory, updateCategory, deleteCategory,
}) {
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [toast, setToast] = useState(null);
  const [batchTranslating, setBatchTranslating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 🌐 기존 메뉴 일괄 번역 (name_ja가 비어있는 메뉴/카테고리만)
  const handleBatchTranslate = async () => {
    const menusToTranslate = menus.filter(m => !m.name_ja);
    const categoriesToTranslate = categories.filter(c => !c.name_ja);
    const total = menusToTranslate.length + categoriesToTranslate.length;

    if (total === 0) {
      alert("이미 모든 메뉴가 번역되어 있어요!");
      return;
    }

    if (!confirm(`${total}개 항목을 일본어로 번역할까요?\n(약 ${total * 0.5}초 소요)`)) {
      return;
    }

    setBatchTranslating(true);
    setBatchProgress({ current: 0, total });
    let count = 0;

    // 카테고리 먼저
    for (const cat of categoriesToTranslate) {
      const name_ja = await translateText(cat.name);
      if (name_ja) {
        await updateCategory(cat.id, { name_ja });
      }
      count++;
      setBatchProgress({ current: count, total });
    }

    // 메뉴
    for (const menu of menusToTranslate) {
      const result = await autoTranslateMenu(menu);
      await updateMenu(menu.id, {
        name_ja: result.name_ja,
        description_ja: result.description_ja,
      });
      count++;
      setBatchProgress({ current: count, total });
    }

    setBatchTranslating(false);
    showToast(`✓ ${total}개 항목 일본어 번역 완료!`);
  };

  // 카테고리별 메뉴 그룹핑
  const menusByCategory = new Map();
  categories.forEach(cat => {
    menusByCategory.set(cat.id, menus.filter(m => m.category_id === cat.id));
  });
  // 카테고리 없는 메뉴
  const orphanMenus = menus.filter(m => !m.category_id);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
        메뉴를 불러오는 중...
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, padding: "0 4px",
      }}>
        <div>
          <div style={{ fontSize: 16, color: "#F5E6C8", fontFamily: "'Noto Serif KR', serif", fontWeight: 500 }}>
            메뉴 관리
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {menus.length}개 메뉴 · {categories.length}개 카테고리
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleBatchTranslate}
            disabled={batchTranslating}
            style={{
              padding: "8px 12px",
              background: "rgba(196,122,255,0.12)",
              border: "1px solid rgba(196,122,255,0.3)",
              borderRadius: 10,
              color: "#C47AFF", fontSize: 10, fontWeight: 600,
              cursor: batchTranslating ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: batchTranslating ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            🌐 {batchTranslating ? `${batchProgress.current}/${batchProgress.total}` : "일괄 번역"}
          </button>
          <button
            onClick={() => setShowNewMenu(true)}
            style={{
              padding: "8px 14px",
              background: "linear-gradient(135deg, #D4A537, #B8860B)",
              border: "none", borderRadius: 10,
              color: "#0D0B08", fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <Plus size={12} /> 메뉴 추가
          </button>
        </div>
      </div>

      {/* 카테고리별 메뉴 */}
      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 18 }}>
          {/* 카테고리 헤더 */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 600,
              letterSpacing: "0.1em",
              color: cat.color || "#D4A537",
            }}>
              ● {cat.name}
              {cat.default_price && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 8, fontWeight: 400 }}>
                  · {cat.default_price.toLocaleString()}원 기준
                </span>
              )}
            </span>
            <button
              onClick={() => setEditingCategory(cat)}
              style={iconBtnStyle}
              title="카테고리 수정"
            >
              <Edit2 size={12} />
            </button>
          </div>

          {/* 메뉴 카드들 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(menusByCategory.get(cat.id) || []).map(menu => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onEdit={() => setEditingMenu(menu)}
              />
            ))}
            {(menusByCategory.get(cat.id) || []).length === 0 && (
              <div style={{
                padding: 14, textAlign: "center",
                fontSize: 11, color: "rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.01)",
                border: "1px dashed rgba(255,255,255,0.05)",
                borderRadius: 10,
              }}>
                메뉴 없음
              </div>
            )}
          </div>
        </div>
      ))}

      {/* 카테고리 없는 메뉴 */}
      {orphanMenus.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 10, marginBottom: 8,
            fontSize: 11, color: "rgba(255,255,255,0.5)",
          }}>
            ● 카테고리 없음
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {orphanMenus.map(menu => (
              <MenuCard key={menu.id} menu={menu} onEdit={() => setEditingMenu(menu)} />
            ))}
          </div>
        </div>
      )}

      {/* 새 카테고리 추가 */}
      <button
        onClick={() => setShowNewCategory(true)}
        style={{
          width: "100%", padding: 14,
          background: "rgba(212,165,55,0.04)",
          border: "1px dashed rgba(212,165,55,0.3)",
          borderRadius: 10,
          color: "rgba(212,165,55,0.7)",
          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          marginTop: 8,
        }}
      >
        + 새 카테고리 추가
      </button>

      {/* 모달들 */}
      <AnimatePresence>
        {(editingMenu || showNewMenu) && (
          <MenuModal
            menu={editingMenu}
            categories={categories}
            onClose={() => { setEditingMenu(null); setShowNewMenu(false); }}
            onSave={async (data) => {
              // 일본어 자동 번역 (이름 + 설명)
              showToast("🌐 일본어 번역 중...");
              const translations = await autoTranslateMenu(data);
              const dataWithJa = {
                ...data,
                name_ja: translations.name_ja,
                description_ja: translations.description_ja,
              };

              const result = editingMenu
                ? await updateMenu(editingMenu.id, dataWithJa)
                : await createMenu(dataWithJa);
              if (result.ok) {
                showToast(editingMenu ? "✓ 메뉴 수정됨 (일본어 자동 번역)" : "✓ 메뉴 추가됨 (일본어 자동 번역)");
                setEditingMenu(null); setShowNewMenu(false);
              } else {
                alert("저장 실패: " + (result.reason || "알 수 없는 오류"));
              }
            }}
            onDelete={editingMenu ? async () => {
              const result = await deleteMenu(editingMenu.id);
              if (result.ok) {
                showToast("✓ 메뉴 삭제됨");
                setEditingMenu(null);
              }
            } : null}
          />
        )}

        {(editingCategory || showNewCategory) && (
          <CategoryModal
            category={editingCategory}
            onClose={() => { setEditingCategory(null); setShowNewCategory(false); }}
            onSave={async (data) => {
              // 일본어 자동 번역 (카테고리 이름)
              showToast("🌐 일본어 번역 중...");
              const name_ja = data.name ? await translateText(data.name) : "";
              const dataWithJa = { ...data, name_ja };

              const result = editingCategory
                ? await updateCategory(editingCategory.id, dataWithJa)
                : await createCategory(dataWithJa);
              if (result.ok) {
                showToast(editingCategory ? "✓ 카테고리 수정됨 (일본어 자동 번역)" : "✓ 카테고리 추가됨 (일본어 자동 번역)");
                setEditingCategory(null); setShowNewCategory(false);
              }
            }}
            onDelete={editingCategory ? async () => {
              const result = await deleteCategory(editingCategory.id);
              if (result.ok) {
                showToast("✓ 카테고리 삭제됨");
                setEditingCategory(null);
              }
            } : null}
          />
        )}
      </AnimatePresence>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              background: "linear-gradient(135deg, rgba(106,176,106,0.95), rgba(60,120,60,0.95))",
              color: "white",
              padding: "12px 20px", borderRadius: 12,
              fontSize: 13, fontWeight: 500, zIndex: 400,
              boxShadow: "0 8px 30px rgba(106,176,106,0.4)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────── 메뉴 카드 ──────
function MenuCard({ menu, onEdit }) {
  return (
    <motion.div
      layout
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 10,
        opacity: menu.is_active ? 1 : 0.5,
        cursor: "pointer",
      }}
      onClick={onEdit}
      whileHover={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 9,
        background: "rgba(212,165,55,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        {menu.icon || "🍸"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500, marginBottom: 2 }}>
          {menu.name}
          {!menu.is_active && (
            <span style={{
              display: "inline-block", padding: "1px 6px",
              background: "rgba(226,75,74,0.15)",
              color: "rgba(255,180,180,0.85)",
              borderRadius: 4, fontSize: 9, fontWeight: 600, marginLeft: 6,
            }}>
              품절
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          {[menu.abv, menu.taste].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>
        {menu.price.toLocaleString()}원
      </div>
      <Edit2 size={12} style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }} />
    </motion.div>
  );
}

// ────── 스타일 ──────
const labelStyle = {
  display: "block",
  fontSize: 10,
  color: "rgba(212,165,55,0.6)",
  marginBottom: 5,
  letterSpacing: "0.05em",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9,
  color: "#F5E6C8",
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
};

const btnStyle = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cancelBtnStyle = {
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const saveBtnStyle = {
  background: "linear-gradient(135deg, #D4A537, #B8860B)",
  color: "#0D0B08",
  fontWeight: 700,
};

const deleteBtnStyle = {
  background: "rgba(226,75,74,0.15)",
  color: "rgba(255,180,180,0.95)",
  border: "1px solid rgba(226,75,74,0.3)",
  width: 44,
};

const iconBtnStyle = {
  width: 28, height: 28,
  background: "rgba(255,255,255,0.04)",
  border: "none", borderRadius: 7,
  color: "rgba(255,255,255,0.5)",
  cursor: "pointer",
  fontSize: 12,
  display: "flex", alignItems: "center", justifyContent: "center",
};

// 헥스 컬러 → rgba 변환
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
