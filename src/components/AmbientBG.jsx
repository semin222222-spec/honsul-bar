import { motion } from "framer-motion";

export default function AmbientBG() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      overflow: "hidden", pointerEvents: "none",
      background: "#0D0B08",
    }}>
      {/* 위스키 잔 중심부 — 따뜻한 앰버 코어 */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1.05, 1.2, 1],
          x: [0, 15, -10, 5, 0],
          y: [0, -10, 8, -5, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "120vw", height: "120vw",
          maxWidth: 600, maxHeight: 600,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(180,120,40,0.12) 0%, rgba(140,90,20,0.06) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* 천천히 흐르는 앰버 웨이브 1 */}
      <motion.div
        animate={{
          x: [0, 40, -20, 30, 0],
          y: [0, -30, 20, -15, 0],
          scale: [1, 1.2, 0.9, 1.1, 1],
          rotate: [0, 15, -10, 5, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "80vw", maxWidth: 400,
          height: "80vw", maxHeight: 400,
          top: "-5%", right: "-15%",
          borderRadius: "40% 60% 55% 45% / 50% 40% 60% 50%",
          background: "radial-gradient(ellipse, rgba(212,165,55,0.1) 0%, rgba(180,120,40,0.04) 50%, transparent 80%)",
          filter: "blur(50px)",
        }}
      />

      {/* 천천히 흐르는 앰버 웨이브 2 */}
      <motion.div
        animate={{
          x: [0, -30, 25, -15, 0],
          y: [0, 25, -20, 10, 0],
          scale: [1, 0.9, 1.15, 1.05, 1],
          rotate: [0, -20, 10, -8, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{
          position: "absolute",
          width: "70vw", maxWidth: 350,
          height: "70vw", maxHeight: 350,
          bottom: "10%", left: "-10%",
          borderRadius: "55% 45% 50% 50% / 45% 55% 45% 55%",
          background: "radial-gradient(ellipse, rgba(160,100,30,0.09) 0%, rgba(120,70,15,0.04) 50%, transparent 80%)",
          filter: "blur(45px)",
        }}
      />

      {/* 골든 리플 — 위스키 표면 반사 */}
      <motion.div
        animate={{
          x: [0, 20, -15, 10, 0],
          y: [0, -15, 25, -10, 0],
          scale: [1, 1.3, 0.85, 1.15, 1],
          rotate: [0, 25, -15, 10, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{
          position: "absolute",
          width: "50vw", maxWidth: 280,
          height: "50vw", maxHeight: 280,
          top: "25%", left: "20%",
          borderRadius: "45% 55% 60% 40% / 55% 45% 55% 45%",
          background: "radial-gradient(ellipse, rgba(212,165,55,0.07) 0%, rgba(190,140,40,0.03) 50%, transparent 75%)",
          filter: "blur(40px)",
        }}
      />

      {/* 딥 앰버 웨이브 — 바닥 깊이감 */}
      <motion.div
        animate={{
          x: [0, -25, 20, -10, 0],
          y: [0, 15, -25, 20, 0],
          scale: [1, 1.1, 0.95, 1.2, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 9 }}
        style={{
          position: "absolute",
          width: "90vw", maxWidth: 500,
          height: "60vw", maxHeight: 300,
          bottom: "-5%", right: "-5%",
          borderRadius: "50% 50% 40% 60% / 60% 40% 55% 45%",
          background: "radial-gradient(ellipse, rgba(100,60,10,0.08) 0%, rgba(80,45,5,0.03) 50%, transparent 75%)",
          filter: "blur(55px)",
        }}
      />

      {/* 표면 하이라이트 — 잔 가장자리 빛 반사 */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.25, 0.5, 0.3],
          x: [0, 10, -8, 5, 0],
          y: [0, -8, 5, -3, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute",
          width: "30vw", maxWidth: 160,
          height: "30vw", maxHeight: 160,
          top: "15%", right: "10%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,220,150,0.06) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* 미세한 도트 패턴 — 잔의 질감 */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(212,165,55,0.02) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        opacity: 0.6,
      }} />
    </div>
  );
}