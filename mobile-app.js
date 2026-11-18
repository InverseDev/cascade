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
    dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    alarms: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    assistant: '<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>'
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
  const items = [["dashboard","Home","index.html#dashboard"],["history","History","history.html"],["alarms","Alarms","alarms.html"],["assistant","AI",null]];
  const navButtons = {};
  items.forEach(([key,label,href]) => {
    const item = document.createElement(href ? "a" : "button");
    item.className = "cascade-app-nav-item";
    item.setAttribute("aria-label",label);
    if (href) item.href=href; else {item.type="button";item.addEventListener("click",enterAssistant);}
    item.innerHTML=icons[key]+"<span>"+label+"</span>";
    nav.appendChild(item); navButtons[key]=item;
  });
  document.body.appendChild(nav);
  const main=document.querySelector("main"); if(main) main.classList.add("cascade-app-content");
  const dashboardTitle=document.querySelector(".dashboard-heading h2");if(dashboardTitle)dashboardTitle.textContent="Dashboard";
  function setActive(key){active=key;Object.entries(navButtons).forEach(([name,button])=>{button.classList.toggle("active",name===key);if(name===key)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");});}
  function closeDrawer(){overlay.classList.remove("open");document.body.classList.remove("cascade-drawer-open");}
  function openDrawer(){overlay.classList.add("open");document.body.classList.add("cascade-drawer-open");}
  appBar.querySelector("button").addEventListener("click",openDrawer);
  overlay.addEventListener("click",event=>{if(event.target===overlay||event.target.closest(".cascade-drawer-close"))closeDrawer();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeDrawer();});
  function leaveAssistant(){root.classList.remove("cascade-assistant-active");const chatRoot=document.getElementById("cascade-chat");const panel=chatRoot&&chatRoot.querySelector(".cascade-chat-panel");if(panel){panel.classList.remove("open");panel.setAttribute("aria-hidden","true");}if(chatRoot)chatRoot.classList.remove("chat-open");setActive(isHistory?"history":isAlarms?"alarms":"dashboard");}
  function enterAssistant(){const chatRoot=document.getElementById("cascade-chat");const panel=chatRoot&&chatRoot.querySelector(".cascade-chat-panel");if(!panel)return;root.classList.add("cascade-assistant-active");panel.classList.add("open");panel.setAttribute("aria-hidden","false");chatRoot.classList.add("chat-open");setActive("assistant");}
  const chatObserver=new MutationObserver(()=>{const chatRoot=document.getElementById("cascade-chat");if(!chatRoot||chatRoot.dataset.nativeShellWired)return;chatRoot.dataset.nativeShellWired="true";chatRoot.addEventListener("click",event=>{if(event.target.closest(".cascade-chat-close"))leaveAssistant();});chatObserver.disconnect();});
  chatObserver.observe(document.documentElement,{childList:true,subtree:true});
  const authPanel=document.getElementById("motorAuthPanel");
  const authSlot=overlay.querySelector(".cascade-drawer-auth-slot");
  if(authPanel&&authSlot){authSlot.appendChild(authPanel);const label=authPanel.querySelector("label[for=\"motorEmail\"]");const loginButton=authPanel.querySelector("#motorLoginButton");if(label)label.textContent="Account";if(loginButton)loginButton.textContent="Sign in";}
  if(!authPanel){const link=document.createElement("a");link.href="index.html#dashboard";link.textContent="Sign in / Account";link.className="cascade-drawer-account-link";authSlot.appendChild(link);}
  const authLogin=document.getElementById("motorLoginControls");
  const authSession=document.getElementById("motorSessionControls");
  const authRequired=document.getElementById("motorAuthRequired");
  const pumpButtons=document.querySelector(".motor-card .button-row");
  const syncAuthView=()=>{const signedIn=Boolean(authSession&&!authSession.hidden);if(authRequired)authRequired.hidden=signedIn;if(pumpButtons)pumpButtons.hidden=!signedIn;document.body.classList.toggle("cascade-signed-in",signedIn);};
  if(authLogin&&authSession){new MutationObserver(syncAuthView).observe(authLogin,{attributes:true,attributeFilter:["hidden"]});new MutationObserver(syncAuthView).observe(authSession,{attributes:true,attributeFilter:["hidden"]});}
  syncAuthView();
  const themeMenu=overlay.querySelector(".cascade-drawer-theme");
  themeMenu.classList.toggle("enabled",document.body.classList.contains("dark-mode"));
  themeMenu.addEventListener("click",()=>{const themeButton=document.getElementById("themeToggle");if(themeButton)themeButton.click();themeMenu.classList.toggle("enabled",document.body.classList.contains("dark-mode"));});
  async function requestAppNotifications(){const plugin=Capacitor?.Plugins?.LocalNotifications;if(!plugin||typeof plugin.checkPermissions!=="function")return;try{if(plugin.createChannel)await plugin.createChannel({id:"cascade-alerts",name:"Cascade alerts",description:"Water level and pump alerts",importance:4});const permission=await plugin.checkPermissions();if(permission.display==="prompt"||permission.display==="prompt-with-rationale")await plugin.requestPermissions();}catch(error){console.warn("Cascade notification permission:",error);}}
  requestAppNotifications();
  if(active==="dashboard"&&!window.location.hash)history.replaceState(null,"",window.location.pathname+"#dashboard");
  setActive(active);
  window.addEventListener("popstate",leaveAssistant);
})();