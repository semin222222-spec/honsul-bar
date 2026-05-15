import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * /admin 으로 접속한 경우 → 자기 매장 admin으로 이동
 * ProtectedRoute가 user/store 검증 후 통과시켜준 상태에서 사용한다.
 */
export default function RedirectToOwnerStore() {
  const { store } = useAuth();
  if (!store) return null;
  return <Navigate to={`/${store.slug}/admin`} replace />;
}
