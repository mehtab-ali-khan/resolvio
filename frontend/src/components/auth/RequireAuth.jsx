// frontend/src/components/auth/RequireAuth.jsx

import { Navigate, Outlet } from "react-router";
import { getToken } from "../../api/tickets.js";

export function RequireAuth() {
    return getToken() ? <Outlet /> : <Navigate to="/login" replace />;
}