export default function AmbientBG() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,165,55,0.08) 0%, transparent 70%)",
        top: -80, right: -60, filter: "blur(40px)"
      }} />
      <div style={{
        position: "absolute", width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,120,40,0.06) 0%, transparent 70%)",
        bottom: 120, left: -80, filter: "blur(50px)"
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(212,165,55,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />
    </div>
  );
}