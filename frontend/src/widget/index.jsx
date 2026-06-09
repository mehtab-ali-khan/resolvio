import { createRoot } from "react-dom/client";

import { ChatWidget } from "../components/ChatWidget.jsx";


function WidgetMount() {
  return <ChatWidget />;
}


function ensureMountPoint() {
  const existingMount = document.getElementById("nexus-support-widget-root");

  if (existingMount) {
    return existingMount;
  }

  const mount = document.createElement("div");
  mount.id = "nexus-support-widget-root";
  document.body.appendChild(mount);
  return mount;
}


function init() {
  const mount = ensureMountPoint();
  createRoot(mount).render(<WidgetMount />);
}


window.NexusSupport = {
  init,
};
