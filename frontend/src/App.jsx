// frontend/src/App.jsx

import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { RequireAuth } from "./components/auth/RequireAuth.jsx";
import { RequireGuest } from "./components/auth/RequireGuest.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { Login } from "./components/Login.jsx";
import { Signup } from "./components/Signup.jsx";
import { TicketsPage } from "./pages/TicketsPage.jsx";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/tickets" replace />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}