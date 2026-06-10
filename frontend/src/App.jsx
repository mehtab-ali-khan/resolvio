import { AgentDashboard } from "./components/AgentDashboard.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";


export default function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_45%,_#e2e8f0_100%)] text-slate-900">
      <AgentDashboard />
      <ChatWidget />
    </main>
  );
}
