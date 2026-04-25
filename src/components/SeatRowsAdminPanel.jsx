import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2 } from "lucide-react";

// 좌석 행 추가/수정 모달
function SeatRowModal({ row, existingNames, onClose, onSave, onDelete }) {
  const [name, setName] = useState(row?.name || "");
  const [count, setCount] = useState(row?.seat_count || 10);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return alert("행 이름을 입력해주세요");
    if (trimmedName.length > 5) return alert("행 이름은 5자 이내로 해주세요");

    // 중복 체크 (자기 자신은 제외)
    const duplicate = existingNames.some(n =>
      n.name === trimmedName && n.id !== row?.id
    );
    if (duplicate) return alert(`"${trimmedName}" 이름은 이미 있어요`);

    if (count < 1 || count > 50) return alert("좌석 개수는 1~50 사이여야 해요");

    setSaving(true);
    await onSave({ name: trimmedName, seat_count: parseInt(count) });
    setSaving(false);
  };

  // 미리보기 좌석들
  const previewSeats = Array.from(
    { length: Math.min(parseInt(count) || 0, 10) },
    (_, i) => `${name || "?"}-${i + 1}`
  );

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
          {row ? "좌석 행 수정" : "새 좌석 행 추가"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>
          {row ? `${row.name}줄 (${row.seat_count}석)` : "예: A줄, 바, 테라스 등"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>행 이름 (1~5자)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: A, B, 바, 테라스"
            maxLength={5}
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            영문/숫자/한글 가능. 좌석 이름은 "{name || "?"}-1, {name || "?"}-2..." 형태가 됩니다
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>좌석 개수 (1~50)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={{ ...inputStyle, width: 80 }}
            />
            <input
              type="range"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={{ flex: 1, accentColor: "#D4A537" }}
            />
            <span style={{ fontSize: 12, color: "rgba(212,165,55,0.7)", minWidth: 40 }}>
              {count}석
            </span>
          </div>
        </div>

        {/* 미리보기 */}
        {name && count > 0 && (
          <div style={{
            padding: 12,
            background: "rgba(212,165,55,0.04)",
            border: "1px solid rgba(212,165,55,0.15)",
            borderRadius: 9,
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, color: "rgba(212,165,55,0.7)", marginBottom: 6 }}>
              📍 미리보기 (앞 10개)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {previewSeats.map(seat => (
                <span key={seat} style={{
                  padding: "3px 7px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 5,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "'Noto Serif KR', serif",
                }}>
                  {seat}
                </span>
              ))}
              {count > 10 && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", padding: "3px 7px" }}>
                  ... 외 {count - 10}개
                </span>
              )}
            </div>
          </div>
        )}

        {/* 경고 — 좌석 줄이면 기존 손님 영향 */}
        {row && count < row.seat_count && (
          <div style={{
            padding: 10,
            background: "rgba(226,150,75,0.08)",
            border: "1px solid rgba(226,150,75,0.25)",
            borderRadius: 9,
            marginBottom: 12,
            fontSize: 11,
            color: "rgba(255,200,130,0.9)",
            lineHeight: 1.5,
          }}>
            ⚠ {row.seat_count}석 → {count}석으로 줄어들어요.<br/>
            {row.name}-{count + 1} 이상에 손님이 있다면 자리 이동 시켜주세요.
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {row && onDelete && (
            <button
              onClick={() => {
                if (confirm(`"${row.name}줄"을 삭제하시겠어요?\n\n현재 사용 중인 손님이 있다면 먼저 자리를 옮겨주세요.`)) {
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
            {saving ? "..." : row ? "저장" : "+ 추가"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ────── 메인 패널 ──────
export default function SeatRowsAdminPanel({
  rows, loading, sessions = [],
  createRow, updateRow, deleteRow,
}) {
  const [editingRow, setEditingRow] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 행별 점유 카운트 (현재 손님 있는 좌석)
  const occupiedByRow = new Map();
  sessions.forEach(s => {
    if (s.status !== "open") return;
    const match = s.seat_label?.match(/^([^-]+)-(\d+)$/);
    if (match) {
      const rowName = match[1];
      occupiedByRow.set(rowName, (occupiedByRow.get(rowName) || 0) + 1);
    }
  });

  const totalSeats = rows.reduce((sum, r) => sum + r.seat_count, 0);
  const totalOccupied = sessions.filter(s => s.status === "open").length;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
        좌석 정보를 불러오는 중...
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
            좌석 설정
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {rows.length}개 행 · 총 {totalSeats}석 · 현재 {totalOccupied}명 이용중
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            padding: "8px 14px",
            background: "linear-gradient(135deg, #D4A537, #B8860B)",
            border: "none", borderRadius: 10,
            color: "#0D0B08", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <Plus size={12} /> 행 추가
        </button>
      </div>

      {/* 행 목록 */}
      {rows.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 12,
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🪑</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            아직 좌석이 없어요
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            "+ 행 추가"를 눌러 시작하세요
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map(row => {
            const occupied = occupiedByRow.get(row.name) || 0;
            return (
              <motion.div
                key={row.id}
                layout
                onClick={() => setEditingRow(row)}
                whileHover={{ background: "rgba(255,255,255,0.04)" }}
                style={{
                  padding: 14,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                {/* 행 이름 큰 버블 */}
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(212,165,55,0.15), rgba(180,120,30,0.05))",
                  border: "1px solid rgba(212,165,55,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Noto Serif KR', serif",
                  fontSize: 22, color: "#D4A537", fontWeight: 500,
                  flexShrink: 0,
                }}>
                  {row.name}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: "#F5E6C8", fontWeight: 500, marginBottom: 4,
                  }}>
                    {row.name}줄
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", gap: 10 }}>
                    <span>🪑 {row.seat_count}석</span>
                    {occupied > 0 && (
                      <span style={{ color: "#6AB06A" }}>
                        ● {occupied}명 이용중
                      </span>
                    )}
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>
                      {row.name}-1 ~ {row.name}-{row.seat_count}
                    </span>
                  </div>
                </div>

                <Edit2 size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 안내 박스 */}
      <div style={{
        marginTop: 14, padding: 12,
        background: "rgba(212,165,55,0.04)",
        border: "1px solid rgba(212,165,55,0.15)",
        borderRadius: 10,
        fontSize: 11, color: "rgba(212,165,55,0.85)",
        lineHeight: 1.6,
      }}>
        💡 <strong>안내</strong><br/>
        · 행 이름이 좌석 라벨이 됩니다 (예: "A" → A-1, A-2)<br/>
        · 좌석을 줄이기 전에 손님 자리를 먼저 옮겨주세요<br/>
        · 행을 삭제해도 기존 주문/매출 기록은 유지됩니다
      </div>

      {/* 모달 */}
      <AnimatePresence>
        {(editingRow || showNew) && (
          <SeatRowModal
            row={editingRow}
            existingNames={rows.map(r => ({ id: r.id, name: r.name }))}
            onClose={() => { setEditingRow(null); setShowNew(false); }}
            onSave={async (data) => {
              const result = editingRow
                ? await updateRow(editingRow.id, data)
                : await createRow(data);
              if (result.ok) {
                showToast(editingRow ? "✓ 좌석 행 수정됨" : "✓ 좌석 행 추가됨");
                setEditingRow(null); setShowNew(false);
              } else {
                alert("저장 실패: " + (result.reason || "알 수 없는 오류"));
              }
            }}
            onDelete={editingRow ? async () => {
              const result = await deleteRow(editingRow.id);
              if (result.ok) {
                showToast("✓ 좌석 행 삭제됨");
                setEditingRow(null);
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

// 스타일
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
