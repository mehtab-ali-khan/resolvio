import { createRoot } from "react-dom/client";
import { ChatWidget } from "../components/ChatWidget.jsx";

function injectStyles() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://nexus-support-ai.vercel.app/widget.css";
  document.head.appendChild(link);
}

function ensureMountPoint() {
  const existing = document.getElementById("nexus-support-widget-root");
  if (existing) return existing;
  const mount = document.createElement("div");
  mount.id = "nexus-support-widget-root";
  document.body.appendChild(mount);
  return mount;
}

function init({ apiKey } = {}) {
  if (!apiKey) {
    console.error("[NexusSupport] apiKey is required.");
    return;
  }
  injectStyles();
  const mount = ensureMountPoint();
  createRoot(mount).render(<ChatWidget apiKey={apiKey} />);
}

window.NexusSupport = { init };