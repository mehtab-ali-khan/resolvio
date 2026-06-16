import { useState } from "react";
import { getToken, getUser, logout } from "./api/tickets.js";
import { AgentDashboard } from "./components/AgentDashboard.jsx";
import { Login } from "./components/Login.jsx";
import { Signup } from "./components/Signup.jsx";

export default function App() {
  const [page, setPage] = useState(() => {
    return getToken() ? "dashboard" : "login";
  });

  const [user, setUser] = useState(() => getUser());

  function handleLogin() {
    setUser(getUser());
    setPage("dashboard");
  }

  function handleSignup() {
    setUser(getUser());
    setPage("dashboard");
  }

  function handleLogout() {
    logout();
    setUser(null);
    setPage("login");
  }

  if (page === "login") {
    return <Login onLogin={handleLogin} onGoToSignup={() => setPage("signup")} />;
  }

  if (page === "signup") {
    return <Signup onSignup={handleSignup} onGoToLogin={() => setPage("login")} />;
  }

  return <AgentDashboard user={user} onLogout={handleLogout} />;
}