import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, Store, Hash, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, error: authError } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phone: "",
    storeName: "",
    storeSlug: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // 자동 slug 생성 (한글 이름 → 영문 아이디로)
  const handleStoreNameChange = (value) => {
    update("storeName", value);
    // slug가 비어있으면 자동 생성 시도
    if (!form.storeSlug) {
      // 영문/숫자만 추출 (없으면 빈 문자열)
      const auto = value.toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (auto) update("storeSlug", auto);
    }
  };

  const validate = () => {
    if (!form.email.includes("@")) return "올바른 이메일을 입력하세요";
    if (form.password.length < 6) return "비밀번호는 6자 이상이어야 해요";
    if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않아요";
    if (!form.name.trim()) return "이름을 입력하세요";
    if (!form.storeName.trim()) return "매장 이름을 입력하세요";
    if (!form.storeSlug.trim()) return "매장 URL을 입력하세요";
    if (!/^[a-z0-9-]+$/.test(form.storeSlug)) return "매장 URL은 영문 소문자, 숫자, '-'만 사용 가능해요";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await signUp(form);
    setLoading(false);

    if (result.ok) {
      setSuccess(true);
      // 3초 후 로그인 페이지로
      setTimeout(() => navigate("/login"), 3000);
    } else {
      let msg = result.reason;
      if (msg.includes("already registered")) {
        msg = "이미 가입된 이메일이에요";
      } else if (msg.includes("duplicate key") && msg.includes("slug")) {
        msg = "이미 사용 중인 매장 URL이에요";
      }
      setError(msg);
    }
  };

  // 성공 화면
  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0D0B08",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'Pretendard', -apple-system, sans-serif",
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            textAlign: "center",
            maxWidth: 400,
          }}
        >
          <CheckCircle size={64} style={{ color: "#6AB06A", marginBottom: 20 }} />
          <div style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 24,
            color: "#F5E6C8",
            marginBottom: 12,
            fontWeight: 500,
          }}>
            가입이 완료되었어요!
          </div>
          <div style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}>
            이메일을 확인하여 인증을 완료해주세요.<br />
            인증 후 로그인이 가능합니다.
          </div>
          <div style={{
            fontSize: 12,
            color: "rgba(212,165,55,0.5)",
          }}>
            잠시 후 로그인 페이지로 이동합니다...
          </div>
        </motion.div>
      </div>
    );
  }

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
          maxWidth: 440,
          padding: "20px 0",
        }}
      >
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🥃</div>
          <div style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 22,
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
            사장님 회원가입
          </div>
        </div>

        {/* 폼 카드 */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(212,165,55,0.15)",
          borderRadius: 16,
          padding: "24px 20px",
          backdropFilter: "blur(16px)",
        }}>
          <form onSubmit={handleSubmit}>
            {/* 섹션 타이틀: 계정 정보 */}
            <SectionTitle>계정 정보</SectionTitle>

            <FormField
              icon={<Mail size={15} />}
              type="email"
              label="이메일"
              value={form.email}
              onChange={v => update("email", v)}
              placeholder="example@email.com"
              autoComplete="email"
            />

            <FormField
              icon={<Lock size={15} />}
              type="password"
              label="비밀번호 (6자 이상)"
              value={form.password}
              onChange={v => update("password", v)}
              placeholder="비밀번호"
              autoComplete="new-password"
            />

            <FormField
              icon={<Lock size={15} />}
              type="password"
              label="비밀번호 확인"
              value={form.passwordConfirm}
              onChange={v => update("passwordConfirm", v)}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
            />

            {/* 섹션 타이틀: 사장님 정보 */}
            <SectionTitle style={{ marginTop: 24 }}>사장님 정보</SectionTitle>

            <FormField
              icon={<User size={15} />}
              type="text"
              label="이름 / 닉네임"
              value={form.name}
              onChange={v => update("name", v)}
              placeholder="홍길동"
            />

            <FormField
              icon={<Phone size={15} />}
              type="tel"
              label="전화번호 (선택)"
              value={form.phone}
              onChange={v => update("phone", v)}
              placeholder="010-1234-5678"
            />

            {/* 섹션 타이틀: 매장 정보 */}
            <SectionTitle style={{ marginTop: 24 }}>매장 정보</SectionTitle>

            <FormField
              icon={<Store size={15} />}
              type="text"
              label="매장 이름"
              value={form.storeName}
              onChange={handleStoreNameChange}
              placeholder="오늘,혼술 강남점"
            />

            <FormField
              icon={<Hash size={15} />}
              type="text"
              label="매장 URL (영문 소문자, 숫자, -)"
              value={form.storeSlug}
              onChange={v => update("storeSlug", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="gangnam"
              hint={form.storeSlug ? `honsul-bar.com/${form.storeSlug}` : "예: gangnam, hongdae-2"}
            />

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
                  marginBottom: 14,
                  marginTop: 8,
                }}
              >
                <AlertCircle size={14} />
                {error || authError}
              </motion.div>
            )}

            {/* 가입 버튼 */}
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
                marginTop: 16,
              }}
            >
              <UserPlus size={16} />
              {loading ? "가입 중..." : "회원가입"}
            </motion.button>
          </form>
        </div>

        {/* 로그인 링크 */}
        <div style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
        }}>
          이미 계정이 있으신가요?{" "}
          <Link
            to="/login"
            style={{
              color: "#D4A537",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            로그인
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      color: "rgba(212,165,55,0.6)",
      letterSpacing: "0.1em",
      marginBottom: 12,
      textTransform: "uppercase",
      ...style,
    }}>
      {children}
    </div>
  );
}

function FormField({ icon, type, label, value, onChange, placeholder, autoComplete, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block",
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        marginBottom: 6,
        letterSpacing: "0.05em",
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute",
          left: 14, top: "50%",
          transform: "translateY(-50%)",
          color: "rgba(212,165,55,0.4)",
          display: "flex",
        }}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            padding: "11px 14px 11px 40px",
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
      {hint && (
        <div style={{
          fontSize: 10,
          color: "rgba(212,165,55,0.4)",
          marginTop: 4,
          marginLeft: 4,
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
