import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, error: authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await signIn({ email, password });
    setLoading(false);

    if (result.ok) {
      // 로그인 성공 → 자기 매장으로 이동
      // useAuth 훅이 매장 정보 가져오면 redirect
      navigate("/admin");
    } else {
      // 흔한 에러 메시지 한글화
      let msg = result.reason;
      if (msg.includes("Invalid login credentials")) {
        msg = "이메일 또는 비밀번호가 잘못됐어요";
      } else if (msg.includes("Email not confirmed")) {
        msg = "이메일 인증을 완료해주세요";
      }
      setError(msg);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0D0B08",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%",
          maxWidth: 400,
        }}
      >
        {/* 로고 영역 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🥃</div>
          <div style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 24,
            color: "#F5E6C8",
            fontWeight: 500,
            marginBottom: 4,
          }}>
            오늘, 혼술
          </div>
          <div style={{
            fontSize: 12,
            color: "rgba(212,165,55,0.5)",
            letterSpacing: "0.15em",
          }}>
            사장님 로그인
          </div>
        </div>

        {/* 폼 카드 */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(212,165,55,0.15)",
          borderRadius: 16,
          padding: "28px 24px",
          backdropFilter: "blur(16px)",
        }}>
          <form onSubmit={handleSubmit}>
            {/* 이메일 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 6,
                letterSpacing: "0.05em",
              }}>
                이메일
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{
                  position: "absolute",
                  left: 14, top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(212,165,55,0.4)",
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 40px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: "#F5E6C8",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,165,55,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 6,
                letterSpacing: "0.05em",
              }}>
                비밀번호
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{
                  position: "absolute",
                  left: 14, top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(212,165,55,0.4)",
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 40px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: "#F5E6C8",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,165,55,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {(error || authError) && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "rgba(226,75,74,0.08)",
                  border: "1px solid rgba(226,75,74,0.2)",
                  borderRadius: 10,
                  color: "#E87A79",
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={14} />
                {error || authError}
              </motion.div>
            )}

            {/* 로그인 버튼 */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, #D4A537, #B8860B)",
                border: "none",
                borderRadius: 12,
                color: loading ? "rgba(255,255,255,0.3)" : "#0D0B08",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 48,
              }}
            >
              <LogIn size={16} />
              {loading ? "로그인 중..." : "로그인"}
            </motion.button>
          </form>
        </div>

        {/* 회원가입 링크 */}
        <div style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
        }}>
          아직 계정이 없으신가요?{" "}
          <Link
            to="/signup"
            style={{
              color: "#D4A537",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            회원가입
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
