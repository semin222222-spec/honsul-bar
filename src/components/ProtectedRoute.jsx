import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * ProtectedRoute
 * - 사장님 로그인 안 됐으면 → /login
 * - 로그인됐는데 다른 매장 admin 접근 → 자기 매장으로
 * - 로그인 + 본인 매장 → 통과
 */
export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { storeSlug } = useParams();
  const { user, store, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // 1. 로그인 안 됨 → 로그인 페이지
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // 2. 로그인됐는데 매장 정보 없음 → 매장 만들어야 함
    if (!store) {
      navigate("/login?error=no_store", { replace: true });
      return;
    }

    // 3. URL의 storeSlug와 자기 매장 slug가 다름 → 자기 매장으로 redirect
    if (storeSlug && store.slug !== storeSlug) {
      navigate(`/${store.slug}/admin`, { replace: true });
      return;
    }
  }, [user, store, loading, storeSlug, navigate]);

  // 로딩 중
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0D0B08",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(212,165,55,0.5)",
        fontSize: 13,
        fontFamily: "'Pretendard', sans-serif",
      }}>
        확인 중...
      </div>
    );
  }

  // 인증 안 된 상태에서 일시적으로 빈 화면
  if (!user || !store) {
    return null;
  }

  // URL 매장과 본인 매장 다른 경우도 redirect 중이라 빈 화면
  if (storeSlug && store.slug !== storeSlug) {
    return null;
  }

  // 인증 완료 → 자식 컴포넌트 렌더링
  return children;
}
