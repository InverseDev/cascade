(() => {
  "use strict";
  const Capacitor = window.Capacitor;
  if (!Capacitor || typeof Capacitor.isNativePlatform !== "function" || !Capacitor.isNativePlatform()) return;
  if (window.__cascadeNativeShell) return;
  window.__cascadeNativeShell = true;

  const root = document.documentElement;
  root.classList.add("cascade-native-app");
  const path = window.location.pathname.toLowerCase();
  const isHistory = path.endsWith("/history.html") || path.endsWith("history.html");
  const isAlarms = path.endsWith("/alarms.html") || path.endsWith("alarms.html");
  const active = isHistory ? "history" : isAlarms ? "alarms" : "dashboard";

  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    alarms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    assistant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>'
  };

  const topbar = document.createElement("header");
  topbar.className = "cascade-app-topbar";
  topbar.innerHTML = '<div class="cascade-app-brand"><img src="assets/mascots/cascade-hero.svg" alt=""><span class="cascade-app-brand-copy"><strong>Cascade</strong><small>SMART WATER</small></span></div><span class="cascade-app-topbar-status" id="cascadeAppDeviceStatus" data-state="offline"><i></i><span>DEVICE STATUS</span></span>';

  const nav = document.createElement("nav");
  nav.className = "cascade-app-bottom-nav";
  nav.setAttribute("aria-label", "Main navigation");
  const items = [
    ["dashboard", "Dashboard", "index.html#dashboard"],
    ["history", "History", "history.html"],
    ["alarms", "Alarms", "alarms.html"],
    ["assistant", "Assistant", "#assistant"]
  ];
  items.forEach(([key, label, href]) => {
    const item = document.createElement(key === "assistant" ? "button" : "a");
    item.className = "cascade-app-nav-item" + (key === active ? " active" : "");
    item.setAttribute("aria-label", label);
    if (key === "assistant") {
      item.type = "button";
      item.addEventListener("click", () => {
        const launcher = document.querySelector(".cascade-chat-launcher");
        if (launcher) launcher.click();
        else window.location.href = "index.html#dashboard";
      });
    } else {
      item.href = href;
      if (key === active) item.setAttribute("aria-current", "page");
    }
    item.innerHTML = icons[key] + "<span>" + label + "</span>";
    nav.appendChild(item);
  });

  document.body.insertBefore(topbar, document.body.firstChild);
  document.body.appendChild(nav);

  const main = document.querySelector("main");
  if (main) main.classList.add("cascade-app-content");

  // The app opens directly on the live control centre, not the marketing landing section.
  if (active === "dashboard" && !window.location.hash) {
    history.replaceState(null, "", window.location.pathname + "#dashboard");
  }

  // Reflect the dashboard's existing connection state without creating a second data source.
  const status = document.getElementById("connectionStatus");
  const statusLabel = document.getElementById("connectionLabel");
  const badge = document.getElementById("cascadeAppDeviceStatus");
  if (status && badge) {
    const syncStatus = () => {
      const state = status.dataset.state || "waiting";
      badge.dataset.state = state === "online" ? "online" : "offline";
      const label = statusLabel ? statusLabel.textContent.trim() : state.toUpperCase();
      badge.querySelector("span").textContent = label === "DEVICE ONLINE" ? "DEVICE ONLINE" : label;
    };
    syncStatus();
    new MutationObserver(syncStatus).observe(status, { attributes: true, attributeFilter: ["data-state"] });
    if (statusLabel) new MutationObserver(syncStatus).observe(statusLabel, { childList: true, characterData: true, subtree: true });
  }
})();
