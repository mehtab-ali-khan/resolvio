import { AgentDashboard } from "./components/AgentDashboard.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";


export default function App() {
  return (
    <main className="min-h-screen bg-[var(--nexus-color-bg)] text-[var(--nexus-color-text)]">
      <AgentDashboard />
    </main>
  );
}
