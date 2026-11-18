(() => {
  "use strict";
  const API_URL = window.CASCADE_CHAT_API_URL || "";
  const root = document.createElement("div");
  root.id = "cascade-chat";
  root.innerHTML = `
    <button class="cascade-chat-launcher" type="button" aria-label="Open Cascade AI assistant" aria-expanded="false">
      <img class="cascade-mascot-launcher" src="assets/mascots/cascade-hero.svg" alt="" aria-hidden="true">
    </button>
    <div class="cascade-chat-greeting" role="status" aria-live="polite">Hi! How may I help you?</div>
    <section class="cascade-chat-panel" aria-label="Cascade AI assistant" aria-hidden="true">
      <header class="cascade-chat-head">
        <div class="cascade-chat-brand"><span class="cascade-chat-avatar">C</span><span><strong>Cascade Assistant</strong><small><i></i> Here to help</small></span></div>
        <button class="cascade-chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="cascade-chat-messages" role="log" aria-live="polite">
        <div class="cascade-chat-welcome">
          <div class="cascade-chat-welcome-label">CASCADE · SMART WATER SYSTEM</div>
          <h3>How can I help you?</h3>
          <p>Ask me about your tank, water levels, alerts or pump controls. I can also help you adjust dashboard settings.</p>
        </div>
        <div class="cascade-chat-message bot">Hello! I'm your Cascade assistant. What would you like to know?</div>
        <div class="cascade-chat-suggestions">
          <button type="button" data-question="How does Cascade work?">How does the system work?</button>
          <button type="button" data-question="Explain the dashboard features.">Explore dashboard features</button>
          <button type="button" data-question="How do I change the low-water alert?">Change low-water alert</button>
          <button type="button" data-question="How do I change the maximum cutoff level?">Adjust maximum level</button>
        </div>
      </div>
      <form class="cascade-chat-form">
        <input name="message" type="text" maxlength="1000" placeholder="Ask about Cascade..." autocomplete="off" aria-label="Message Cascade assistant" required>
        <button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h13"/></svg></button>
      </form>
      <div class="cascade-chat-foot">AI responses may be inaccurate. Hardware actions require confirmation.</div>
    </section>`;
  // Mount outside the page body so transforms/overflow on the site cannot
  // trap the assistant inside the document layout.
  document.documentElement.appendChild(root);

  const launcher = root.querySelector(".cascade-chat-launcher");
  const mascotImage = launcher.querySelector(".cascade-mascot-launcher");
  const mascotPage = location.pathname.toLowerCase();
  mascotImage.src = mascotPage.includes("history") ? "assets/mascots/cascade-analytics.svg" : mascotPage.includes("alarms") ? "assets/mascots/cascade-summary.svg" : "assets/mascots/cascade-hero.svg";
  const panel = root.querySelector(".cascade-chat-panel");
  const close = root.querySelector(".cascade-chat-close");
  const form = root.querySelector("form");
  const input = form.elements.message;
  const messages = root.querySelector(".cascade-chat-messages");
  let busy = false;

  function setOpen(open) {
    panel.classList.toggle("open", open);
    root.classList.toggle("chat-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close Cascade AI assistant" : "Open Cascade AI assistant");
    if (open) setTimeout(() => input.focus(), 120);
  }
  launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  close.addEventListener("click", () => setOpen(false));

  // The chat is a viewport-level window and can be repositioned by dragging
  // its header. Keep the whole panel inside the visible screen.
  const dragHandle = root.querySelector(".cascade-chat-head");
  let drag = null;
  dragHandle.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    const rect = panel.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    panel.style.left = rect.left + "px";
    panel.style.top = rect.top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    dragHandle.setPointerCapture(event.pointerId);
    dragHandle.style.cursor = "grabbing";
  });
  dragHandle.addEventListener("pointermove", event => {
    if (!drag) return;
    const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
    panel.style.left = Math.min(maxLeft, Math.max(8, event.clientX - drag.x)) + "px";
    panel.style.top = Math.min(maxTop, Math.max(8, event.clientY - drag.y)) + "px";
  });
  function stopDragging() {
    drag = null;
    dragHandle.style.cursor = "";
  }
  dragHandle.addEventListener("pointerup", stopDragging);
  dragHandle.addEventListener("pointercancel", stopDragging);
  window.addEventListener("resize", () => {
    if (!panel.style.left || !panel.classList.contains("open")) return;
    const rect = panel.getBoundingClientRect();
    panel.style.left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - panel.offsetWidth - 8)) + "px";
    panel.style.top = Math.min(Math.max(8, rect.top), Math.max(8, window.innerHeight - panel.offsetHeight - 8)) + "px";
  });


  function addMessage(text, who) {
    const el = document.createElement("div");
    el.className = "cascade-chat-message " + who;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }
  function addTyping() {
    const el = addMessage("Thinking…", "bot typing");
    return el;
  }
  function localAnswer(text) {
    const q = text.toLowerCase();
    if (/^(hi|hello|hey)\b/.test(q)) return "Hello! I can explain Cascade's features and help you use the dashboard.";
    if (/how.*work|working|process|flow/.test(q)) return "Cascade uses an ultrasonic sensor to measure the water level. The ESP32 processes the reading, reports it to the dashboard and can control a pump through a relay when device-side automation is configured.";
    if (/feature|dashboard|tank overview|pump management|alarm|history|report/.test(q)) return "The dashboard shows the tank level, sensor distance, pump status, automation cutoff and low-water alert setting. Alarm Centre is for alerts, while History & Reports shows recorded system activity.";
    if (/low.?water|alert|threshold/.test(q)) return "You can change the low-water alert from the Early Warning card. You can also ask me to set a new percentage; I'll show you the change and ask you to confirm it before saving.";
    if (/cut.?off|automation/.test(q)) return "The cutoff threshold is the selected tank level at which the motor should stop. Note that the current website labels this as a dashboard preference; device-side automation is not active yet.";
    if (/motor|pump/.test(q)) return "Pump status is reported by the ESP32. Pump controls require the owner account and a connected device. Don't rely on the website alone as a safety interlock.";
    return "I can answer common questions about Cascade, its sensor, dashboard, pump controls and alerts. For open-ended AI answers, the Gemini backend still needs to be configured by the site owner.";
  }
  function parseLowAlert(text) {
    const m = text.match(/(?:low(?:[- ]water)?\s+)?(?:alert|threshold)(?:\s+(?:to|at|of))?\s*(\d{1,2})\s*%?/i)
      || text.match(/set\s+(?:the\s+)?low(?:[- ]water)?\s+(?:alert|level|threshold)\s+(?:to\s+)?(\d{1,2})\s*%?/i);
    if (!m) return null;
    const value = Number(m[1]);
    return value >= 5 && value <= 40 ? value : null;
  }
  function parseCutoff(text) {
    if (!/\b(set|change|make|adjust|update)\b/i.test(text)) return null;
    const m = text.match(/(?:maximum|max|cut[ -]?off|stop|full[- ]tank)\s*(?:water\s*)?(?:level|threshold)?\s*(?:to|at|of|=)?\s*(\d{1,3})\s*%?/i)
      || text.match(/(?:level|cut[ -]?off)\s*(?:to|at)\s*(\d{1,3})\s*%?/i);
    if (!m) return null;
    const value = Number(m[1]);
    return value >= 50 && value <= 100 ? value : null;
  }
  function askCutoffConfirmation(value) {
    const current = document.getElementById("cutoff");
    if (!current) return "I couldn't find the maximum-level cutoff control on this page.";
    const old = Number(current.value);
    const prompt = addMessage("Change the maximum tank level (automatic cutoff) from " + old + "% to " + value + "%? This saves a preference in this browser only; it does not update the ESP32.", "bot");
    const actions = document.createElement("div");
    actions.className = "cascade-chat-confirm";
    const yes = document.createElement("button");
    yes.type = "button"; yes.textContent = "Confirm change";
    const no = document.createElement("button");
    no.type = "button"; no.textContent = "Cancel";
    actions.append(yes, no);
    prompt.appendChild(actions);
    yes.addEventListener("click", () => {
      current.value = String(value);
      if (typeof window.updateCutoff === "function") window.updateCutoff();
      if (typeof window.saveSettings === "function") window.saveSettings();
      addMessage("Saved the maximum-level cutoff preference at " + value + "%. This is local to this browser and is not yet synced to the ESP32.", "bot");
      actions.remove();
    }, { once: true });
    no.addEventListener("click", () => { addMessage("No changes made.", "bot"); actions.remove(); }, { once: true });
  }
  function askLowAlertConfirmation(value) {
    const current = document.getElementById("lowLevel");
    if (!current) return "I couldn't find the low-water alert control on this page.";
    const old = Number(current.value);
    const prompt = addMessage("Change the low-water alert from " + old + "% to " + value + "%? This saves a preference in this browser only; it does not update the ESP32 firmware.", "bot");
    const actions = document.createElement("div");
    actions.className = "cascade-chat-confirm";
    const yes = document.createElement("button");
    yes.type = "button"; yes.textContent = "Confirm change";
    const no = document.createElement("button");
    no.type = "button"; no.textContent = "Cancel";
    actions.append(yes, no);
    prompt.appendChild(actions);
    yes.addEventListener("click", () => {
      current.value = String(value);
      if (typeof window.updateLowLevel === "function") window.updateLowLevel();
      if (typeof window.saveSettings === "function") window.saveSettings();
      addMessage("Saved the low-water alert preference at " + value + "%. This is local to this browser and is not yet synced to the ESP32.", "bot");
      actions.remove();
    }, { once: true });
    no.addEventListener("click", () => { addMessage("No changes made.", "bot"); actions.remove(); }, { once: true });
  }
  const CHAT_LOG_KEY = "cascade-assistant-chat-v1";
  const CHAT_PENDING_KEY = "cascade-assistant-pending-v1";
  let pendingIntent = null;
  try { pendingIntent = JSON.parse(localStorage.getItem(CHAT_PENDING_KEY) || "null"); } catch (_) {}
  function setPending(intent) {
    pendingIntent = intent;
    if (intent) localStorage.setItem(CHAT_PENDING_KEY, JSON.stringify(intent));
    else localStorage.removeItem(CHAT_PENDING_KEY);
  }
  function saveChatLog() {
    const log = [...messages.querySelectorAll(".cascade-chat-message:not(.typing)")].slice(-30)
      .map(node => ({ who: node.classList.contains("user") ? "user" : "bot", text: node.querySelector(".cascade-chat-confirm") ? node.firstChild.textContent : node.textContent }));
    try { localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(log)); } catch (_) {}
  }
  function restoreChatLog() {
    try {
      const log = JSON.parse(localStorage.getItem(CHAT_LOG_KEY) || "[]");
      if (!Array.isArray(log) || !log.length) return;
      messages.querySelectorAll(".cascade-chat-message,.cascade-chat-suggestions").forEach(node => node.remove());
      log.slice(-24).forEach(item => {
        if (item && typeof item.text === "string") addMessage(item.text, item.who === "user" ? "user" : "bot");
      });
    } catch (_) {}
  }
  restoreChatLog();

  function pageName() {
    const path = location.pathname.toLowerCase();
    return path.includes("alarms") ? "alerts" : path.includes("history") ? "history" : "dashboard";
  }
  function navigateTo(target) {
    const urls = {
      home: "index.html#home", dashboard: "index.html#dashboard",
      features: "index.html#features", how: "index.html#how",
      alerts: "alarms.html", alarms: "alarms.html",
      history: "history.html", reports: "history.html"
    };
    if (!urls[target]) return false;
    location.href = urls[target];
    return true;
  }
  function confirmAction(question, action, success) {
    const prompt = addMessage(question, "bot");
    const actions = document.createElement("div");
    actions.className = "cascade-chat-confirm";
    const yes = document.createElement("button");
    yes.type = "button"; yes.textContent = "Confirm";
    const no = document.createElement("button");
    no.type = "button"; no.textContent = "Cancel";
    actions.append(yes, no); prompt.appendChild(actions);
    yes.addEventListener("click", () => {
      actions.remove();
      const result = action();
      addMessage(typeof result === "string" ? result : success, "bot");
      saveChatLog();
    }, { once: true });
    no.addEventListener("click", () => {
      actions.remove(); setPending(null); addMessage("Cancelled. No changes made.", "bot"); saveChatLog();
    }, { once: true });
    return true;
  }
  function readSettings() {
    try { return JSON.parse(localStorage.getItem("cascade-dashboard-settings") || '{"cutoffLevel":90,"lowWaterLevel":20}'); }
    catch (_) { return { cutoffLevel: 90, lowWaterLevel: 20 }; }
  }
  function applySettings(changes) {
    const current = readSettings();
    const next = { cutoffLevel: Number(changes.cutoffLevel ?? current.cutoffLevel), lowWaterLevel: Number(changes.lowWaterLevel ?? current.lowWaterLevel) };
    if (next.lowWaterLevel < 5 || next.lowWaterLevel > 40 || next.cutoffLevel < 50 || next.cutoffLevel > 100 || next.lowWaterLevel >= next.cutoffLevel) {
      return "That combination is invalid. The low-water alert must be 5–40% and remain below the 50–100% cutoff.";
    }
    localStorage.setItem("cascade-dashboard-settings", JSON.stringify(next));
    const cutoff = document.getElementById("cutoff"), low = document.getElementById("lowLevel");
    if (cutoff) { cutoff.value = next.cutoffLevel; if (window.updateCutoff) window.updateCutoff(); }
    if (low) { low.value = next.lowWaterLevel; if (window.updateLowLevel) window.updateLowLevel(); }
    return "Saved your browser preferences: low-water alert " + next.lowWaterLevel + "% and maximum cutoff " + next.cutoffLevel + "%. These preferences do not configure the ESP32 or activate device-side automation.";
  }
  function toggleTheme(mode) {
    const dark = mode === "dark" ? true : mode === "light" ? false : localStorage.getItem("fluidops-theme") !== "dark";
    localStorage.setItem("fluidops-theme", dark ? "dark" : "light");
    document.body.classList.toggle("dark-mode", dark);
    const toggle = document.getElementById("themeToggle") || document.getElementById("alarmThemeToggle") || document.getElementById("historyThemeToggle");
    if (toggle) toggle.textContent = dark ? "☀️" : "🌙";
    return "Switched to " + (dark ? "dark" : "light") + " mode.";
  }
  function runAction(text) {
    const q = text.toLowerCase().trim();

    // Continue an unfinished request before interpreting the new message alone.
    if (pendingIntent?.type === "threshold") {
      const m = q.match(/(?:^|\b)(\d{1,3})\s*%?(?:\s|$)/)
        || q.match(/(?:at|to|make it)\s+(\d{1,3})\s*%?/);
      if (m) {
        const value = Number(m[1]), kind = pendingIntent.kind;
        setPending(null);
        if (kind === "low" && value >= 5 && value <= 40) return confirmAction("Set the low-water alert to " + value + "%? This changes the saved browser preference only; it does not update the ESP32.", () => applySettings({ lowWaterLevel: value }));
        if (kind === "cutoff" && value >= 50 && value <= 100) return confirmAction("Set the maximum cutoff to " + value + "%? This changes the saved browser preference only; it does not update the ESP32.", () => applySettings({ cutoffLevel: value }));
        return "That percentage is outside the allowed range. The low-water alert must be 5–40%, and the maximum cutoff must be 50–100%. What value would you like instead?";
      }
      if (/\b(cancel|never mind|nevermind)\b/.test(q)) { setPending(null); return "Cancelled. No setting was changed."; }
    }
    if (pendingIntent?.type === "alarm-field") {
      const field = pendingIntent.field;
      if (field === "name") pendingIntent.alarm.name = text.trim();
      if (field === "time" && /^([01]\d|2[0-3]):[0-5]\d$/.test(q)) pendingIntent.alarm.time = q;
      if (field === "date" && /^(\d{4}-\d{2}-\d{2}|today|tomorrow)$/i.test(q)) {
        const d = new Date(); if (q === "tomorrow") d.setDate(d.getDate()+1);
        pendingIntent.alarm.date = q === "today" || q === "tomorrow" ? d.toLocaleDateString("en-CA") : q;
      }
      if (field === "repeat" && /^(yes|daily|repeat)$/i.test(q)) pendingIntent.alarm.repeat = true;
      if (field === "repeat" && /^(no|once|one time)$/i.test(q)) pendingIntent.alarm.repeat = false;
      const a = pendingIntent.alarm;
      const missing = !a.name ? "name" : !a.time ? "time (24-hour format, e.g. 07:30)" : (!a.date && !a.repeat) ? "date (YYYY-MM-DD, today or tomorrow)" : null;
      if (missing) { setPending({ type:"alarm-field", field: missing.startsWith("name") ? "name" : missing.startsWith("time") ? "time" : "date", alarm:a }); return "Got it. What is the alarm " + missing + "?"; }
      setPending(null);
      const key = "cascade_scheduled_alarms";
      const alarms = JSON.parse(localStorage.getItem(key) || "[]");
      alarms.push({ id: Date.now().toString(), name:a.name, time:a.time, date:a.repeat ? null : a.date, repeat:!!a.repeat, enabled:true, createdAt:new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(alarms));
      return "Created the alarm “" + a.name + "” for " + a.time + (a.repeat ? " every day." : " on " + a.date + ".");
    }

    if (/^(hi|hello|hey)\b/.test(q)) return "Hello! I can manage dashboard preferences, navigate pages, create alarms, filter or export history, change themes and help with pump controls.";
    const lowIntent = /low.?water|low level|low.*percent|low.*threshold|alert threshold|water alert/.test(q) && /set|change|adjust|make|update|want|new|percentage|percent|threshold|limit/.test(q);
    const cutoffIntent = /cut.?off|maximum level|max level|full.?tank/.test(q) && /set|change|adjust|make|update|want|new|percentage|threshold/.test(q);
    if (lowIntent || cutoffIntent) {
      const kind = lowIntent ? "low" : "cutoff";
      const m = q.match(/\b(\d{1,3})\s*%?/);
      if (m) {
        const value = Number(m[1]); setPending(null);
        if (kind === "low" && value >= 5 && value <= 40) return confirmAction("Set the low-water alert to " + value + "%? This is a browser-only preference and does not configure the ESP32.", () => applySettings({ lowWaterLevel:value }));
        if (kind === "cutoff" && value >= 50 && value <= 100) return confirmAction("Set the maximum cutoff to " + value + "%? This is a browser-only preference and does not configure the ESP32.", () => applySettings({ cutoffLevel:value }));
        return kind === "low" ? "The low-water alert must be between 5% and 40%. What value would you like?" : "The maximum cutoff must be between 50% and 100%. What value would you like?";
      }
      setPending({ type:"threshold", kind });
      return "Sure. What percentage should I set the " + (kind === "low" ? "low-water alert" : "maximum cutoff") + " to?";
    }
    const nav = q.match(/\b(open|go to|show|take me to|visit)\s+(the\s+)?(dashboard|home|alerts?|alarm center|alarm centre|history|reports|features|how it works)\b/);
    if (nav) {
      const dest = /alert|alarm/.test(nav[3]) ? "alerts" : /history|report/.test(nav[3]) ? "history" : /feature/.test(nav[3]) ? "features" : /how/.test(nav[3]) ? "how" : /home/.test(nav[3]) ? "home" : "dashboard";
      navigateTo(dest); return "Opening " + dest + ".";
    }
    if (/\b(dark mode|dark theme|turn on dark)\b/.test(q)) return toggleTheme("dark");
    if (/\b(light mode|light theme|turn off dark)\b/.test(q)) return toggleTheme("light");
    if (/\b(toggle theme|switch theme|change theme)\b/.test(q)) return toggleTheme();
    if (/enable notifications|turn on notifications/.test(q)) {
      if (typeof window.enableNotifications === "function") { window.enableNotifications(); return "Requested browser notification permission. Please respond to the browser permission prompt."; }
      if ("Notification" in window) { Notification.requestPermission(); return "Requested browser notification permission."; }
      return "This browser does not support notifications.";
    }
    if (/\\b(refresh|reload|update)\\b.*\\b(sensor|readings|device|dashboard)\\b/.test(q)) {
      if (typeof window.fetchLatestReading === "function") { window.fetchLatestReading(); return "Refreshing the latest sensor reading from Supabase."; }
      navigateTo("dashboard"); return "Opening the Dashboard, where live sensor readings are displayed.";
    }
    if (/\\b(test|preview|play)\\b.*\\b(alarm|ringtone|sound)\\b/.test(q)) {
      const button = document.getElementById("testAlarmSound");
      if (!button) { navigateTo("alerts"); return "Opening Alarm Centre. I can preview the selected ringtone there."; }
      button.click(); return "Playing a preview of the currently selected alarm sound.";
    }
    const soundChoice = q.match(/\\b(classic|gentle|digital)\\b.*\\b(sound|ringtone|alarm)\\b|\\b(sound|ringtone|alarm)\\b.*\\b(classic|gentle|digital)\\b/);
    if (soundChoice) {
      const select = document.getElementById("alarmSoundPreset");
      if (!select) { navigateTo("alerts"); return "Opening Alarm Centre. Ask me again to change the ringtone."; }
      const preset = ["classic","gentle","digital"].find(value => q.includes(value));
      if (preset) { select.value = preset; select.dispatchEvent(new Event("change",{bubbles:true})); return "Selected the " + preset + " alarm sound."; }
    }
    if (/\\b(clear|reset)\\b.*\\b(search|filters?)\\b/.test(q)) {
      const search = document.getElementById("historySearch");
      const from = document.getElementById("historyFrom"), to = document.getElementById("historyTo");
      if (!search || !from || !to) { navigateTo("history"); return "Opening History & Reports. Ask me again to clear its filters."; }
      search.value = ""; from.value = ""; to.value = "";
      search.dispatchEvent(new Event("input",{bubbles:true}));
      from.dispatchEvent(new Event("change",{bubbles:true}));
      to.dispatchEvent(new Event("change",{bubbles:true}));
      const all = document.querySelector('.history-filter[data-filter="all"]'); if (all) all.click();
      return "Cleared the history search and date filters.";
    }

    const alertPref = q.match(/\b(enable|turn on|disable|turn off)\b.*\b(low water|low-water|motor|cutoff|cut-off)\b.*\b(alert|alerts|notification|notifications)\b|\b(enable|turn on|disable|turn off)\b.*\b(alert|alerts|notifications)\b.*\b(low water|low-water|motor|cutoff|cut-off)\b/);
    if (alertPref) {
      const enabled = /enable|turn on/.test(q);
      const targetText = (alertPref[2] || alertPref[4] || "").replace(/-/g," ");
      const target = /low water/.test(targetText) ? "lowWaterAlertEnabled" : /motor/.test(targetText) ? "motorAlertEnabled" : /cutoff/.test(targetText) ? "cutoffAlertEnabled" : null;
      if (!target) return "Which alert do you mean: low-water, motor, or automatic-cutoff alerts?";
      const checkbox = document.getElementById(target);
      if (!checkbox) { navigateTo("alerts"); return "Opening Alarm Centre. Ask me again there to change that alert."; }
      checkbox.checked = enabled;
      checkbox.dispatchEvent(new Event("change", { bubbles:true }));
      return (enabled ? "Enabled " : "Disabled ") + target.replace("Enabled","").replace(/([A-Z])/g," $1").toLowerCase() + " alerts.";
    }
    const alarmCreate = /\b(create|add|schedule|set up)\b.*\balarm\b/.test(q);
    if (alarmCreate) {
      const alarm = { name:"", time:"", date:"", repeat:/daily|every day|repeat/.test(q) };
      const name = text.match(/alarm(?: called| named)?\s+["“]?([^,]+?)["”]?(?:\s+at\s+|$)/i);
      if (name && !/^for|^at$/i.test(name[1])) alarm.name = name[1].trim();
      const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (time) alarm.time = time[1].padStart(2,"0")+":"+time[2];
      if (/tomorrow/i.test(q)) { const d=new Date(); d.setDate(d.getDate()+1); alarm.date=d.toLocaleDateString("en-CA"); }
      else if (/today/i.test(q)) alarm.date=new Date().toLocaleDateString("en-CA");
      else { const date=text.match(/\b(20\d{2}-\d{2}-\d{2})\b/); if(date) alarm.date=date[1]; }
      if (/daily|every day/.test(q)) alarm.repeat = true;
      const missing = !alarm.name ? "name" : !alarm.time ? "time (24-hour format, e.g. 07:30)" : (!alarm.date && !alarm.repeat) ? "date (YYYY-MM-DD, today or tomorrow)" : null;
      if (missing) { setPending({type:"alarm-field",field:missing.startsWith("name")?"name":missing.startsWith("time")?"time":"date",alarm}); return "I can create that. What is the alarm " + missing + "?"; }
      setPending({type:"alarm-field",field:"repeat",alarm});
      return "Should “" + alarm.name + "” repeat every day? Reply yes or no.";
    }
    if (/\b(delete|remove|cancel)\b.*\balarm\b/.test(q)) {
      const alarms = JSON.parse(localStorage.getItem("cascade_scheduled_alarms") || "[]");
      if (!alarms.length) return "There are no scheduled alarms to delete.";
      const target = alarms.find(a => q.includes(String(a.name).toLowerCase()));
      if (!target) return "I found " + alarms.length + " alarm(s). Tell me the exact alarm name you want to delete.";
      return confirmAction("Delete the alarm “"+target.name+"”?", () => {
        localStorage.setItem("cascade_scheduled_alarms", JSON.stringify(alarms.filter(a=>a.id!==target.id)));
        return "Deleted alarm “"+target.name+"”.";
      });
    }
    if (/\b(export|download)\b.*\b(history|reports|csv)\b/.test(q)) {
      const button=document.getElementById("historyExport"); if(button){button.click();return "Exporting the history CSV.";}
      navigateTo("history"); return "Opening History & Reports. Ask me to export again once the page loads.";
    }
    if (/\b(clear|delete|erase)\b.*\bhistory\b/.test(q)) {
      return confirmAction("This will permanently clear the history stored in this browser. Continue?", () => {
        localStorage.removeItem("fluidops_full_history");
        if (typeof window.loadHistory === "function") window.loadHistory();
        const timeline=document.getElementById("historyTimeline"); if(timeline) timeline.innerHTML='<div class="history-empty"><h3>No history available yet</h3><p>Your system activities will appear here.</p></div>';
        return "Cleared the locally stored history.";
      });
    }
    const filter = q.match(/\b(show|filter)\s+(all|water|motor|alert|system)\s+(?:history|records)?/);
    if (filter) {
      const btn=document.querySelector('.history-filter[data-filter="'+filter[2]+'"]');
      if(btn){btn.click();return "Showing " + filter[2] + " history records.";}
      navigateTo("history"); return "Open History & Reports and I can apply that filter there.";
    }
    if (/\b(search|find)\b.*\bhistory\b/.test(q)) {
      const m=text.match(/\b(?:for|about|containing)\s+(.+)$/i), field=document.getElementById("historySearch");
      if(field&&m){field.value=m[1];field.dispatchEvent(new Event("input",{bubbles:true}));return "Filtered history for “"+m[1]+"”.";}
      navigateTo("history"); return "Opening History & Reports. Tell me what to search for.";
    }
    if (/\b(turn|switch|start)\s+(the\s+)?pump\s+on\b|\bmotor on\b/.test(q)) {
      const button=document.getElementById("motorOnButton");
      if(!button) { navigateTo("dashboard"); return "Pump controls are on the Dashboard. Opening it; ask me again there."; }
      if(button.disabled) return "I can't send a pump-ON command right now. Check owner sign-in, device connection, fresh sensor reading and cutoff safety conditions on the Dashboard.";
      return confirmAction("Send a command to turn the pump ON? This affects physical hardware. Confirm only if the area and system are safe.", () => { window.motorOn(); return "Pump ON command submitted. Check the reported device status for confirmation."; });
    }
    if (/\b(turn|switch|stop)\s+(the\s+)?pump\s+off\b|\bmotor off\b/.test(q)) {
      const button=document.getElementById("motorOffButton");
      if(!button) { navigateTo("dashboard"); return "Pump controls are on the Dashboard. Opening it; ask me again there."; }
      if(button.disabled) return "I can't send a pump-OFF command: sign in with the owner account first.";
      return confirmAction("Send a command to turn the pump OFF?", () => { window.motorOff(); return "Pump OFF command submitted. Check the reported device status for confirmation."; });
    }
    if (/\b(explain|how|what|why|tell me)\b/.test(q)) return localAnswer(text);
    return null;
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    addMessage(text, "user");
    saveChatLog();
    const actionReply = runAction(text);
    if (typeof actionReply === "string") { addMessage(actionReply, "bot"); saveChatLog(); return; }
    if (actionReply === true || actionReply === false) return;
    busy = true;
    const typing = addTyping();
    try {
      if (!API_URL) {
        typing.textContent = localAnswer(text);
      } else {
        // Keep the latest visitor message separate from its conversation context.
        const conversation = [...messages.querySelectorAll(".cascade-chat-message:not(.typing)")].slice(-25, -1);
        const history = conversation.slice(-20)
          .map(node => (node.classList.contains("user") ? "Visitor: " : "Assistant: ") + node.textContent)
          .join("\n");
        const response = await fetch(API_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, page: pageName() })
        });
        if (!response.ok) throw new Error("Assistant service returned " + response.status);
        const data = await response.json();
        typing.textContent = data.reply || "I couldn't generate a reply. Please try again.";
      }
    } catch (error) {
      typing.textContent = "I couldn't reach the AI service. Please try again later.";
      console.error("Cascade assistant:", error);
    } finally {
      typing.classList.remove("typing");
      busy = false;
      saveChatLog();
      messages.scrollTop = messages.scrollHeight;
    }
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send(text);
  });
  messages.addEventListener("click", event => {
    const button = event.target.closest("[data-question]");
    if (button) send(button.dataset.question);
  });
})();
