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
        <div class="cascade-chat-brand"><img class="cascade-chat-avatar" src="assets/mascots/cascade-hero.svg" alt="" aria-hidden="true"><strong>Cascade Assistant</strong></div>
        <div class="cascade-chat-head-actions">
          <div class="cascade-language-picker">
            <button class="cascade-language-trigger" type="button" id="cascade-chat-language" aria-haspopup="listbox" aria-expanded="false" aria-label="Choose assistant language">
              <span class="cascade-language-globe" aria-hidden="true">文</span>
              <span class="cascade-language-current"><small>REPLY IN</small><strong>English</strong></span>
              <span class="cascade-language-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="cascade-language-menu" role="listbox" aria-label="Choose assistant language" hidden>
              <div class="cascade-language-menu-title">Choose your language</div>
              <button type="button" class="cascade-language-option" role="option" data-language="en"><span class="cascade-language-script">EN</span><span><strong>English</strong><small>English</small></span><span class="cascade-language-check">✓</span></button>
              <button type="button" class="cascade-language-option" role="option" data-language="hi"><span class="cascade-language-script">हि</span><span><strong>हिन्दी</strong><small>Hindi · Hinglish supported</small></span><span class="cascade-language-check">✓</span></button>
              <button type="button" class="cascade-language-option" role="option" data-language="bn"><span class="cascade-language-script">বা</span><span><strong>বাংলা</strong><small>Bengali · Banglish supported</small></span><span class="cascade-language-check">✓</span></button>
              <div class="cascade-language-menu-note">You can type in native script or Roman letters.</div>
            </div>
          </div>
          <button class="cascade-chat-close" type="button" aria-label="Close chat">×</button>
        </div>
      </header>
      <div class="cascade-chat-messages" role="log" aria-live="polite">
        <div class="cascade-chat-welcome">
          <h3>How can I help?</h3>
        </div>
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
      <div class="cascade-chat-foot">Hardware actions require confirmation.</div>
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
  const initialGreeting = messages.querySelector(".cascade-chat-message.bot");
  if (initialGreeting) initialGreeting.dataset.initialGreeting = "true";
  const languageTrigger = root.querySelector("#cascade-chat-language");
  const languageMenu = root.querySelector(".cascade-language-menu");
  const LANGUAGE_KEY = "cascade-assistant-language";
  const languageNames = { en: "English", hi: "हिन्दी", bn: "বাংলা" };
  let assistantLanguage = localStorage.getItem(LANGUAGE_KEY) || "en";
  if (!["en", "hi", "bn"].includes(assistantLanguage)) assistantLanguage = "en";
  function closeLanguageMenu() {
    languageMenu.hidden = true;
    languageTrigger.setAttribute("aria-expanded", "false");
  }
  function refreshLanguageMenu() {
    languageTrigger.querySelector(".cascade-language-current strong").textContent = languageNames[assistantLanguage];
    languageMenu.querySelectorAll(".cascade-language-option").forEach(option => {
      const active = option.dataset.language === assistantLanguage;
      option.classList.toggle("active", active);
      option.setAttribute("aria-selected", String(active));
    });
  }
  languageTrigger.addEventListener("click", () => {
    const opening = languageMenu.hidden;
    languageMenu.hidden = !opening;
    languageTrigger.setAttribute("aria-expanded", String(opening));
  });
  languageMenu.querySelectorAll(".cascade-language-option").forEach(option => {
    option.addEventListener("click", () => {
      const nextLanguage = option.dataset.language;
      if (nextLanguage === assistantLanguage) { closeLanguageMenu(); return; }
      assistantLanguage = nextLanguage;
      localStorage.setItem(LANGUAGE_KEY, assistantLanguage);
      refreshLanguageMenu();
      closeLanguageMenu();
      applyLanguage();
      addMessage(assistantLanguage === "hi" ? "अब मैं हिन्दी में जवाब दूँगा। आप हिन्दी या Romanized Hindi (Hinglish) में लिख सकते हैं।" : assistantLanguage === "bn" ? "এখন থেকে আমি বাংলায় উত্তর দেব। আপনি বাংলা বা Romanized Bangla (Banglish)-এ লিখতে পারেন।" : "I'll reply in English. You can write in English, हिन्दी or বাংলা.", "bot");

    });
  });
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest(".cascade-language-picker")) closeLanguageMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeLanguageMenu();
  });
  refreshLanguageMenu();
  let busy = false;

  const uiText = {
    en: { label:"Language", welcome:"How can I help you?", intro:"Ask me about your tank, water levels, alerts or pump controls. I can also help you adjust dashboard settings.", hello:"Hello! I'm your Cascade assistant. What would you like to know?", placeholder:"Ask about Cascade...", send:"Send message", foot:"AI responses may be inaccurate. Hardware actions require confirmation.", greeting:"Hi! How may I help you?" },
    hi: { label:"भाषा", welcome:"मैं आपकी क्या मदद कर सकता हूँ?", intro:"अपने टैंक, पानी के स्तर, अलर्ट या पंप नियंत्रण के बारे में पूछें। मैं डैशबोर्ड सेटिंग बदलने में भी मदद कर सकता हूँ।", hello:"नमस्ते! मैं Cascade सहायक हूँ। आप क्या जानना चाहेंगे?", placeholder:"Cascade के बारे में पूछें...", send:"संदेश भेजें", foot:"AI के जवाब गलत हो सकते हैं। हार्डवेयर संबंधी कार्रवाइयों के लिए पुष्टि आवश्यक है।", greeting:"नमस्ते! मैं आपकी क्या मदद कर सकता हूँ?" },
    bn: { label:"ভাষা", welcome:"আমি কীভাবে আপনাকে সাহায্য করতে পারি?", intro:"আপনার ট্যাঙ্ক, পানির স্তর, অ্যালার্ট বা পাম্প নিয়ন্ত্রণ সম্পর্কে জিজ্ঞাসা করুন। ড্যাশবোর্ড সেটিংস বদলাতেও সাহায্য করতে পারি।", hello:"নমস্কার! আমি Cascade সহকারী। কী জানতে চান?", placeholder:"Cascade সম্পর্কে জিজ্ঞাসা করুন...", send:"বার্তা পাঠান", foot:"AI-এর উত্তর ভুল হতে পারে। হার্ডওয়্যার সংক্রান্ত কাজের জন্য নিশ্চিতকরণ প্রয়োজন।", greeting:"নমস্কার! কীভাবে সাহায্য করতে পারি?" }
  };
  function applyLanguage() {
    const t = uiText[assistantLanguage];
    root.querySelector(".cascade-chat-welcome h3").textContent = t.welcome;
    root.querySelector(".cascade-chat-welcome p").textContent = t.intro;
    root.querySelector(".cascade-chat-form input").placeholder = t.placeholder;
    root.querySelector(".cascade-chat-form input").setAttribute("aria-label", t.placeholder);
    root.querySelector(".cascade-chat-form button").setAttribute("aria-label", t.send);
    root.querySelector(".cascade-chat-foot").textContent = t.foot;
    root.querySelector(".cascade-chat-greeting").textContent = t.greeting;
    root.querySelector(".cascade-chat-welcome-label").textContent = assistantLanguage === "en" ? "CASCADE · SMART WATER SYSTEM" : assistantLanguage === "hi" ? "CASCADE · स्मार्ट जल प्रणाली" : "CASCADE · স্মার্ট জল ব্যবস্থাপনা";
    const greeting = messages.querySelector(".cascade-chat-message.bot");
    if (greeting && greeting.dataset.initialGreeting === "true") greeting.textContent = t.hello;
    const suggestionLabels = assistantLanguage === "hi"
      ? ["सिस्टम कैसे काम करता है?","डैशबोर्ड की सुविधाएँ","कम पानी का अलर्ट बदलें","अधिकतम स्तर बदलें"]
      : assistantLanguage === "bn"
        ? ["সিস্টেম কীভাবে কাজ করে?","ড্যাশবোর্ডের ফিচার","কম পানির অ্যালার্ট বদলান","সর্বোচ্চ স্তর বদলান"]
        : ["How does the system work?","Explore dashboard features","Change low-water alert","Adjust maximum level"];
    root.querySelectorAll(".cascade-chat-suggestions button").forEach((button,index) => { button.textContent = suggestionLabels[index] || button.textContent; });
  }
  applyLanguage();

  function setOpen(open) {
    panel.classList.toggle("open", open);
    root.classList.toggle("chat-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close Cascade AI assistant" : "Open Cascade AI assistant");
    // Do not autofocus: mobile browsers would open the on-screen keyboard as soon as chat opens.
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
    if (assistantLanguage === "hi") {
      if (/^(hi|hello|hey|नमस्ते|नमस्कार)/i.test(text)) return "नमस्ते! मैं Cascade की सुविधाओं और डैशबोर्ड का उपयोग समझाने में मदद कर सकता हूँ।";
      if (/how.*work|working|process|flow|कैसे काम|कैसे चलता/.test(q)) return "Cascade में अल्ट्रासोनिक सेंसर पानी का स्तर मापता है। ESP32 रीडिंग को प्रोसेस करके डैशबोर्ड पर भेजता है और कॉन्फ़िगर होने पर रिले के ज़रिए पंप नियंत्रित कर सकता है।";
      if (/feature|dashboard|tank|pump|alarm|history|report|सुविधा|डैशबोर्ड|टैंक|पंप|अलर्ट|इतिहास/.test(q)) return "डैशबोर्ड टैंक का स्तर, सेंसर रीडिंग, पंप की स्थिति और अलर्ट सेटिंग दिखाता है। Alarm Centre में रिमाइंडर और History & Reports में गतिविधियों का रिकॉर्ड मिलता है।";
      return "मैं Cascade, सेंसर, डैशबोर्ड, पंप नियंत्रण और अलर्ट के बारे में मदद कर सकता हूँ।";
    }
    if (assistantLanguage === "bn") {
      if (/^(hi|hello|hey|নমস্কার|হ্যালো)/i.test(text)) return "নমস্কার! Cascade-এর ফিচার এবং ড্যাশবোর্ড ব্যবহার করতে আমি সাহায্য করতে পারি।";
      if (/how.*work|working|process|flow|কীভাবে কাজ|কিভাবে চলে/.test(q)) return "Cascade-এ আল্ট্রাসোনিক সেন্সর পানির স্তর মাপে। ESP32 রিডিং প্রসেস করে ড্যাশবোর্ডে পাঠায় এবং কনফিগার করা থাকলে রিলের মাধ্যমে পাম্প নিয়ন্ত্রণ করতে পারে।";
      if (/feature|dashboard|tank|pump|alarm|history|report|ফিচার|ড্যাশবোর্ড|ট্যাঙ্ক|পাম্প|অ্যালার্ট|ইতিহাস/.test(q)) return "ড্যাশবোর্ডে ট্যাঙ্কের স্তর, সেন্সর রিডিং, পাম্পের অবস্থা এবং অ্যালার্ট সেটিং দেখা যায়। Alarm Centre-এ রিমাইন্ডার এবং History & Reports-এ কার্যকলাপের রেকর্ড থাকে।";
      return "আমি Cascade, সেন্সর, ড্যাশবোর্ড, পাম্প নিয়ন্ত্রণ এবং অ্যালার্ট সম্পর্কে সাহায্য করতে পারি।";
    }
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
  // Conversation content and pending follow-up context exist only in memory.
  // A page refresh starts a fresh assistant conversation.
  const CHAT_LOG_KEY = "cascade-assistant-chat-v1";
  const CHAT_PENDING_KEY = "cascade-assistant-pending-v1";
  try { localStorage.removeItem(CHAT_LOG_KEY); localStorage.removeItem(CHAT_PENDING_KEY); } catch (_) {}
  let pendingIntent = null;
  function setPending(intent) { pendingIntent = intent; }

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

    }, { once: true });
    no.addEventListener("click", () => {
      actions.remove(); setPending(null); addMessage("Cancelled. No changes made.", "bot")
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
  function normalizeActionText(text) {
    return String(text)
      .replace(/कम पानी का अलर्ट|लो वाटर अलर्ट|पानी कम होने का अलर्ट|জলের স্তর কমার অ্যালার্ট|কম পানির অ্যালার্ট|লো ওয়াটার অ্যালার্ট/gi, "low water alert")
      .replace(/अधिकतम स्तर|मैक्सिमम लेवल|कट.?ऑफ स्तर|পানির সর্বোচ্চ স্তর|সর্বোচ্চ লেভেল|কাট.?অফ লেভেল/gi, "maximum cutoff")
      .replace(/सेट करो|सेट करें|बदल दो|बदलें|रखो|कर दो|করো|সেট করো|সেট করুন|বদলে দাও|বদলাও/gi, "set")
      .replace(/कितने प्रतिशत|कितना प्रतिशत|प्रतिशत|শতাংশ|কত পার্সেন্ট/gi, "percent")
      .replace(/रद्द करो|रद्द करें|না|বাতিল করো|বাতিল করুন/gi, "cancel")
      .replace(/खोलो|खोलें|दिखाओ|দেখাও|খুলুন/gi, "open")
      .replace(/कम पानी का अलर्ट|low pani alert|paani kam hone ka alert|kam paani ka alert/gi, "low water alert")
      .replace(/low water ka alert|low water alert ko|pani kam ka alert/gi, "low water alert")
      .replace(/maximum level|maximum pani level|max level|upar wala cutoff|motor band level|paani bharne ka level/gi, "maximum cutoff")
      .replace(/motor\s+(?:ko\s+)?band\s+(?:kar\s+dena|kar\s+do|karna|karo)(?:\s+par)?/gi, "set maximum cutoff")
      .replace(/paani\s+(?:ke\s+)?(?:upar|zyada|bharne|bhadne)(?:\s+par|\s+pe)?/gi, "maximum cutoff")
      .replace(/partishat|pratishat|percentage/gi, "percent")
      .replace(/kam kar do|kam karo|badha do|bada do|ghata do|set kar do|set karo|rakh do|rakhna|karna hai|kar do/gi, "set")
      .replace(/kitna percent|kitne percent|kitna pratishat|kitna percentage/gi, "percent")
      .replace(/jal ka star|pani ka level|paani ka level|tank ka level/gi, "water level")
      .replace(/kom jol|jol kom|pani kom|panir level kom|joler level kom|kom panir alert|kom jol er alert/gi, "low water alert")
      .replace(/beshi jol|jol beshi|tank bhore gele|motor bondho korar level/gi, "maximum cutoff")
      .replace(/koto percent|koto shotangsho|koto percentage/gi, "percent")
      .replace(/set kore dao|set koro|kore dao|bodle dao|barie dao|komie dao|rakho|koro/gi, "set")
      .replace(/[০-৯]/g, ch => "০১২৩৪৫৬৭৮৯".indexOf(ch))
      .replace(/[०-९]/g, ch => "०१२३४५६७८९".indexOf(ch));
  }

  function runAction(text) {
    const q = normalizeActionText(text).toLowerCase().trim();

    if (pendingIntent?.type === "threshold-pair") {
      const values = q.match(/\d{1,3}/g) || [];
      if (values.length >= 2) {
        const low = Number(values[0]), high = Number(values[1]);
        setPending(null);
        if (low < 5 || low > 40 || high < 50 || high > 100 || low >= high) return "Please give a low-water alert from 5–40% first, then a higher cutoff from 50–100%.";
        return confirmAction("Set the low-water alert to " + low + "% and maximum cutoff to " + high + "%? These are browser preferences only; they do not program the ESP32.", () => applySettings({ lowWaterLevel:low, cutoffLevel:high }));
      }
      if (/\b(cancel|never mind|nevermind)\b/.test(q)) { setPending(null); return "Cancelled. No settings changed."; }
      return "Please send both values, for example: 15% and 88%.";
    }
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

    if (/^(hi|hello|hey|namaste|नमस्ते|नमस्कार|নমস্কার|হ্যালো)[.!?,\s]*$/i.test(q)) return assistantLanguage === "hi" ? "नमस्ते! मैं डैशबोर्ड सेटिंग, अलर्ट, हिस्ट्री और पंप नियंत्रण में मदद कर सकता हूँ।" : assistantLanguage === "bn" ? "নমস্কার! ড্যাশবোর্ড সেটিংস, অ্যালার্ট, ইতিহাস এবং পাম্প নিয়ন্ত্রণে সাহায্য করতে পারি।" : "Hello! I can manage dashboard preferences, navigate pages, create alarms, filter or export history, change themes and help with pump controls.";
    // Threshold requests are handled locally, so they are fast and don't depend on Gemini wording.
    const lowTerm = /low.?water|\blow\b|low level|low alert|early warning|minimum level|water (?:falls|drops|goes) (?:below|under)|water.{0,15}low|tank.{0,15}low|below (?:the )?\d|paani (?:kam|neeche)|paani.{0,20}kam|pani (?:kam|neeche)|pani.{0,20}kam|jol (?:kom|niche)|panir (?:kom|niche)|कम पानी|पानी कम|नीचे जाए|कम हो|জল কম|পানি কম|নিচে নাম/.test(q);
    const highTerm = /cut.?off|maximum|max level|\bhigh\b|high.?water|upper level|full.?tank|tank.{0,20}(?:full|bhar|bhare|fills|filled)|motor.{0,24}(?:off|stop|band)|(?:off|stop|band).{0,24}motor|tank bhar|paani bhar|pani bhar|jol bhore|panir tank bhore|टंकी भर|पानी भर|मोटर बंद|ভরে গেলে|মোটর বন্ধ/.test(q);
    const hasThresholdValue = /\b\d{1,3}\s*%?/.test(q);
    const lowValueMatch = q.match(/(?:low.?water|\blow\b|low level|low alert|early warning|minimum level|paani.{0,20}kam|pani.{0,20}kam|jol kom|panir kom|कम पानी|पानी कम|জল কম|পানি কম)[^\d]{0,28}(\d{1,3})\s*%?/) || q.match(/(\d{1,3})\s*%?[^\d]{0,20}(?:low.?water|\blow\b|low level|low alert|early warning|कम पानी|পানি কম|জল কম)/);
    const highValueMatch = q.match(/(?:cut.?off|maximum|max level|\bhigh\b|high.?water|upper level|full.?tank|tank.{0,20}(?:full|bhar|bhare)|paani bhar|pani bhar|jol bhore|ট্যাংক ভরে|टंकी भर|पानी भर|মোটর বন্ধ)[^\d]{0,32}(\d{1,3})\s*%?/) || q.match(/(\d{1,3})\s*%?[^\d]{0,24}(?:cut.?off|maximum|max level|\bhigh\b|high.?water|upper level|full.?tank|motor|टंकी|পানি|জল)/);
    const broadThresholdIntent = /\b(set|change|adjust|make|update|keep|put|want|should|when|reaches|drops|falls|below|above|at)\b|रखो|रखना|कर दो|सेट|जब|हो जाए|पर|করো|রাখো|যখন|হলে/.test(q);
    if ((lowTerm || highTerm) && (hasThresholdValue || broadThresholdIntent)) {
      const lowValue = lowValueMatch ? Number(lowValueMatch[1]) : null;
      const highValue = highValueMatch ? Number(highValueMatch[1]) : null;
      const generalValue = (q.match(/\b(\d{1,3})\s*%?/) || [])[1];
      const changes = {};
      if (lowTerm && lowValue !== null) changes.lowWaterLevel = lowValue;
      if (highTerm && highValue !== null) changes.cutoffLevel = highValue;
      if (!Object.keys(changes).length && lowTerm && !highTerm && generalValue) changes.lowWaterLevel = Number(generalValue);
      if (!Object.keys(changes).length && highTerm && !lowTerm && generalValue) changes.cutoffLevel = Number(generalValue);
      if (changes.lowWaterLevel !== undefined || changes.cutoffLevel !== undefined) {
        setPending(null);
        const low = changes.lowWaterLevel, high = changes.cutoffLevel;
        if (low !== undefined && (low < 5 || low > 40)) return "The low-water alert must be between 5% and 40%.";
        if (high !== undefined && (high < 50 || high > 100)) return "The maximum cutoff must be between 50% and 100%.";
        const current = readSettings();
        const next = { lowWaterLevel: low ?? current.lowWaterLevel, cutoffLevel: high ?? current.cutoffLevel };
        if (next.lowWaterLevel >= next.cutoffLevel) return "The low-water alert must remain below the maximum cutoff. Please choose compatible percentages.";
        const summary = (low !== undefined ? "low-water alert to " + low + "%" : "") + (low !== undefined && high !== undefined ? " and " : "") + (high !== undefined ? "maximum cutoff to " + high + "%" : "");
        return confirmAction("Set the " + summary + "? This saves browser preferences only; it does not program the ESP32.", () => applySettings(changes));
      }
      if (lowTerm && highTerm) {
        setPending({ type:"threshold-pair" });
        return "What two percentages should I use? Give the low-water alert first and the maximum cutoff second (for example, 15% and 88%).";
      }
      const kind = lowTerm ? "low" : "cutoff";
      setPending({ type:"threshold", kind });
      return "What percentage should I set the " + (kind === "low" ? "low-water alert" : "maximum cutoff") + " to?";
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
    // Let unmatched natural-language questions reach Gemini instead of the limited local FAQ.
    return null;
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    addMessage(text, "user");

    const actionReply = runAction(text);
    if (typeof actionReply === "string") { addMessage(actionReply, "bot"); return; }
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
          body: JSON.stringify({ message: text, history, page: pageName(), language: assistantLanguage, languageName: languageNames[assistantLanguage], liveStatus: typeof window.getCascadeAssistantContext === "function" ? window.getCascadeAssistantContext() : null })
        });
        if (!response.ok) throw new Error("Assistant service returned " + response.status);
        const data = await response.json();
        typing.textContent = data.reply || (assistantLanguage === "hi" ? "माफ़ कीजिए, जवाब नहीं बन पाया। फिर कोशिश करें।" : assistantLanguage === "bn" ? "দুঃখিত, উত্তর তৈরি করা যায়নি। আবার চেষ্টা করুন।" : "I couldn't generate a reply. Please try again.");
      }
    } catch (error) {
      typing.textContent = assistantLanguage === "hi" ? "AI सेवा से संपर्क नहीं हो पाया। कृपया बाद में कोशिश करें।" : assistantLanguage === "bn" ? "AI পরিষেবার সঙ্গে যোগাযোগ করা যায়নি। পরে আবার চেষ্টা করুন।" : "I couldn't reach the AI service. Please try again later.";
      console.error("Cascade assistant:", error);
    } finally {
      typing.classList.remove("typing");
      busy = false;

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
