import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Wine, Coffee, Moon, Loader2, AlertCircle } from "lucide-react";
import { useSOSSend } from "../hooks/useSOSSignals";

const SOS_OPTIONS = [
  { id: "join_chat", label: "대화에 끼고 싶어요", icon: <MessageCircle size={20} />, desc: "사장님이 자연스럽게 대화를 연결해 드릴게요" },
  { id: "menu_recommend", label: "메뉴 추천 필요해요", icon: <Wine size={20} />, desc: "취향에 맞는 술을 추천받아 보세요" },
  { id: "seat_uncomfortable", label: "자리가 불편해요", icon: <Coffee size={20} />, desc: "더 편한 자리로 안내해 드릴게요" },
  { id: "want_quiet", label: "조용히 쉬고 싶어요", icon: <Moon size={20} />, desc: "방해받지 않도록 배려해 드릴게요" },
];

export default function SOSModal({ open, onClose, seatLabel = "바 1번석" }) {
  const { sendSOS, sending } = useSOSSend();
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("select");

  useEffect(() => {
    if (open) { setSelected(null); setPhase("select"); }
  }, [open]);

  const handleSend = async () => {
    if (!selected || sending) return;
    setPhase("sending");
    const result = await sendSOS(seatLabel, selected);
    if (result.success) {
      setPhase("success");
      setTimeout(() => { onClose(); }, 2200);
    } else {
      setPhase("error");
      setTimeout(() => setPhase("select"), 2500);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "0 12px 20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget && phase !== "sending") onClose(); }}
        >
          <motion.div
            initial={{ y: 300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              width: "100%", maxWidth: 400,
              background: "rgba(20,18,14,0.96)", backdropFilter: "blur(24px)",
              borderRadius: 24, border: "1px solid rgba(212,165,55,0.12)",
              padding: "24px 20px",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <AnimatePresence mode="wait">
              {phase === "success" && (
                <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: "center", padding: "30px 0" }}>
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5 }}
                    style={{ fontSize: 48, marginBottom: 16 }}>✅</motion.div>
                  <div style={{ fontSize: 17, fontWeight: 500, color: "#F5E6C8", marginBottom: 6 }}>전달 완료!</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                    호스트에게 시그널이 전달되었어요.<br />곧 도움을 드릴게요.
                  </div>
                </motion.div>
              )}

              {phase === "error" && (
                <motion.div key="error" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: "center", padding: "30px 0" }}>
                  <AlertCircle size={42} style={{ color: "rgba(220,100,100,0.7)", marginBottom: 12 }} />
                  <div style={{ fontSize: 15, color: "rgba(220,130,130,0.9)", marginBottom: 6 }}>전송에 실패했어요</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>잠시 후 다시 시도해주세요</div>
                </motion.div>
              )}

              {phase === "sending" && (
                <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: "center", padding: "40px 0" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    style={{ display: "inline-block", color: "#D4A537", marginBottom: 16 }}>
                    <Loader2 size={36} />
                  </motion.div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>호스트에게 전달하고 있어요...</div>
                </motion.div>
              )}

              {phase === "select" && (
                <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 4 }}>HOST SOS</div>
                      <div style={{ fontSize: 18, fontWeight: 300, color: "#F5E6C8", fontFamily: "'Cormorant Garamond', serif" }}>
                        무엇을 도와드릴까요?
                      </div>
                    </div>
                    <button onClick={onClose} style={{
                      background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                      width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "rgba(255,255,255,0.4)",
                    }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    📍 내 자리: <span style={{ color: "rgba(212,165,55,0.6)", fontWeight: 500 }}>{seatLabel}</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {SOS_OPTIONS.map((opt, i) => {
                      const active = selected === opt.id;
                      return (
                        <motion.div key={opt.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                          onClick={() => setSelected(opt.id)}
                          style={{
                            padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                            background: active ? "rgba(212,165,55,0.1)" : "rgba(255,255,255,0.03)",
                            border: "1px solid " + (active ? "rgba(212,165,55,0.25)" : "rgba(255,255,255,0.06)"),
                            transition: "all 0.25s",
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: active ? "rgba(212,165,55,0.15)" : "rgba(255,255,255,0.04)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: active ? "#D4A537" : "rgba(255,255,255,0.3)", transition: "all 0.25s",
                            }}>
                              {opt.icon}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500, color: active ? "#D4A537" : "#F5E6C8", transition: "color 0.2s" }}>{opt.label}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{opt.desc}</div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <motion.button whileTap={selected ? { scale: 0.96 } : {}} onClick={handleSend} disabled={!selected}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 14, border: "none",
                      background: selected ? "linear-gradient(135deg, #D4A537, #B8860B)" : "rgba(255,255,255,0.06)",
                      color: selected ? "#0D0B08" : "rgba(255,255,255,0.2)",
                      fontSize: 15, fontWeight: 600, cursor: selected ? "pointer" : "default",
                      transition: "all 0.3s", letterSpacing: "0.02em",
                    }}>
                    호스트에게 시그널 보내기
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}