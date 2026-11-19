(() => {
  "use strict";
  const Capacitor = window.Capacitor;
  if (!Capacitor || typeof Capacitor.isNativePlatform !== "function" || !Capacitor.isNativePlatform()) return;
  const LocalNotifications = Capacitor.registerPlugin?.("LocalNotifications") || Capacitor.Plugins?.LocalNotifications || null;
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
    alarms: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    assistant: '<svg viewBox="0 0 24 24"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></svg>'
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
  const items = [["dashboard","Home","index.html#dashboard"],["history","History","history.html"],["alarms","Alarms","alarms.html"],["assistant","AI","#assistant"]];
  const navButtons = {};
  items.forEach(([key,label,href]) => {
    const item = document.createElement("a");
    item.className = "cascade-app-nav-item";
    item.setAttribute("aria-label", label);
    item.href = href;
    item.innerHTML = icons[key] + "<span>" + label + "</span>";
    nav.appendChild(item);
    navButtons[key] = item;
    item.addEventListener("click", event => {
      const appRoot = document.documentElement;
      const chatPanel = document.querySelector("#cascade-chat .cascade-chat-panel");
      if (key === "assistant") {
        event.preventDefault();
        const opening = !appRoot.classList.contains("cascade-assistant-active");
        appRoot.classList.toggle("cascade-assistant-active", opening);
        if (typeof window.setCascadeAssistantOpen === "function") window.setCascadeAssistantOpen(opening);
        setActive(opening ? "assistant" : "dashboard");
      } else if (appRoot.classList.contains("cascade-assistant-active")) {
        appRoot.classList.remove("cascade-assistant-active");
        if (typeof window.setCascadeAssistantOpen === "function") window.setCascadeAssistantOpen(false);
      }
    });
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

  // Small confirmation toast shared by both threshold save controls.
  function showSettingsSavedToast(message = "Settings saved") {
    let toast = document.getElementById("cascade-settings-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cascade-settings-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.textContent = message;
      document.body.appendChild(toast);
    }
    toast.classList.remove("visible");
    void toast.offsetWidth;
    toast.classList.add("visible");
    clearTimeout(window.__cascadeSettingsToastTimer);
    window.__cascadeSettingsToastTimer = setTimeout(() => toast.classList.remove("visible"), 1900);
  }

  // Native save controls sit in the top-right corner of each threshold card.
  function addThresholdSave(cardSelector, inputId, label) {
    const card = document.querySelector(cardSelector);
    const header = card?.querySelector(".card-top");
    const input = document.getElementById(inputId);
    if (!card || !header || !input || header.querySelector(".native-threshold-save")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "native-threshold-save";
    button.setAttribute("aria-label", "Save " + label + " level");
    button.title = "Save " + label + " level";
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></svg>';
    header.appendChild(button);
    button.addEventListener("click", () => {
      if (typeof window.saveSettings !== "function") { showSettingsSavedToast("Could not save settings"); return; }
      button.disabled = true;
      const savedSuccessfully = window.saveSettings();
      button.disabled = false;
      if (!savedSuccessfully) {
        button.classList.remove("saved");
        button.title = "Check that the minimum level is below the maximum level.";
        return;
      }
      showSettingsSavedToast();
      try {
        const saved = JSON.parse(localStorage.getItem("cascade-dashboard-settings") || "null");
        const key = inputId === "cutoff" ? "cutoffLevel" : "lowWaterLevel";
        if (saved && Number(saved[key]) === Number(input.value)) {
          button.classList.add("saved");
          button.setAttribute("aria-label", label + " level saved");
          button.title = label + " level saved";
        }
      } catch (_) {}
    });
    input.addEventListener("input", () => {
      button.classList.remove("saved");
      button.setAttribute("aria-label", "Save " + label + " level");
      button.title = "Save " + label + " level";
    });
  }
  addThresholdSave(".setting-card", "cutoff", "maximum");
  addThresholdSave(".alert-card", "lowLevel", "minimum");

  // Android's permission prompt is requested once per installation. After
  // that, notification delivery uses LocalNotifications, never Web Notifications.
  async function requestAppNotifications() {
    const plugin = LocalNotifications;
    if (!plugin || typeof plugin.checkPermissions !== "function") {
      console.warn("Cascade LocalNotifications plugin is unavailable. Run npm install and npx cap sync android.");
      return;
    }
    try {
      if (plugin.createChannel) {
        await plugin.createChannel({id:"cascade-alerts",name:"Cascade alerts",description:"Water level, pump and reminder alerts",importance:4});
      }
      const permission = await plugin.checkPermissions();
      if (permission.display === "granted") return;
      if (permission.display === "prompt" || permission.display === "prompt-with-rationale") {
        if (localStorage.getItem("cascade-native-notification-prompted") !== "1") {
          localStorage.setItem("cascade-native-notification-prompted", "1");
          await plugin.requestPermissions();
        }
      }
    } catch (error) {
      console.warn("Cascade notification permission:", error);
    }
  }
  requestAppNotifications().finally(() => window.dispatchEvent(new Event("cascade-notification-permission-ready")));

  // Keep the launcher as an internal toggle for the AI tab, but never show
  // the floating mascot button in the native Android interface.
  const hideMascotLauncher = () => {
    document.querySelectorAll(".cascade-chat-launcher").forEach(node => {
      node.style.display = "none";
      node.setAttribute("aria-hidden", "true");
    });
  };
  hideMascotLauncher();
  new MutationObserver(hideMascotLauncher).observe(document.documentElement, {childList:true,subtree:true});

  if (active === "dashboard" && !window.location.hash) history.replaceState(null,"",window.location.pathname + "#dashboard");
  setActive(active);
  window.addEventListener("popstate", () => setActive(isHistory ? "history" : isAlarms ? "alarms" : "dashboard"));
})();