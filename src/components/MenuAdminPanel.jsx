import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown, Upload, Camera, GripVertical } from "lucide-react";
import { autoTranslateMenu, translateText } from "../lib/translateService";
import { uploadMenuImage, deleteMenuImage } from "../lib/imageUpload";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
      style={modalOverlayStyle}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={modalContentStyle}
      >
        <div style={modalTitleStyle}>
          {category ? "카테고리 수정" : "새 카테고리 추가"}
        </div>
        <div style={modalSubtitleStyle}>메뉴를 분류할 카테고리</div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>카테고리 이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: WHISKY" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>기본 가격 (원)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = 표시 안함" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>강조 색상</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              style={{ ...inputStyle, height: 38, padding: 4, cursor: "pointer" }} />
          </div>
        </div>

        <div style={{
          padding: 12,
          background: hexToRgba(color, 0.06),
          border: `1px solid ${hexToRgba(color, 0.2)}`,
          borderRadius: 9, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 4 }}>
            ● {name || "(이름 없음)"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            {price > 0 ? `${parseInt(price).toLocaleString()}원` : "(가격 미설정)"} · 미리보기
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {category && onDelete && (
            <button onClick={() => {
              if (confirm(`"${category.name}" 카테고리를 삭제하시겠어요?\n속한 메뉴는 카테고리 없음 상태가 됩니다.`)) onDelete();
            }} style={{ ...btnStyle, ...deleteBtnStyle }}>🗑️</button>
          )}
          <button onClick={onClose} style={{ ...btnStyle, ...cancelBtnStyle, flex: 1 }}>취소</button>
          <button onClick={handleSave} disabled={saving}
            style={{ ...btnStyle, ...saveBtnStyle, flex: 1.5, opacity: saving ? 0.5 : 1 }}
          >{saving ? "..." : "저장"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ────── 옵션 행 ──────
function OptionRow({ option, onUpdate, onDelete }) {
  const [name, setName] = useState(option.name);
  const [price, setPrice] = useState(option.price);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert("옵션 이름을 입력해주세요");
    if (!price) return alert("가격을 입력해주세요");
    const name_ja = await translateText(name.trim());
    await onUpdate({
      name: name.trim(),
      name_ja: name_ja || null,
      price: parseInt(price),
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        padding: 8,
        background: "rgba(212,165,55,0.05)",
        border: "1px solid rgba(212,165,55,0.2)",
        borderRadius: 8, marginBottom: 6,
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="잔"
          style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 11 }} />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="10000"
          style={{ ...inputStyle, width: 80, padding: "6px 10px", fontSize: 11 }} />
        <button onClick={handleSave} style={{
          padding: "6px 10px",
          background: "linear-gradient(135deg, #D4A537, #B8860B)",
          border: "none", borderRadius: 6,
          color: "#0D0B08", fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>✓</button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "center",
      padding: "8px 10px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 8, marginBottom: 6,
    }}>
      <span style={{ fontSize: 12, color: "#F5E6C8", flex: 1 }}>{option.name}</span>
      <span style={{ fontSize: 12, color: "#D4A537", fontFamily: "'Noto Serif KR', serif" }}>
        {option.price.toLocaleString()}원
      </span>
      <button onClick={() => setEditing(true)} style={{
        padding: 4, background: "transparent", border: "none",
        color: "rgba(255,255,255,0.4)", cursor: "pointer",
      }}>
        <Edit2 size={12} />
      </button>
      <button onClick={() => {
        if (confirm(`"${option.name}" 옵션을 삭제하시겠어요?`)) onDelete();
      }} style={{
        padding: 4, background: "transparent", border: "none",
        color: "rgba(255,180,180,0.7)", cursor: "pointer",
      }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ────── 옵션 추가 폼 ──────
function AddOptionForm({ onAdd }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return alert("옵션 이름을 입력해주세요");
    if (!price) return alert("가격을 입력해주세요");
    setAdding(true);
    const name_ja = await translateText(name.trim());
    await onAdd({
      name: name.trim(),
      name_ja: name_ja || null,
      price: parseInt(price),
    });
    setName(""); setPrice(""); setAdding(false);
  };

  return (
    <div style={{
      display: "flex", gap: 6, alignItems: "center",
      padding: 8,
      background: "rgba(212,165,55,0.04)",
      border: "1px dashed rgba(212,165,55,0.3)",
      borderRadius: 8,
    }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="옵션명 (예: 잔)"
        style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 11 }} />
      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="10000"
        style={{ ...inputStyle, width: 80, padding: "6px 10px", fontSize: 11 }} />
      <button onClick={handleAdd} disabled={adding} style={{
        padding: "6px 10px",
        background: adding ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #D4A537, #B8860B)",
        border: "none", borderRadius: 6,
        color: adding ? "rgba(255,255,255,0.4)" : "#0D0B08",
        fontSize: 11, fontWeight: 700,
        cursor: adding ? "default" : "pointer", fontFamily: "inherit",
      }}>
        {adding ? "..." : "+"}
      </button>
    </div>
  );
}

// ────── 메뉴 모달 ──────
function MenuModal({ 
  menu, categories, storeId, 
  options,
  existingGroups,
  onClose, onSave, onDelete,
  onCreateOption, onUpdateOption, onDeleteOption,
}) {
  const [name, setName] = useState(menu?.name || "");
  const [icon, setIcon] = useState(menu?.icon || "🍸");
  const [price, setPrice] = useState(menu?.price || "");
  const [categoryId, setCategoryId] = useState(menu?.category_id || categories[0]?.id || "");
  const [groupName, setGroupName] = useState(menu?.group_name || "");
  const [abv, setAbv] = useState(menu?.abv || "");
  const [taste, setTaste] = useState(menu?.taste || "");
  const [description, setDescription] = useState(menu?.description || "");
  const [isActive, setIsActive] = useState(menu?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState(menu?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const hasOptions = options && options.length > 0;

  const currentCategoryGroups = (existingGroups[categoryId] || []).filter(g => g && g.trim());

  const handleCategoryChange = (newCatId) => {
    setCategoryId(newCatId);
    setGroupName("");
    if (!menu) {
      const cat = categories.find(c => c.id === newCatId);
      if (cat?.default_price) setPrice(cat.default_price);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const result = await uploadMenuImage(file, storeId, (progress) => setUploadProgress(progress));
    setUploading(false);
    setUploadProgress(0);
    if (result.ok) {
      if (imageUrl) deleteMenuImage(imageUrl);
      setImageUrl(result.url);
    } else {
      alert("업로드 실패: " + result.reason);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageRemove = () => {
    if (!confirm("사진을 삭제하시겠어요?")) return;
    if (imageUrl) deleteMenuImage(imageUrl);
    setImageUrl(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("메뉴 이름을 입력해주세요");
    if (!hasOptions && !price) {
      return alert("가격을 입력해주세요 (옵션을 추가하면 가격은 옵션에서 관리됩니다)");
    }
    setSaving(true);
    let group_name_ja = null;
    if (groupName.trim()) {
      group_name_ja = await translateText(groupName.trim());
    }
    await onSave({
      name: name.trim(),
      icon,
      price: parseInt(price) || 0,
      category_id: categoryId || null,
      group_name: groupName.trim() || null,
      group_name_ja: group_name_ja,
      abv: abv.trim(),
      taste: taste.trim(),
      description: description.trim(),
      is_active: isActive,
      image_url: imageUrl,
    });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalOverlayStyle}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{ ...modalContentStyle, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={modalTitleStyle}>{menu ? "메뉴 수정" : "새 메뉴 추가"}</div>
        <div style={modalSubtitleStyle}>
          {menu ? menu.name : "손님이 주문할 새 메뉴를 등록합니다"}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            메뉴 사진 <span style={{ color: "rgba(255,255,255,0.3)" }}>(선택)</span>
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          {imageUrl ? (
            <div style={imagePreviewStyle}>
              <img src={imageUrl} alt="메뉴" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                <button onClick={() => fileInputRef.current?.click()} style={imageActionBtnStyle}>
                  <Camera size={14} />
                </button>
                <button onClick={handleImageRemove} style={{ ...imageActionBtnStyle, color: "rgba(255,180,180,0.95)" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : uploading ? (
            <div style={uploadingStyle}>
              <div style={spinnerStyle} />
              <div style={{ fontSize: 12, color: "#D4A537", fontWeight: 600 }}>
                업로드 중... {uploadProgress}%
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} style={uploadButtonStyle}>
              <Upload size={20} style={{ color: "#D4A537" }} />
              <div style={{ fontSize: 13, color: "#D4A537", fontWeight: 600, marginTop: 8 }}>사진 업로드</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>JPG, PNG · 최대 5MB</div>
            </button>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>아이콘</label>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 5,
            padding: 8, background: "rgba(255,255,255,0.02)",
            borderRadius: 8, maxHeight: 120, overflowY: "auto",
          }}>
            {ICON_OPTIONS.map(emoji => (
              <button key={emoji} onClick={() => setIcon(emoji)} style={{
                width: 32, height: 32,
                background: icon === emoji ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)",
                border: icon === emoji ? "2px solid #D4A537" : "2px solid transparent",
                borderRadius: 7, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{emoji}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>메뉴 이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 조니워커 블랙" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>카테고리</label>
          <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} style={inputStyle}>
            <option value="">(카테고리 없음)</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} {cat.default_price ? `(${cat.default_price.toLocaleString()}원)` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            그룹 <span style={{ color: "rgba(255,255,255,0.3)" }}>(선택 · 같은 카테고리 안에서 묶기)</span>
          </label>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
            placeholder="예: 싱글몰트 (스페이사이드), 블렌디드 등"
            style={inputStyle} list="existing-groups" />
          {currentCategoryGroups.length > 0 && (
            <>
              <datalist id="existing-groups">
                {currentCategoryGroups.map(g => <option key={g} value={g} />)}
              </datalist>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginRight: 4, alignSelf: "center" }}>
                  기존 그룹:
                </span>
                {currentCategoryGroups.map(g => (
                  <button key={g} type="button" onClick={() => setGroupName(g)} style={{
                    padding: "3px 8px",
                    background: groupName === g ? "rgba(212,165,55,0.2)" : "rgba(255,255,255,0.04)",
                    border: "1px solid " + (groupName === g ? "rgba(212,165,55,0.4)" : "rgba(255,255,255,0.06)"),
                    borderRadius: 100,
                    color: groupName === g ? "#D4A537" : "rgba(255,255,255,0.5)",
                    fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                  }}>{g}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {menu && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                옵션 (잔/바틀 등) 
                <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                  {hasOptions ? `· ${options.length}개` : "· 선택"}
                </span>
              </span>
            </label>
            <div style={{
              padding: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 9,
            }}>
              {options && options.length > 0 ? (
                options.map(opt => (
                  <OptionRow key={opt.id} option={opt}
                    onUpdate={(data) => onUpdateOption(opt.id, data)}
                    onDelete={() => onDeleteOption(opt.id)} />
                ))
              ) : (
                <div style={{
                  fontSize: 10, color: "rgba(255,255,255,0.4)",
                  textAlign: "center", padding: "8px 0", marginBottom: 8,
                }}>옵션이 없습니다 (단일 가격으로 판매)</div>
              )}
              <AddOptionForm onAdd={(data) => onCreateOption(menu.id, data)} />
            </div>
            {hasOptions && (
              <div style={{ marginTop: 6, fontSize: 10, color: "rgba(212,165,55,0.6)", lineHeight: 1.5 }}>
                💡 옵션이 있으면 손님은 옵션을 선택해 주문합니다. 아래 "가격"은 무시됩니다.
              </div>
            )}
          </div>
        )}

        {!menu && (
          <div style={{
            padding: 10, marginBottom: 12,
            background: "rgba(212,165,55,0.05)",
            border: "1px dashed rgba(212,165,55,0.2)",
            borderRadius: 9,
            fontSize: 10, color: "rgba(212,165,55,0.7)", textAlign: "center",
          }}>
            💡 메뉴 저장 후 옵션(잔/바틀 등)을 추가할 수 있어요
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>
              가격 (원)
              {hasOptions && <span style={{ color: "rgba(255,180,180,0.7)", marginLeft: 4 }}>(옵션 사용중)</span>}
            </label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9900"
              style={{ ...inputStyle, opacity: hasOptions ? 0.4 : 1 }} disabled={hasOptions} />
          </div>
          <div>
            <label style={labelStyle}>도수</label>
            <input value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="40%" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>맛 표현</label>
          <input value={taste} onChange={(e) => setTaste(e.target.value)} placeholder="예: 스모키 · 아일라" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>메뉴 설명</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="짧은 한 줄 설명"
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
        </div>

        <div onClick={() => setIsActive(!isActive)} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: 12,
          background: isActive ? "rgba(255,255,255,0.02)" : "rgba(226,75,74,0.06)",
          border: isActive ? "1px solid transparent" : "1px solid rgba(226,75,74,0.2)",
          borderRadius: 9, marginBottom: 12, cursor: "pointer",
        }}>
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
            borderRadius: 11, position: "relative", transition: "background 0.2s",
          }}>
            <div style={{
              position: "absolute", top: 2, left: 2,
              width: 18, height: 18, background: "#fff",
              borderRadius: "50%",
              transform: isActive ? "translateX(16px)" : "translateX(0)",
              transition: "transform 0.2s",
            }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {menu && onDelete && (
            <button onClick={() => {
              if (confirm(`"${menu.name}" 메뉴를 삭제하시겠어요?\n복구할 수 없습니다.`)) {
                if (imageUrl) deleteMenuImage(imageUrl);
                onDelete();
              }
            }} style={{ ...btnStyle, ...deleteBtnStyle }}>🗑️</button>
          )}
          <button onClick={onClose} style={{ ...btnStyle, ...cancelBtnStyle, flex: 1 }}>취소</button>
          <button onClick={handleSave} disabled={saving || uploading}
            style={{ ...btnStyle, ...saveBtnStyle, flex: 1.5, opacity: (saving || uploading) ? 0.5 : 1 }}
          >{saving ? "..." : menu ? "저장" : "+ 추가"}</button>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

// ────── 🆕 드래그 가능한 메뉴 카드 ──────
function SortableMenuCard({ menu, options, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: menu.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (menu.is_active ? 1 : 0.5),
    zIndex: isDragging ? 999 : 1,
  };

  const hasOptions = options.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: isDragging ? "rgba(212,165,55,0.1)" : "rgba(255,255,255,0.02)",
        border: "1px solid " + (isDragging ? "rgba(212,165,55,0.4)" : "rgba(255,255,255,0.04)"),
        borderRadius: 10,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
        transition: "background 0.2s, border 0.2s, box-shadow 0.2s",
      }}>
        {/* 🆕 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          style={{
            padding: "4px 2px",
            cursor: isDragging ? "grabbing" : "grab",
            color: "rgba(255,255,255,0.3)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            touchAction: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <GripVertical size={16} />
        </div>

        <div onClick={onEdit} style={{
          width: 38, height: 38, borderRadius: 9,
          background: "rgba(212,165,55,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0, overflow: "hidden",
          cursor: "pointer",
        }}>
          {menu.image_url ? (
            <img src={menu.image_url} alt={menu.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (menu.icon || "🍸")}
        </div>
        <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500, marginBottom: 2 }}>
            {menu.name}
            {!menu.is_active && (
              <span style={{
                display: "inline-block", padding: "1px 6px",
                background: "rgba(226,75,74,0.15)", color: "rgba(255,180,180,0.85)",
                borderRadius: 4, fontSize: 9, fontWeight: 600, marginLeft: 6,
              }}>품절</span>
            )}
            {hasOptions && (
              <span style={{
                display: "inline-block", padding: "1px 6px",
                background: "rgba(212,165,55,0.15)", color: "#D4A537",
                borderRadius: 4, fontSize: 9, fontWeight: 600, marginLeft: 6,
              }}>{options.length}개 옵션</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            {[menu.abv, menu.taste].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#D4A537", fontFamily: "'Noto Serif KR', serif", textAlign: "right" }}>
          {hasOptions ? (
            <div style={{ fontSize: 11 }}>
              {Math.min(...options.map(o => o.price)).toLocaleString()}원~
            </div>
          ) : (`${menu.price.toLocaleString()}원`)}
        </div>
        <Edit2 size={12} style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4, cursor: "pointer" }} onClick={onEdit} />
      </div>
    </div>
  );
}

// ────── 메인 패널 ──────
export default function MenuAdminPanel({
  storeId,
  categories, menus, loading,
  optionsByMenu = new Map(),
  createMenu, updateMenu, deleteMenu,
  createCategory, updateCategory, deleteCategory,
  createOption, updateOption, deleteOption,
}) {
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [toast, setToast] = useState(null);
  const [batchTranslating, setBatchTranslating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [reorderingCategoryId, setReorderingCategoryId] = useState(null);
  const [isDraggingMenu, setIsDraggingMenu] = useState(false);

  // 🆕 드래그 센서 (마우스 + 터치 + 키보드)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const sortedCategories = [...categories].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  const existingGroups = {};
  sortedCategories.forEach(cat => {
    const groups = [...new Set(
      menus
        .filter(m => m.category_id === cat.id && m.group_name)
        .map(m => m.group_name)
    )];
    existingGroups[cat.id] = groups;
  });

  const moveCategoryUp = async (index) => {
    if (index <= 0 || reorderingCategoryId) return;
    const current = sortedCategories[index];
    const above = sortedCategories[index - 1];
    setReorderingCategoryId(current.id);
    try {
      await updateCategory(current.id, { display_order: above.display_order });
      await updateCategory(above.id, { display_order: current.display_order });
      showToast(`✓ "${current.name}" 위로 이동`);
    } catch (err) {
      showToast("순서 변경 실패");
    } finally {
      setReorderingCategoryId(null);
    }
  };

  const moveCategoryDown = async (index) => {
    if (index >= sortedCategories.length - 1 || reorderingCategoryId) return;
    const current = sortedCategories[index];
    const below = sortedCategories[index + 1];
    setReorderingCategoryId(current.id);
    try {
      await updateCategory(current.id, { display_order: below.display_order });
      await updateCategory(below.id, { display_order: current.display_order });
      showToast(`✓ "${current.name}" 아래로 이동`);
    } catch (err) {
      showToast("순서 변경 실패");
    } finally {
      setReorderingCategoryId(null);
    }
  };

  // 🆕 카테고리 안에서 드래그앤드롭 (그룹 사이도 이동 가능)
  const handleDragEnd = async (event, categoryId) => {
    setIsDraggingMenu(false);
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const catItems = menus
      .filter(m => m.category_id === categoryId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const oldIndex = catItems.findIndex(m => m.id === active.id);
    const newIndex = catItems.findIndex(m => m.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 배열 재배치
    const newOrder = arrayMove(catItems, oldIndex, newIndex);

    // 새 위치의 그룹명 가져오기 (이동한 메뉴 앞뒤 메뉴 기준)
    const movedMenu = newOrder[newIndex];
    const prevMenu = newIndex > 0 ? newOrder[newIndex - 1] : null;
    const nextMenu = newIndex < newOrder.length - 1 ? newOrder[newIndex + 1] : null;
    
    // 그룹 결정: 앞 메뉴의 그룹과 같게 (그룹 사이 이동 자동 처리)
    let newGroupName = movedMenu.group_name;
    let newGroupNameJa = movedMenu.group_name_ja;
    if (prevMenu && prevMenu.group_name) {
      newGroupName = prevMenu.group_name;
      newGroupNameJa = prevMenu.group_name_ja;
    } else if (nextMenu && nextMenu.group_name && !prevMenu) {
      newGroupName = nextMenu.group_name;
      newGroupNameJa = nextMenu.group_name_ja;
    }

    showToast("순서 변경 중...");

    try {
      // 모든 메뉴에 새 display_order 부여 (1, 2, 3, 4...)
      const updates = newOrder.map((menu, idx) => {
        const updates = { display_order: idx + 1 };
        // 이동된 메뉴의 그룹이 바뀌어야 한다면
        if (menu.id === movedMenu.id && menu.group_name !== newGroupName) {
          updates.group_name = newGroupName;
          updates.group_name_ja = newGroupNameJa;
        }
        return { id: menu.id, updates };
      });

      // 병렬 업데이트
      await Promise.all(
        updates.map(({ id, updates }) => updateMenu(id, updates))
      );

      const groupChanged = movedMenu.group_name !== newGroupName;
      if (groupChanged) {
        showToast(`✓ "${movedMenu.name}" → ${newGroupName || '그룹 없음'}로 이동`);
      } else {
        showToast(`✓ 순서 변경됨`);
      }
    } catch (err) {
      console.error("순서 변경 실패:", err);
      showToast("순서 변경 실패");
    }
  };

  const handleBatchTranslate = async () => {
    const menusToTranslate = menus.filter(m => !m.name_ja);
    const categoriesToTranslate = categories.filter(c => !c.name_ja);
    const total = menusToTranslate.length + categoriesToTranslate.length;

    if (total === 0) {
      alert("이미 모든 메뉴가 번역되어 있어요!");
      return;
    }
    if (!confirm(`${total}개 항목을 일본어로 번역할까요?\n(약 ${total * 0.5}초 소요)`)) return;

    setBatchTranslating(true);
    setBatchProgress({ current: 0, total });
    let count = 0;

    for (const cat of categoriesToTranslate) {
      const name_ja = await translateText(cat.name);
      if (name_ja) await updateCategory(cat.id, { name_ja });
      count++;
      setBatchProgress({ current: count, total });
    }
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

  const menusByCategory = new Map();
  sortedCategories.forEach(cat => {
    const items = menus
      .filter(m => m.category_id === cat.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    menusByCategory.set(cat.id, items);
  });
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
          <button onClick={handleBatchTranslate} disabled={batchTranslating} style={{
            padding: "8px 12px",
            background: "rgba(196,122,255,0.12)",
            border: "1px solid rgba(196,122,255,0.3)",
            borderRadius: 10,
            color: "#C47AFF", fontSize: 10, fontWeight: 600,
            cursor: batchTranslating ? "default" : "pointer",
            fontFamily: "inherit", opacity: batchTranslating ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            🌐 {batchTranslating ? `${batchProgress.current}/${batchProgress.total}` : "일괄 번역"}
          </button>
          <button onClick={() => setShowNewMenu(true)} style={{
            padding: "8px 14px",
            background: "linear-gradient(135deg, #D4A537, #B8860B)",
            border: "none", borderRadius: 10,
            color: "#0D0B08", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Plus size={12} /> 메뉴 추가
          </button>
        </div>
      </div>

      {/* 🆕 드래그 안내 */}
      <div style={{
        padding: "8px 12px",
        background: "rgba(212,165,55,0.05)",
        border: "1px solid rgba(212,165,55,0.15)",
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 10,
        color: "rgba(212,165,55,0.8)",
        textAlign: "center",
      }}>
        💡 메뉴 옆 <GripVertical size={10} style={{ display: "inline", verticalAlign: "middle" }} /> 핸들을 길게 누른 후 원하는 위치로 끌어 순서를 바꿀 수 있어요
      </div>

      {sortedCategories.map((cat, index) => {
        const isFirst = index === 0;
        const isLast = index === sortedCategories.length - 1;
        const isReordering = reorderingCategoryId === cat.id;
        const isReorderingAny = !!reorderingCategoryId;
        const catItems = menusByCategory.get(cat.id) || [];

        // 그룹별로 묶기
        const groupedItems = [];
        const seenGroups = new Set();
        catItems.forEach(item => {
          const groupKey = item.group_name || '__no_group__';
          if (!seenGroups.has(groupKey)) {
            seenGroups.add(groupKey);
            groupedItems.push({
              groupName: item.group_name,
              items: [item],
            });
          } else {
            const last = groupedItems[groupedItems.length - 1];
            if ((last.groupName || '__no_group__') === groupKey) {
              last.items.push(item);
            } else {
              groupedItems.push({
                groupName: item.group_name,
                items: [item],
              });
            }
          }
        });

        return (
          <div key={cat.id} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, marginBottom: 8,
              opacity: isReordering ? 0.5 : 1, transition: "opacity 0.2s",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
                color: cat.color || "#D4A537",
                flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                ● {cat.name}
                {cat.default_price > 0 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 8, fontWeight: 400 }}>
                    · {cat.default_price.toLocaleString()}원 기준
                  </span>
                )}
              </span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => moveCategoryUp(index)} disabled={isFirst || isReorderingAny}
                  style={{ ...iconBtnStyle, opacity: isFirst ? 0.2 : 1 }} title="위로">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => moveCategoryDown(index)} disabled={isLast || isReorderingAny}
                  style={{ ...iconBtnStyle, opacity: isLast ? 0.2 : 1 }} title="아래로">
                  <ChevronDown size={14} />
                </button>
                <button onClick={() => setEditingCategory(cat)} style={iconBtnStyle} title="수정">
                  <Edit2 size={12} />
                </button>
              </div>
            </div>

            {/* 🆕 카테고리 안에서 드래그앤드롭 (그룹 헤더 같이 표시) */}
            {catItems.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setIsDraggingMenu(true)}
                onDragEnd={(event) => handleDragEnd(event, cat.id)}
                onDragCancel={() => setIsDraggingMenu(false)}
              >
                <SortableContext
                  items={catItems.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {groupedItems.map((group, gi) => (
                    <div key={gi} style={{ marginBottom: 10 }}>
                      {group.groupName && (
                        <div style={{
                          padding: "5px 10px",
                          background: hexToRgba(cat.color || "#D4A537", 0.05),
                          borderLeft: `2px solid ${cat.color || "#D4A537"}`,
                          borderRadius: "0 6px 6px 0",
                          marginBottom: 4,
                          fontSize: 10,
                          color: cat.color || "#D4A537",
                          fontWeight: 600,
                        }}>
                          {group.groupName}
                          <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 4 }}>
                            · {group.items.length}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {group.items.map(menu => (
                          <SortableMenuCard
                            key={menu.id}
                            menu={menu}
                            options={optionsByMenu.get(menu.id) || []}
                            onEdit={() => setEditingMenu(menu)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div style={{
                padding: 14, textAlign: "center",
                fontSize: 11, color: "rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.01)",
                border: "1px dashed rgba(255,255,255,0.05)",
                borderRadius: 10,
              }}>메뉴 없음</div>
            )}
          </div>
        );
      })}

      {orphanMenus.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 10, marginBottom: 8,
            fontSize: 11, color: "rgba(255,255,255,0.5)",
          }}>● 카테고리 없음</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {orphanMenus.map(menu => (
              <div key={menu.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 10,
                cursor: "pointer",
              }} onClick={() => setEditingMenu(menu)}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: "rgba(212,165,55,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>{menu.icon || "🍸"}</div>
                <div style={{ flex: 1, fontSize: 12, color: "#F5E6C8" }}>{menu.name}</div>
                <Edit2 size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setShowNewCategory(true)} style={{
        width: "100%", padding: 14,
        background: "rgba(212,165,55,0.04)",
        border: "1px dashed rgba(212,165,55,0.3)",
        borderRadius: 10,
        color: "rgba(212,165,55,0.7)",
        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        marginTop: 8,
      }}>+ 새 카테고리 추가</button>

      <AnimatePresence>
        {(editingMenu || showNewMenu) && (
          <MenuModal
            menu={editingMenu}
            categories={sortedCategories}
            storeId={storeId}
            options={editingMenu ? (optionsByMenu.get(editingMenu.id) || []) : []}
            existingGroups={existingGroups}
            onClose={() => { setEditingMenu(null); setShowNewMenu(false); }}
            onSave={async (data) => {
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
                showToast(editingMenu ? "✓ 메뉴 수정됨" : "✓ 메뉴 추가됨");
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
            onCreateOption={async (menuId, data) => {
              const result = await createOption(menuId, data);
              if (result.ok) showToast("✓ 옵션 추가됨");
              else alert("옵션 추가 실패: " + result.reason);
            }}
            onUpdateOption={async (optionId, data) => {
              const result = await updateOption(optionId, data);
              if (result.ok) showToast("✓ 옵션 수정됨");
              else alert("옵션 수정 실패: " + result.reason);
            }}
            onDeleteOption={async (optionId) => {
              const result = await deleteOption(optionId);
              if (result.ok) showToast("✓ 옵션 삭제됨");
            }}
          />
        )}

        {(editingCategory || showNewCategory) && (
          <CategoryModal
            category={editingCategory}
            onClose={() => { setEditingCategory(null); setShowNewCategory(false); }}
            onSave={async (data) => {
              showToast("🌐 일본어 번역 중...");
              const name_ja = data.name ? await translateText(data.name) : "";
              const dataWithJa = { ...data, name_ja };
              const result = editingCategory
                ? await updateCategory(editingCategory.id, dataWithJa)
                : await createCategory(dataWithJa);
              if (result.ok) {
                showToast(editingCategory ? "✓ 카테고리 수정됨" : "✓ 카테고리 추가됨");
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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              background: "linear-gradient(135deg, rgba(106,176,106,0.95), rgba(60,120,60,0.95))",
              color: "white", padding: "12px 20px", borderRadius: 12,
              fontSize: 13, fontWeight: 500, zIndex: 400,
              boxShadow: "0 8px 30px rgba(106,176,106,0.4)",
            }}
          >{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────── 스타일 ──────
const modalOverlayStyle = {
  position: "fixed", inset: 0, zIndex: 200,
  background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalContentStyle = {
  width: "100%", maxWidth: 380,
  background: "rgba(20,18,14,0.97)",
  borderRadius: 18,
  border: "1px solid rgba(212,165,55,0.3)",
  padding: 24,
};
const modalTitleStyle = {
  fontSize: 18, color: "#F5E6C8",
  fontFamily: "'Noto Serif KR', serif",
  marginBottom: 4,
};
const modalSubtitleStyle = {
  fontSize: 11, color: "rgba(255,255,255,0.4)",
  marginBottom: 18,
};
const labelStyle = {
  display: "block", fontSize: 10,
  color: "rgba(212,165,55,0.6)",
  marginBottom: 5, letterSpacing: "0.05em",
};
const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9, color: "#F5E6C8",
  fontSize: 12, fontFamily: "inherit", outline: "none",
};
const btnStyle = {
  padding: 12, border: "none", borderRadius: 10,
  fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
const cancelBtnStyle = {
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
};
const saveBtnStyle = {
  background: "linear-gradient(135deg, #D4A537, #B8860B)",
  color: "#0D0B08", fontWeight: 700,
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
  cursor: "pointer", fontSize: 12,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const imagePreviewStyle = {
  position: "relative", width: "100%",
  aspectRatio: "1", borderRadius: 12,
  overflow: "hidden",
  border: "1px solid rgba(212,165,55,0.25)",
};
const imageActionBtnStyle = {
  width: 32, height: 32,
  background: "rgba(13,11,8,0.7)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(212,165,55,0.25)",
  borderRadius: 8,
  color: "rgba(245,230,200,0.85)",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const uploadingStyle = {
  width: "100%", aspectRatio: "1",
  borderRadius: 12,
  border: "2px dashed rgba(212,165,55,0.4)",
  background: "rgba(212,165,55,0.04)",
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", gap: 12,
};
const spinnerStyle = {
  width: 40, height: 40,
  border: "3px solid rgba(212,165,55,0.2)",
  borderTopColor: "#D4A537",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};
const uploadButtonStyle = {
  width: "100%", aspectRatio: "1",
  borderRadius: 12,
  border: "2px dashed rgba(212,165,55,0.3)",
  background: "rgba(212,165,55,0.03)",
  cursor: "pointer", transition: "all 0.2s",
  fontFamily: "inherit",
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
};

function hexToRgba(hex, alpha = 1) {
  if (!hex || hex[0] !== "#") return `rgba(212,165,55,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
