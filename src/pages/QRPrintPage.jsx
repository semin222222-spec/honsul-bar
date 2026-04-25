import { useState } from "react";
import { useStore } from "../lib/StoreContext";

/**
 * QR 생성 페이지
 * - 사장님이 모든 좌석의 QR 코드를 한꺼번에 출력
 * - 인쇄해서 좌석에 붙여놓으면 손님이 폰으로 스캔 → 자동 입장
 *
 * URL: /honsul-main/qr
 */
export default function QRPrintPage() {
  const { store } = useStore();
  const [size, setSize] = useState(180); // QR 크기 (px)
  const [showAdmin, setShowAdmin] = useState(false);

  // 좌석 리스트 (A1~A20, B1~B20)
  const seats = [];
  for (let i = 1; i <= 20; i++) seats.push(`A-${i}`);
  for (let i = 1; i <= 20; i++) seats.push(`B-${i}`);

  // 현재 매장 slug 기준 URL 만들기
  const baseURL = window.location.origin;
  const storeSlug = store?.slug || "honsul-main";

  // QR 생성 — 외부 무료 API 사용 (qrserver.com)
  const buildQRUrl = (seat) => {
    const target = `${baseURL}/${storeSlug}?seat=${encodeURIComponent(seat)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(target)}&margin=0`;
  };

  const buildAdminQRUrl = () => {
    const target = `${baseURL}/${storeSlug}/admin`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(target)}&margin=0`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      color: "#000",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      padding: 20,
    }}>
      {/* 인쇄 시 숨기는 컨트롤 영역 */}
      <div className="no-print" style={{
        maxWidth: 800,
        margin: "0 auto 20px",
        padding: "20px",
        background: "#f5f5f5",
        borderRadius: 12,
        border: "1px solid #ddd",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8, color: "#333" }}>
          🏷️ {store?.name || "매장"} QR 코드
        </h1>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          좌석마다 QR을 출력해서 붙이면, 손님이 폰으로 스캔할 때 자동으로 입장됩니다.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "#555" }}>
            QR 크기:
            <input
              type="range"
              min="120"
              max="240"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ marginLeft: 8, verticalAlign: "middle" }}
            />
            <span style={{ marginLeft: 6, color: "#888" }}>{size}px</span>
          </label>

          <label style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={showAdmin}
              onChange={(e) => setShowAdmin(e.target.checked)}
            />
            관리자용 QR도 포함
          </label>

          <button
            onClick={handlePrint}
            style={{
              padding: "10px 20px",
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            🖨️ 인쇄하기 (Ctrl+P)
          </button>
        </div>

        <div style={{
          marginTop: 14,
          padding: "10px 14px",
          background: "#fff",
          borderRadius: 8,
          fontSize: 12,
          color: "#888",
          fontFamily: "monospace",
        }}>
          예시 URL: {baseURL}/{storeSlug}?seat=A-3
        </div>
      </div>

      {/* QR 그리드 (인쇄 영역) */}
      <div style={{
        maxWidth: 800,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
      }}>
        {seats.map((seat) => (
          <div key={seat} style={{
            background: "#fff",
            border: "2px solid #333",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
            pageBreakInside: "avoid",
          }}>
            <div style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#888",
              marginBottom: 4,
            }}>
              {store?.name?.toUpperCase() || "MIDNIGHT"}
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#333",
              marginBottom: 10,
            }}>
              📍 {seat}
            </div>
            <img
              src={buildQRUrl(seat)}
              alt={`QR ${seat}`}
              style={{ width: "100%", height: "auto", maxWidth: size }}
            />
            <div style={{
              fontSize: 10,
              color: "#aaa",
              marginTop: 6,
            }}>
              📱 폰으로 스캔하세요
            </div>
          </div>
        ))}

        {/* 관리자 QR (옵션) */}
        {showAdmin && (
          <div style={{
            background: "#0D0B08",
            color: "#D4A537",
            border: "2px solid #D4A537",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
            pageBreakInside: "avoid",
            gridColumn: "span 2",
          }}>
            <div style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#D4A537",
              marginBottom: 4,
            }}>
              ADMIN ONLY
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 10,
            }}>
              👔 사장님 관리자 페이지
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img
                src={buildAdminQRUrl()}
                alt="QR Admin"
                style={{ width: size, background: "#fff", padding: 8, borderRadius: 8 }}
              />
            </div>
            <div style={{
              fontSize: 10,
              color: "#888",
              marginTop: 6,
            }}>
              🔒 사장님만 사용
            </div>
          </div>
        )}
      </div>

      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
