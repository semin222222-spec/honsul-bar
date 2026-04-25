import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/**
 * SalesStatsPanel
 * - 매장 매출 통계 화면
 * - 오늘 매출, 시간별 차트, 인기 메뉴 TOP 5
 */
export default function SalesStatsPanel({ stats, loading, onShowHistory }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
        통계를 계산하는 중...
      </div>
    );
  }

  const {
    todayRevenue, yesterdayRevenue, weekRevenue, monthRevenue,
    todayCustomers, todayOrders, avgPerCustomer,
    hourlyRevenue, topMenus, peakHour, revenueChangePct,
  } = stats;

  const peakHourLabel = peakHour !== null
    ? `${peakHour === 0 ? "자정" : peakHour < 12 ? `오전 ${peakHour}시` : peakHour === 12 ? "정오" : `오후 ${peakHour - 12}시`}`
    : "-";

  const maxCount = topMenus[0]?.count || 1;

  return (
    <div>
      {/* 빅 매출 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 18,
          background: "linear-gradient(135deg, rgba(212,165,55,0.15), rgba(180,120,30,0.04))",
          border: "1px solid rgba(212,165,55,0.3)",
          borderRadius: 14,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        <div style={{
          fontSize: 10,
          color: "rgba(212,165,55,0.7)",
          letterSpacing: "0.15em",
          marginBottom: 6,
        }}>
          오늘 매출 · TODAY
        </div>
        <div style={{
          fontSize: 32,
          color: "#D4A537",
          fontFamily: "'Noto Serif KR', serif",
          fontWeight: 500,
          marginBottom: 4,
        }}>
          {todayRevenue.toLocaleString()}<span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>원</span>
        </div>
        {yesterdayRevenue > 0 ? (
          <div style={{
            fontSize: 11,
            color: revenueChangePct >= 0 ? "#6AB06A" : "rgba(255,150,150,0.85)",
            fontWeight: 500,
          }}>
            {revenueChangePct >= 0 ? "▲" : "▼"} 어제 대비 {Math.abs(revenueChangePct)}%
            <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>
              (어제 {yesterdayRevenue.toLocaleString()}원)
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            어제 매출 데이터 없음
          </div>
        )}
      </motion.div>

      {/* 미니 통계 3개 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <MiniStat label="손님 수" value={`${todayCustomers}명`} />
        <MiniStat label="객단가" value={`${avgPerCustomer.toLocaleString()}`} unit="원" />
        <MiniStat label="주문 수" value={todayOrders} />
      </motion.div>

      {/* 주간/월간 매출 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <PeriodCard label="이번 주" value={weekRevenue} icon="📅" />
        <PeriodCard label="이번 달" value={monthRevenue} icon="🗓️" />
      </motion.div>

      {/* 월별 히스토리 진입 버튼 */}
      {onShowHistory && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          whileTap={{ scale: 0.98 }}
          onClick={onShowHistory}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "linear-gradient(135deg, rgba(196,122,255,0.08), rgba(140,80,200,0.03))",
            border: "1px solid rgba(196,122,255,0.25)",
            borderRadius: 12,
            cursor: "pointer",
            marginBottom: 14,
            fontFamily: "inherit",
            width: "100%",
            textAlign: "left",
          }}
        >
          <div style={{
            width: 38, height: 38,
            borderRadius: 10,
            background: "rgba(196,122,255,0.15)",
            border: "1px solid rgba(196,122,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>
            📅
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#F5E6C8", fontWeight: 500, marginBottom: 2 }}>
              월별 히스토리 보기
            </div>
            <div style={{ fontSize: 11, color: "rgba(196,122,255,0.85)" }}>
              최근 6개월 매출 추세 확인 →
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>›</div>
        </motion.button>
      )}

      {/* 시간별 매출 차트 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 12,
            color: "rgba(212,165,55,0.7)",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}>
            📈 시간별 매출
          </div>
          {peakHour !== null && hourlyRevenue.some(h => h.revenue > 0) && (
            <div style={{ fontSize: 10, color: "rgba(212,165,55,0.6)" }}>
              피크: {peakHourLabel}
            </div>
          )}
        </div>

        {hourlyRevenue.every(h => h.revenue === 0) ? (
          <div style={{
            padding: "30px 0",
            textAlign: "center",
            color: "rgba(255,255,255,0.3)",
            fontSize: 11,
          }}>
            아직 매출이 없어요
          </div>
        ) : (
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyRevenue} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,18,14,0.97)",
                    border: "1px solid rgba(212,165,55,0.3)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "rgba(212,165,55,0.7)", fontSize: 10 }}
                  itemStyle={{ color: "#F5E6C8" }}
                  formatter={(v) => [`${v.toLocaleString()}원`, "매출"]}
                  labelFormatter={(label) => `${label}시`}
                  cursor={{ fill: "rgba(212,165,55,0.05)" }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {hourlyRevenue.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hour === peakHour ? "#D4A537" : "rgba(212,165,55,0.4)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* 인기 메뉴 TOP 5 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{
          fontSize: 12,
          color: "rgba(212,165,55,0.7)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          marginBottom: 8,
          padding: "0 4px",
        }}>
          🏆 인기 메뉴 TOP 5 (오늘)
        </div>

        {topMenus.length === 0 ? (
          <div style={{
            padding: "30px 0",
            textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.3)",
            fontSize: 11,
          }}>
            아직 주문이 없어요
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topMenus.map((menu, idx) => (
              <div
                key={menu.name}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 10,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: idx === 0
                    ? "linear-gradient(135deg, #D4A537, #B8860B)"
                    : "rgba(212,165,55,0.15)",
                  color: idx === 0 ? "#0D0B08" : "#D4A537",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                  {menu.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#F5E6C8", fontWeight: 500, marginBottom: 4 }}>
                    {menu.name}
                  </div>
                  <div style={{
                    height: 3,
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(menu.count / maxCount) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.4 + idx * 0.05 }}
                      style={{
                        height: "100%",
                        background: "linear-gradient(90deg, #D4A537, #B8860B)",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "#D4A537", fontFamily: "'Noto Serif KR', serif", fontWeight: 500 }}>
                    {menu.count}잔
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
                    {menu.revenue.toLocaleString()}원
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 안내 */}
      <div style={{
        marginTop: 14, padding: 12,
        background: "rgba(212,165,55,0.04)",
        border: "1px solid rgba(212,165,55,0.15)",
        borderRadius: 10,
        fontSize: 11,
        color: "rgba(212,165,55,0.85)",
        lineHeight: 1.6,
      }}>
        💡 <strong>안내</strong><br/>
        · 통계는 새 주문이 생기면 자동 갱신됩니다<br/>
        · 주간/월간 차트는 데이터가 더 쌓이면 추가될 예정이에요
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit }) {
  return (
    <div style={{
      padding: 12,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 3, letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{
        fontSize: 16,
        color: "#F5E6C8",
        fontFamily: "'Noto Serif KR', serif",
        fontWeight: 500,
      }}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

function PeriodCard({ label, value, icon }) {
  return (
    <div style={{
      padding: 14,
      background: "linear-gradient(135deg, rgba(212,165,55,0.06), rgba(180,120,30,0.02))",
      border: "1px solid rgba(212,165,55,0.18)",
      borderRadius: 11,
    }}>
      <div style={{
        fontSize: 10,
        color: "rgba(212,165,55,0.7)",
        letterSpacing: "0.1em",
        marginBottom: 6,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{
        fontSize: 18,
        color: "#D4A537",
        fontFamily: "'Noto Serif KR', serif",
        fontWeight: 500,
      }}>
        {value.toLocaleString()}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 3 }}>원</span>
      </div>
    </div>
  );
}
