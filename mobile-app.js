(() => {
  "use strict";
  const Capacitor = window.Capacitor;
  if (!Capacitor || typeof Capacitor.isNativePlatform !== "function" || !Capacitor.isNativePlatform()) return;
  if (window.__cascadeNativeShell) return;
  window.__cascadeNativeShell = true;

  const root = document.documentElement;
  root.classList.add("cascade-native-app");
  if (localStorage.getItem("fluidops-theme") === "dark") document.body.classList.add("dark-mode");
  const path = window.location.pathname.toLowerCase();
  const isHistory = path.endsWith("history.html");
  const isAlarms = path.endsWith("alarms.html");
  let active = isHistory ? "history" : isAlarms ? "alarms" : "dashboard";

  const icons = {
    dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    alarms: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
  };

  const appBar = document.createElement("header");
  appBar.className = "cascade-app-topbar";
  appBar.innerHTML = '<span class="cascade-app-wordmark">Cascade</span><button class="cascade-app-menu-button" type="button" aria-label="Open menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';
  document.body.appendChild(appBar);

  const overlay = document.createElement("div");
  overlay.className = "cascade-app-drawer-overlay";
  overlay.innerHTML = '<aside class="cascade-app-drawer" role="dialog" aria-modal="true" aria-label="App menu"><div class="cascade-drawer-top"><strong>Cascade</strong><button type="button" class="cascade-drawer-close" aria-label="Close menu">×</button></div><div class="cascade-drawer-links"><a href="https://inversedev.github.io/cascade/#features" target="_blank" rel="noopener">About Cascade</a><a href="https://inversedev.github.io/cascade/#how" target="_blank" rel="noopener">How it works</a><a href="https://inversedev.github.io/cascade/#features" target="_blank" rel="noopener">Features</a><a href="mailto:FluidOps.Cascade@gmail.com">Contact & support</a><a href="https://inversedev.github.io/cascade/#footer" target="_blank" rel="noopener">Privacy</a></div><div class="cascade-drawer-divider"></div><button type="button" class="cascade-drawer-theme"><span>Dark mode</span><span class="cascade-theme-switch" aria-hidden="true"></span></button><section class="cascade-drawer-account"><h3>Account</h3><div class="cascade-drawer-auth-slot"></div></section></aside>';
  document.body.appendChild(overlay);

  const nav = document.createElement("nav");
  nav.className = "cascade-app-bottom-nav";
  nav.setAttribute("aria-label", "Main navigation");
  const items = [["dashboard","Home","index.html#dashboard"],["history","History","history.html"],["alarms","Alarms","alarms.html"]];
  const navButtons = {};
  items.forEach(([key,label,href]) => {
    const item = document.createElement("a");
    item.className = "cascade-app-nav-item";
    item.setAttribute("aria-label", label);
    item.href = href;
    item.innerHTML = icons[key] + "<span>" + label + "</span>";
    nav.appendChild(item);
    navButtons[key] = item;
  });
  document.body.appendChild(nav);

  const main = document.querySelector("main");
  if (main) main.classList.add("cascade-app-content");
  const dashboardTitle = document.querySelector(".dashboard-heading h2");
  if (dashboardTitle) dashboardTitle.textContent = "Dashboard";
  const compactLabels = [[".water-card .card-kicker","WATER LEVEL"],[".motor-card .card-kicker","PUMP CONTROL"],[".setting-card .card-kicker","MAX LEVEL"],[".alert-card .card-kicker","LOW LEVEL"]];
  compactLabels.forEach(([selector,label]) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = label;
  });

  function setActive(key) {
    active = key;
    Object.entries(navButtons).forEach(([name,button]) => {
      button.classList.toggle("active", name === key);
      if (name === key) button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
  }
  function closeDrawer() {
    overlay.classList.remove("open");
    document.body.classList.remove("cascade-drawer-open");
  }
  function openDrawer() {
    overlay.classList.add("open");
    document.body.classList.add("cascade-drawer-open");
  }
  appBar.querySelector("button").addEventListener("click", openDrawer);
  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest(".cascade-drawer-close")) closeDrawer();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDrawer();
  });

  const authPanel = document.getElementById("motorAuthPanel");
  const authSlot = overlay.querySelector(".cascade-drawer-auth-slot");
  if (authPanel && authSlot) {
    authSlot.appendChild(authPanel);
    const label = authPanel.querySelector('label[for="motorEmail"]');
    const loginButton = authPanel.querySelector("#motorLoginButton");
    if (label) label.textContent = "Account";
    if (loginButton) loginButton.textContent = "Sign in";
  }
  if (!authPanel) {
    const link = document.createElement("a");
    link.href = "index.html#dashboard";
    link.textContent = "Sign in / Account";
    link.className = "cascade-drawer-account-link";
    authSlot.appendChild(link);
  }

  const authLogin = document.getElementById("motorLoginControls");
  const authSession = document.getElementById("motorSessionControls");
  const authRequired = document.getElementById("motorAuthRequired");
  const pumpButtons = document.querySelector(".motor-card .button-row");
  const syncAuthView = () => {
    const signedIn = Boolean(authSession && !authSession.hidden);
    if (authRequired) authRequired.hidden = signedIn;
    if (pumpButtons) pumpButtons.hidden = !signedIn;
    document.body.classList.toggle("cascade-signed-in", signedIn);
  };
  if (authLogin && authSession) {
    new MutationObserver(syncAuthView).observe(authLogin,{attributes:true,attributeFilter:["hidden"]});
    new MutationObserver(syncAuthView).observe(authSession,{attributes:true,attributeFilter:["hidden"]});
  }
  syncAuthView();

  const themeMenu = overlay.querySelector(".cascade-drawer-theme");
  themeMenu.classList.toggle("enabled", document.body.classList.contains("dark-mode"));
  themeMenu.addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("fluidops-theme", dark ? "dark" : "light");
    themeMenu.classList.toggle("enabled", dark);
  });

  // Compact per-threshold save affordances. The existing settings function
  // remains the single source of truth and persists both validated values.
  function addThresholdSave(selector, inputId, label) {
    const input = document.getElementById(inputId);
    const valueRow = document.querySelector(selector);
    if (!input || !valueRow || valueRow.querySelector(".native-threshold-save")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "native-threshold-save";
    button.setAttribute("aria-label", "Save " + label + " threshold");
    button.title = "Save " + label + " threshold";
    button.textContent = "✓";
    valueRow.appendChild(button);
    button.addEventListener("click", () => {
      if (typeof window.saveSettings !== "function") return;
      window.saveSettings();
      try {
        const saved = JSON.parse(localStorage.getItem("cascade-dashboard-settings") || "null");
        const expected = Number(input.value);
        const key = inputId === "cutoff" ? "cutoffLevel" : "lowWaterLevel";
        if (saved && Number(saved[key]) === expected) {
          button.classList.add("saved");
          button.setAttribute("aria-label", label + " threshold saved");
        }
      } catch (_) {}
    });
    input.addEventListener("input", () => {
      button.classList.remove("saved");
      button.setAttribute("aria-label", "Save " + label + " threshold");
    });
  }
  addThresholdSave(".setting-card .range-value", "cutoff", "maximum");
  addThresholdSave(".alert-card .range-value", "lowLevel", "minimum");

  // Android's permission prompt is requested once per installation. After
  // that, notification delivery uses LocalNotifications, never Web Notifications.
  async function requestAppNotifications() {
    const plugin = Capacitor?.Plugins?.LocalNotifications;
    if (!plugin || typeof plugin.checkPermissions !== "function") return;
    try {
      if (plugin.createChannel) {
        await plugin.createChannel({id:"cascade-alerts",name:"Cascade alerts",description:"Water level and pump alerts",importance:4});
      }
      const permission = await plugin.checkPermissions();
      if (permission.display === "granted") return;
      if (permission.display === "prompt" || permission.display === "prompt-with-rationale") {
        const asked = localStorage.getItem("cascade-native-notification-prompted") === "1";
        if (!asked) {
          localStorage.setItem("cascade-native-notification-prompted", "1");
          await plugin.requestPermissions();
        }
      }
    } catch (error) {
      console.warn("Cascade notification permission:", error);
    }
  }
  requestAppNotifications();

  if (active === "dashboard" && !window.location.hash) history.replaceState(null,"",window.location.pathname + "#dashboard");
  setActive(active);
  window.addEventListener("popstate", () => setActive(isHistory ? "history" : isAlarms ? "alarms" : "dashboard"));
})();