import { motion } from "framer-motion";

/**
 * MonthlyHistoryPanel
 * - 최근 6개월 매출 히스토리
 * - 최신 → 과거 순으로 리스트
 * - 진행중 뱃지, 변화율 ▲▼ 표시
 */
export default function MonthlyHistoryPanel({ history = [] }) {
  // 가장 최신 → 과거 순 (이미 그렇게 정렬되어있음)

  return (
    <div>
      <div style={{
        fontSize: 16,
        color: "#F5E6C8",
        fontFamily: "'Noto Serif KR', serif",
        fontWeight: 500,
        marginBottom: 4,
      }}>
        📅 월별 매출 히스토리
      </div>
      <div style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        marginBottom: 14,
      }}>
        최근 6개월 기록
      </div>

      {/* 월별 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((m, idx) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              padding: "14px 16px",
              background: m.isCurrent
                ? "linear-gradient(135deg, rgba(212,165,55,0.12), rgba(180,120,30,0.04))"
                : "rgba(255,255,255,0.03)",
              border: m.isCurrent
                ? "1px solid rgba(212,165,55,0.3)"
                : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                color: "#F5E6C8",
                fontWeight: 500,
                marginBottom: 2,
                fontFamily: "'Noto Serif KR', serif",
              }}>
                {m.label}
                {m.isCurrent && (
                  <span style={{
                    display: "inline-block",
                    marginLeft: 6,
                    padding: "1px 6px",
                    background: "rgba(212,165,55,0.2)",
                    color: "#D4A537",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 600,
                  }}>
                    진행중
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                {m.daysOperated > 0 ? (
                  <>{m.daysOperated}일 운영 · {m.orderCount}잔 판매</>
                ) : (
                  <>데이터 없음</>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 16,
                color: m.revenue > 0 ? "#D4A537" : "rgba(255,255,255,0.3)",
                fontFamily: "'Noto Serif KR', serif",
                fontWeight: 500,
              }}>
                {m.revenue.toLocaleString()}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginLeft: 3 }}>원</span>
              </div>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {m.changePct !== null ? (
                  <span style={{
                    color: m.changePct >= 0 ? "#6AB06A" : "rgba(255,150,150,0.85)",
                  }}>
                    {m.changePct >= 0 ? "▲" : "▼"} {Math.abs(m.changePct)}%
                    <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 4, fontSize: 9 }}>
                      지난달 대비
                    </span>
                  </span>
                ) : (
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>
                    {idx === history.length - 1 ? "- 첫 달" : "비교 불가"}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 안내 */}
      <div style={{
        marginTop: 14,
        padding: 12,
        background: "rgba(212,165,55,0.04)",
        border: "1px solid rgba(212,165,55,0.15)",
        borderRadius: 10,
        fontSize: 11,
        color: "rgba(212,165,55,0.85)",
        lineHeight: 1.6,
      }}>
        💡 <strong>안내</strong><br/>
        · 데이터가 더 쌓이면 그래프와 비교 차트도 추가될 예정이에요<br/>
        · 모든 매출 기록은 영구 보관됩니다
      </div>
    </div>
  );
}
