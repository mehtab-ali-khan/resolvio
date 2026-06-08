import { AgentDashboard } from "./components/AgentDashboard.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";


export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-16 sm:py-16">
      {/* <section className="max-w-2xl">
        <p className="mb-3 text-sm font-bold uppercase text-blue-600">
          Demo Website
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-5xl">
          Welcome to Acme Store
        </h1>
        <p className="text-lg leading-8 text-slate-600">
          This page acts like a customer website while we build the support
          widget step by step.
        </p>
      </section> */}

      <AgentDashboard />
      <ChatWidget />
    </main>
  );
}
