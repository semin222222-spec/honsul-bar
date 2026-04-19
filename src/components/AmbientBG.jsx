import { motion } from "framer-motion";

export default function AmbientBG() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      overflow: "hidden", pointerEvents: "none",
      background: "#0D0B08",
    }}>
      {/* 메인 앰버 코어 — 위스키 잔 중심 */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1.1, 1.35, 1],
          x: [0, 30, -20, 15, 0],
          y: [0, -25, 15, -10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "130vw", height: "130vw",
          maxWidth: 700, maxHeight: 700,
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,165,55,0.18) 0%, rgba(160,100,30,0.08) 35%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* 황금빛 웨이브 — 오른쪽 상단 */}
      <motion.div
        animate={{
          x: [0, 60, -30, 40, 0],
          y: [0, -40, 30, -20, 0],
          scale: [1, 1.4, 0.8, 1.2, 1],
          rotate: [0, 25, -15, 10, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "90vw", maxWidth: 450,
          height: "90vw", maxHeight: 450,
          top: "-10%", right: "-20%",
          borderRadius: "40% 60% 55% 45% / 50% 40% 60% 50%",
          background: "radial-gradient(ellipse, rgba(212,165,55,0.15) 0%, rgba(180,120,40,0.06) 45%, transparent 75%)",
          filter: "blur(35px)",
        }}
      />

      {/* 딥 앰버 — 왼쪽 하단 */}
      <motion.div
        animate={{
          x: [0, -50, 35, -25, 0],
          y: [0, 40, -30, 20, 0],
          scale: [1, 0.85, 1.3, 1.1, 1],
          rotate: [0, -30, 15, -10, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute",
          width: "85vw", maxWidth: 420,
          height: "85vw", maxHeight: 420,
          bottom: "5%", left: "-15%",
          borderRadius: "55% 45% 50% 50% / 45% 55% 45% 55%",
          background: "radial-gradient(ellipse, rgba(180,110,30,0.14) 0%, rgba(140,80,15,0.05) 45%, transparent 75%)",
          filter: "blur(35px)",
        }}
      />

      {/* 위스키 표면 반사광 */}
      <motion.div
        animate={{
          x: [0, 35, -25, 20, 0],
          y: [0, -20, 35, -15, 0],
          scale: [1, 1.5, 0.7, 1.3, 1],
          rotate: [0, 40, -20, 15, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{
          position: "absolute",
          width: "60vw", maxWidth: 320,
          height: "60vw", maxHeight: 320,
          top: "20%", left: "15%",
          borderRadius: "45% 55% 60% 40% / 55% 45% 55% 45%",
          background: "radial-gradient(ellipse, rgba(255,200,100,0.1) 0%, rgba(212,165,55,0.04) 45%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* 하이라이트 스팟 — 반짝이는 표면 */}
      <motion.div
        animate={{
          opacity: [0.15, 0.5, 0.1, 0.4, 0.15],
          scale: [1, 1.3, 0.9, 1.2, 1],
          x: [0, 15, -10, 8, 0],
          y: [0, -10, 8, -5, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{
          position: "absolute",
          width: "35vw", maxWidth: 200,
          height: "35vw", maxHeight: 200,
          top: "12%", right: "8%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,220,150,0.12) 0%, transparent 65%)",
          filter: "blur(20px)",
        }}
      />

      {/* 바닥 깊이감 */}
      <motion.div
        animate={{
          x: [0, -30, 25, -15, 0],
          y: [0, 20, -30, 25, 0],
          scale: [1, 1.2, 0.9, 1.25, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{
          position: "absolute",
          width: "100vw", maxWidth: 550,
          height: "70vw", maxHeight: 350,
          bottom: "-8%", right: "-10%",
          borderRadius: "50% 50% 40% 60% / 60% 40% 55% 45%",
          background: "radial-gradient(ellipse, rgba(120,75,15,0.12) 0%, rgba(90,55,10,0.04) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* 도트 패턴 텍스처 */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(212,165,55,0.025) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />
    </div>
  );
}