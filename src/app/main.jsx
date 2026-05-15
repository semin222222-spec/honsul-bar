import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/styles/fonts.css";
import App from "@/pages/customer/CustomerPage";
import AdminPage from "@/pages/admin/AdminPage";
import QRPrintPage from "@/pages/qr/QRPrintPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ProtectedRoute from "@/app/routes/ProtectedRoute";
import RedirectToOwnerStore from "@/app/routes/RedirectToOwnerStore";
import { StoreProvider } from "@/shared/store/StoreContext";
import { LocaleProvider } from "@/shared/i18n/LocaleContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LocaleProvider>
      <BrowserRouter>
        <Routes>
          {/* 루트 접속 → 기본 매장(honsul-main)으로 자동 이동 */}
          <Route path="/" element={<Navigate to="/honsul-main" replace />} />

          {/* 인증 페이지 (로그인 불필요) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* /admin 단독 접근 → 인증 후 자기 매장으로 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RedirectToOwnerStore />
              </ProtectedRoute>
            }
          />

          {/* 매장별 손님 화면 (인증 불필요) */}
          <Route
            path="/:storeSlug"
            element={
              <StoreProvider>
                <App />
              </StoreProvider>
            }
          />

          {/* 매장별 사장님 화면 (인증 필요) */}
          <Route
            path="/:storeSlug/admin"
            element={
              <ProtectedRoute>
                <StoreProvider>
                  <AdminPage />
                </StoreProvider>
              </ProtectedRoute>
            }
          />

          {/* QR 출력 (인증 필요) */}
          <Route
            path="/:storeSlug/qr"
            element={
              <ProtectedRoute>
                <StoreProvider>
                  <QRPrintPage />
                </StoreProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  </React.StrictMode>,
);
