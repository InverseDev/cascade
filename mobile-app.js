(() => {
  "use strict";
  const Capacitor = window.Capacitor;
  if (!Capacitor || typeof Capacitor.isNativePlatform !== "function" || !Capacitor.isNativePlatform()) return;
  if (window.__cascadeNativeShell) return;
  window.__cascadeNativeShell = true;

  const root = document.documentElement;
  root.classList.add("cascade-native-app");
  const path = window.location.pathname.toLowerCase();
  const isHistory = path.endsWith("history.html");
  const isAlarms = path.endsWith("alarms.html");
  let active = isHistory ? "history" : isAlarms ? "alarms" : "dashboard";

  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    alarms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    assistant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>'
  };

  const nav = document.createElement("nav");
  nav.className = "cascade-app-bottom-nav";
  nav.setAttribute("aria-label", "Main navigation");
  const items = [
    ["dashboard", "Dashboard", "index.html#dashboard"],
    ["history", "History", "history.html"],
    ["alarms", "Alarms", "alarms.html"],
    ["assistant", "AI Assistant", null]
  ];
  const navButtons = {};
  items.forEach(([key, label, href]) => {
    const item = document.createElement(href ? "a" : "button");
    item.className = "cascade-app-nav-item";
    item.setAttribute("aria-label", label);
    if (href) item.href = href;
    else {
      item.type = "button";
      item.addEventListener("click", enterAssistant);
    }
    item.innerHTML = icons[key] + "<span>" + label + "</span>";
    nav.appendChild(item);
    navButtons[key] = item;
  });
  document.body.appendChild(nav);

  const main = document.querySelector("main");
  if (main) main.classList.add("cascade-app-content");

  function setActive(key) {
    active = key;
    Object.entries(navButtons).forEach(([name, button]) => {
      button.classList.toggle("active", name === key);
      if (name === key) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  function leaveAssistant() {
    root.classList.remove("cascade-assistant-active");
    const chatRoot = document.getElementById("cascade-chat");
    const panel = chatRoot && chatRoot.querySelector(".cascade-chat-panel");
    const launcher = chatRoot && chatRoot.querySelector(".cascade-chat-launcher");
    if (panel) {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
    }
    if (chatRoot) chatRoot.classList.remove("chat-open");
    if (launcher) launcher.setAttribute("aria-expanded", "false");
    setActive(isHistory ? "history" : isAlarms ? "alarms" : "dashboard");
  }
  function enterAssistant() {
    const chatRoot = document.getElementById("cascade-chat");
    const panel = chatRoot && chatRoot.querySelector(".cascade-chat-panel");
    if (!panel) return;
    root.classList.add("cascade-assistant-active");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    chatRoot.classList.add("chat-open");
    const launcher = chatRoot.querySelector(".cascade-chat-launcher");
    if (launcher) launcher.setAttribute("aria-expanded", "true");
    setActive("assistant");
  }

  // chatbot.js is deferred, so observe for its UI before wiring the close action.
  const chatObserver = new MutationObserver(() => {
    const chatRoot = document.getElementById("cascade-chat");
    if (!chatRoot || chatRoot.dataset.nativeShellWired) return;
    chatRoot.dataset.nativeShellWired = "true";
    chatRoot.addEventListener("click", event => {
      if (event.target.closest(".cascade-chat-close")) leaveAssistant();
    });
    chatObserver.disconnect();
  });
  chatObserver.observe(document.documentElement, { childList: true, subtree: true });

  if (active === "dashboard" && !window.location.hash) {
    history.replaceState(null, "", window.location.pathname + "#dashboard");
  }
  setActive(active);

  // Use the dashboard's existing device state as the single source of truth.
  const syncDeviceStatus = () => {
    const status = document.getElementById("connectionStatus");
    const label = document.getElementById("connectionLabel");
    const badge = document.getElementById("cascadeAppDeviceStatus");
    if (!status || !badge) return;
    const state = status.dataset.state || "waiting";
    badge.dataset.state = state === "online" ? "online" : "offline";
    badge.textContent = label ? label.textContent.trim() : state.toUpperCase();
  };
  const statusNode = document.getElementById("connectionStatus");
  if (statusNode) {
    new MutationObserver(syncDeviceStatus).observe(statusNode, { attributes: true, attributeFilter: ["data-state"] });
    const labelNode = document.getElementById("connectionLabel");
    if (labelNode) new MutationObserver(syncDeviceStatus).observe(labelNode, { childList: true, characterData: true, subtree: true });
    syncDeviceStatus();
  }
  window.addEventListener("popstate", leaveAssistant);
})();