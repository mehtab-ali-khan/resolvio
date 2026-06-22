// frontend/src/components/auth/RequireGuest.jsx

import { Navigate, Outlet } from "react-router";
import { getToken } from "../../api/tickets.js";

export function RequireGuest() {
    return getToken() ? <Navigate to="/" replace /> : <Outlet />;
}