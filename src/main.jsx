import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import { StoreProvider } from "./lib/StoreContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 루트 접속 → 기본 매장(honsul-main)으로 자동 이동 */}
        <Route path="/" element={<Navigate to="/honsul-main" replace />} />
        <Route path="/admin" element={<Navigate to="/honsul-main/admin" replace />} />

        {/* 매장별 라우트 — :storeSlug 가 URL에서 매장 식별 */}
        <Route
          path="/:storeSlug"
          element={
            <StoreProvider>
              <App />
            </StoreProvider>
          }
        />
        <Route
          path="/:storeSlug/admin"
          element={
            <StoreProvider>
              <AdminPage />
            </StoreProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
