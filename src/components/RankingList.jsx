import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const RANK_STYLE = [
  { emoji: "🥇", color: "#FFD700", bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.2)" },
  { emoji: "🥈", color: "#C0C0C0", bg: "rgba(192,192,192,0.06)", border: "rgba(192,192,192,0.15)" },
  { emoji: "🥉", color: "#CD7F32", bg: "rgba(205,127,50,0.06)", border: "rgba(205,127,50,0.15)" },
  { emoji: "4", color: "#D4A537", bg: "rgba(212,165,55,0.04)", border: "rgba(255,255,255,0.06)" },
  { emoji: "5", color: "#D4A537", bg: "rgba(212,165,55,0.04)", border: "rgba(255,255,255,0.06)" },
];

export default function RankingList() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("game_rankings")
      .select("*")
      .order("score", { ascending: false })
      .limit(5);
    setRankings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRankings();

    const channel = supabase
      .channel("rankings-realtime")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "game_rankings" },
        () => fetchRankings()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0" }}>
        <motion.div animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-block", color: "rgba(212,165,55,0.4)" }}>
          <Loader2 size={24} />
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
      }}>
        <Crown size={16} style={{ color: "#D4A537" }} />
        <span style={{
          fontSize: 12, letterSpacing: "0.1em", color: "rgba(212,165,55,0.6)", fontWeight: 600,
        }}>HALL OF FAME · TOP 5</span>
      </div>

      {rankings.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "24px 16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14, color: "rgba(255,255,255,0.25)", fontSize: 13,
        }}>
          아직 기록이 없어요. 첫 번째 도전자가 되어보세요!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rankings.map((r, i) => {
            const rs = RANK_STYLE[i] || RANK_STYLE[4];
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 12,
                  background: rs.bg, border: "1px solid " + rs.border,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: i < 3 ? 20 : 14,
                  fontWeight: i < 3 ? 400 : 600,
                  color: rs.color,
                  background: i < 3 ? "transparent" : "rgba(255,255,255,0.04)",
                }}>
                  {rs.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: "#F5E6C8",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{r.nickname}</div>
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 300, color: rs.color,
                  fontFamily: "'Noto Serif KR', serif",
                }}>
                  {r.score}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>층</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}