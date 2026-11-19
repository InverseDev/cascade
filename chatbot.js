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
          <button type="button" data-question="Summarise my water usage over the last 9 days.">9-day water usage</button>
          <button type="button" data-question="Turn the motor off.">Turn motor off</button>
          <button type="button" data-question="Create a daily tank inspection alarm at 8:00 PM.">Create an alarm</button>
          <button type="button" data-question="Analyse my recent water usage and identify unusual patterns.">Analyse my water data</button>
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
  const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
  const mascotPage = location.pathname.toLowerCase();
  mascotImage.src = mascotPage.includes("history") ? "assets/mascots/cascade-analytics.svg" : mascotPage.includes("alarms") ? "assets/mascots/cascade-summary.svg" : "assets/mascots/cascade-hero.svg";
  const headerMascot = root.querySelector(".cascade-chat-avatar");
  if (headerMascot) headerMascot.src = mascotImage.src;
  const panel = root.querySelector(".cascade-chat-panel");
  const close = root.querySelector(".cascade-chat-close");
  const form = root.querySelector("form");
  const input = form.elements.message;
  const messages = root.querySelector(".cascade-chat-messages");
  let attachedReportText = "";
  let attachedReportName = "";
  const reportPicker = document.createElement("input");
  reportPicker.type = "file";
  reportPicker.accept = ".pdf,.csv,.txt,.json";
  reportPicker.hidden = true;
  reportPicker.setAttribute("aria-label", "Attach a report");
  const attachButton = document.createElement("button");
  attachButton.type = "button";
  attachButton.className = "cascade-chat-attach";
  attachButton.textContent = "＋";
  attachButton.title = "Attach PDF, CSV, TXT or JSON report";
  attachButton.setAttribute("aria-label", "Attach a report");
  form.insertBefore(attachButton, form.lastElementChild);
  form.appendChild(reportPicker);
  attachButton.addEventListener("click", () => reportPicker.click());
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        if (!window.pdfjsLib) return reject(new Error("PDF reader did not initialise."));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Could not load the PDF reader. Try a CSV or TXT report."));
      document.head.appendChild(script);
    });
  }
  async function extractReportText(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > 8 * 1024 * 1024) throw new Error("Please attach a report smaller than 8 MB.");
    if (["txt","csv","json"].includes(ext)) return (await file.text()).slice(0, 24000);
    if (ext === "pdf") {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 30); pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(" "));
      }
      return pages.join("\n").slice(0, 24000);
    }
    throw new Error("Supported report formats: PDF, CSV, TXT and JSON.");
  }
  reportPicker.addEventListener("change", async () => {
    const file = reportPicker.files?.[0];
    if (!file) return;
    attachButton.disabled = true;
    attachButton.textContent = "…";
    try {
      attachedReportText = await extractReportText(file);
      attachedReportName = file.name;
      addMessage("Report attached: " + file.name + ". Ask me to analyse it, summarise it, find trends or explain specific figures.", "bot");
      input.value = "Analyse the attached report and explain its key findings, trends, anomalies and recommendations.";
      input.focus();
    } catch (error) {
      addMessage(error.message || "I couldn't read that report.", "bot");
    } finally {
      attachButton.disabled = false;
      attachButton.textContent = "＋";
      reportPicker.value = "";
    }
  });
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
  // Alarm API fallback for pages that do not load alarms.js (Dashboard and History).
  // Uses the same local storage schema and native notification plugin.
  if (!window.CascadeAlarms) {
    const alarmKey = "cascade_scheduled_alarms";
    const readAlarms = () => { try { const value = JSON.parse(localStorage.getItem(alarmKey) || "[]"); return Array.isArray(value) ? value : []; } catch (_) { return []; } };
    const writeAlarms = value => localStorage.setItem(alarmKey, JSON.stringify(value));
    const nativeNotifications = () => window.Capacitor?.isNativePlatform?.()
      ? (window.Capacitor.registerPlugin?.("LocalNotifications") || window.Capacitor.Plugins?.LocalNotifications)
      : null;
    const notificationId = id => { let hash=0; for (const ch of String(id)) hash=(hash*31+ch.charCodeAt(0))|0; return 200000+(Math.abs(hash)%1000000000); };
    const cancelNative = async id => { const plugin=nativeNotifications(); if(plugin) try { await plugin.cancel({notifications:[{id:notificationId(id)}]}); } catch (_) {} };
    const syncNative = async alarm => {
      const plugin=nativeNotifications(); if(!plugin || !alarm.enabled) return;
      try {
        const permission=await plugin.checkPermissions();
        if(permission.display!=="granted") return;
        if(plugin.createChannel) await plugin.createChannel({id:"cascade-alerts",name:"Cascade alerts",description:"Water level and pump alerts",importance:4});
        await cancelNative(alarm.id);
        const [hour,minute]=alarm.time.split(":").map(Number);
        let schedule;
        if(alarm.repeat) schedule={on:{hour,minute},allowWhileIdle:true};
        else { const at=new Date(String(alarm.date)+"T"+alarm.time+":00"); if(at<=new Date()) return; schedule={at,allowWhileIdle:true}; }
        await plugin.schedule({notifications:[{id:notificationId(alarm.id),title:alarm.name||"Cascade reminder",body:"Your scheduled Cascade reminder.",schedule,channelId:"cascade-alerts"}]});
      } catch(error) { console.warn("Cascade AI alarm notification sync failed:",error); }
    };
    window.CascadeAlarms = {
      list: () => readAlarms().map(item=>({...item})),
      create({name,time,date=null,repeat=false}) {
        const clean=String(name||"").trim().slice(0,80);
        if(!clean || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(time||""))) throw new Error("A name and valid time are required.");
        const selected=repeat?null:String(date||new Date().toLocaleDateString("en-CA"));
        if(!repeat) { const at=new Date(selected+"T"+time+":00"); if(Number.isNaN(at.getTime())||at<=new Date()) throw new Error("Please choose a future date and time."); }
        const alarm={id:Date.now().toString()+Math.random().toString(36).slice(2,6),name:clean,time,date:selected,repeat:!!repeat,enabled:true,createdAt:new Date().toISOString()};
        const all=readAlarms(); all.push(alarm); writeAlarms(all); syncNative(alarm); return {...alarm};
      },
      remove(id) { const all=readAlarms(), found=all.find(item=>String(item.id)===String(id)); if(!found)return false; writeAlarms(all.filter(item=>String(item.id)!==String(id))); cancelNative(id); return true; },
      update(id,changes={}) {
        const all=readAlarms(), index=all.findIndex(item=>String(item.id)===String(id)); if(index<0)throw new Error("I couldn't find that alarm.");
        const next={...all[index],...changes};
        if(!next.repeat) { const at=new Date(String(next.date)+"T"+next.time+":00"); if(Number.isNaN(at.getTime())||at<=new Date())throw new Error("The updated alarm must be in the future."); }
        all[index]=next; writeAlarms(all); cancelNative(id); syncNative(next); return {...next};
      }
    };
  }
  let busy = false;

  const uiText = {
    en: { label:"Language", welcome:"How can I help you?", intro:"Ask me about your tank, water levels, alerts or pump controls. I can also help you adjust dashboard settings.", hello:"Hello! I'm your Cascade assistant. What would you like to know?", placeholder:"Ask about Cascade...", send:"Send message", foot:"AI responses may be inaccurate. Hardware actions require confirmation.", greeting:"Hi! How may I help you?" },
    hi: { label:"भाषा", welcome:"मैं आपकी क्या मदद कर सकता हूँ?", intro:"अपने टैंक, पानी के स्तर, अलर्ट या पंप नियंत्रण के बारे में पूछें। मैं डैशबोर्ड सेटिंग बदलने में भी मदद कर सकता हूँ।", hello:"नमस्ते! मैं Cascade सहायक हूँ। आप क्या जानना चाहेंगे?", placeholder:"Cascade के बारे में पूछें...", send:"संदेश भेजें", foot:"AI के जवाब गलत हो सकते हैं। हार्डवेयर संबंधी कार्रवाइयों के लिए पुष्टि आवश्यक है।", greeting:"नमस्ते! मैं आपकी क्या मदद कर सकता हूँ?" },
    bn: { label:"ভাষা", welcome:"আমি কীভাবে আপনাকে সাহায্য করতে পারি?", intro:"আপনার ট্যাঙ্ক, পানির স্তর, অ্যালার্ট বা পাম্প নিয়ন্ত্রণ সম্পর্কে জিজ্ঞাসা করুন। ড্যাশবোর্ড সেটিংস বদলাতেও সাহায্য করতে পারি।", hello:"নমস্কার! আমি Cascade সহকারী। কী জানতে চান?", placeholder:"Cascade সম্পর্কে জিজ্ঞাসা করুন...", send:"বার্তা পাঠান", foot:"AI-এর উত্তর ভুল হতে পারে। হার্ডওয়্যার সংক্রান্ত কাজের জন্য নিশ্চিতকরণ প্রয়োজন।", greeting:"নমস্কার! কীভাবে সাহায্য করতে পারি?" }
  };
  function applyLanguage() {
    const t = uiText[assistantLanguage];
    const welcomeHeading = root.querySelector(".cascade-chat-welcome h3");
    if (welcomeHeading) welcomeHeading.textContent = t.welcome;
    const messageInput = root.querySelector(".cascade-chat-form input");
    if (messageInput) {
      messageInput.placeholder = t.placeholder;
      messageInput.setAttribute("aria-label", t.placeholder);
    }
    const sendButton = root.querySelector(".cascade-chat-form button");
    if (sendButton) sendButton.setAttribute("aria-label", t.send);
    const footnote = root.querySelector(".cascade-chat-foot");
    if (footnote) footnote.textContent = assistantLanguage === "en"
      ? "Hardware actions require confirmation."
      : assistantLanguage === "hi"
        ? "हार्डवेयर कार्रवाइयों के लिए पुष्टि आवश्यक है।"
        : "হার্ডওয়্যার কাজের জন্য নিশ্চিতকরণ প্রয়োজন।";
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
    if (launcher) {
      launcher.setAttribute("aria-expanded", String(open));
      launcher.setAttribute("aria-label", open ? "Close Cascade AI assistant" : "Open Cascade AI assistant");
    }
    // Do not autofocus: mobile browsers would open the on-screen keyboard as soon as chat opens.
  }
  if (nativeApp) launcher.remove();
  else launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  window.setCascadeAssistantOpen = setOpen;
  window.toggleCascadeAssistant = () => setOpen(!panel.classList.contains("open"));
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
    if (!el.classList.contains("typing")) persistConversation();
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
  // Keep a short assistant session across same-origin page navigation.
  const CHAT_LOG_KEY = "cascade-assistant-chat-v2";
  const CHAT_PENDING_KEY = "cascade-assistant-pending-v2";
  let pendingIntent = null;
  try { pendingIntent = JSON.parse(sessionStorage.getItem(CHAT_PENDING_KEY) || "null"); } catch (_) {}
  function persistConversation() {
    try {
      const saved = [...messages.querySelectorAll(".cascade-chat-message:not(.typing)")].slice(-24)
        .filter(node => !node.querySelector(".cascade-chat-confirm"))
        .map(node => ({ who:node.classList.contains("user") ? "user" : "bot", text:node.textContent }));
      sessionStorage.setItem(CHAT_LOG_KEY, JSON.stringify(saved));
    } catch (_) {}
  }
  function setPending(intent) {
    pendingIntent = intent;
    try { if (intent) sessionStorage.setItem(CHAT_PENDING_KEY, JSON.stringify(intent)); else sessionStorage.removeItem(CHAT_PENDING_KEY); } catch (_) {}
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHAT_LOG_KEY) || "[]");
    if (Array.isArray(saved) && saved.length) {
      messages.querySelector(".cascade-chat-welcome")?.remove();
      messages.querySelector(".cascade-chat-suggestions")?.remove();
      saved.forEach(item => {
        const node = document.createElement("div");
        node.className = "cascade-chat-message " + (item.who === "user" ? "user" : "bot");
        node.textContent = String(item.text || "");
        messages.appendChild(node);
      });
      messages.scrollTop = messages.scrollHeight;
    }
  } catch (_) {}

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
    yes.addEventListener("click", async () => {
      yes.disabled = true;
      no.disabled = true;
      yes.textContent = "Working…";
      try {
        const result = await action();
        addMessage(typeof result === "string" ? result : success, "bot");
      } catch (error) {
        addMessage(error?.message || "The action could not be completed.", "bot");
      } finally {
        actions.remove();
      }
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
      .replace(/मोटर चालू करो|मोटर चालू कर दो|पंप चालू करो|पंप चालू कर दो|मोटर शुरू करो|पंप शुरू करो/gi, "motor on")
      .replace(/मोटर बंद करो|मोटर बंद कर दो|पंप बंद करो|पंप बंद कर दो|मोटर रोक दो|पंप रोक दो/gi, "motor off")
      .replace(/মোটর চালু করো|মোটর চালু করুন|পাম্প চালু করো|পাম্প চালু করুন/gi, "motor on")
      .replace(/মোটর বন্ধ করো|মোটর বন্ধ করুন|পাম্প বন্ধ করো|পাম্প বন্ধ করুন|মোটর বন্ধ করো|পাম্প বন্ধ করো/gi, "motor off")
      .replace(/motor\s+(?:ko\s+)?band\s+(?:kar dena|kar do|karna|karo)|pump\s+(?:ko\s+)?band\s+(?:kar do|karo)/gi, "motor off")
      .replace(/अलार्म लगाओ|अलार्म लगा दो|अलार्म बनाओ|रिमाइंडर लगाओ|রিমাইন্ডার দাও|অ্যালার্ম দাও|অ্যালার্ম সেট করো/gi, "create alarm")
      .replace(/अलार्म दिखाओ|मेरे अलार्म दिखाओ|অ্যালার্ম দেখাও|রিমাইন্ডার দেখাও/gi, "list alarms")
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

  // Accept common 12-hour/24-hour time formats and Indian day/month/year dates.
  function parseAlarmTime(value) {
    const input = String(value || "").trim().toLowerCase().replace(/\./g, ":").replace(/\s+/g, " ");
    let m = input.match(/\b(\d{1,2})(?::(\d{1,2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (m) {
      let hour = Number(m[1]);
      const minute = Number(m[2] || 0);
      const meridiem = m[3].replace(/\./g, "").toLowerCase();
      if (hour < 1 || hour > 12 || minute > 59) return null;
      if (meridiem === "pm" && hour !== 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
    }
    m = input.match(/\b(\d{1,2}):(\d{2})\b/);
    if (m) {
      const hour = Number(m[1]), minute = Number(m[2]);
      if (hour > 23 || minute > 59) return null;
      return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
    }
    m = input.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (m) return parseAlarmTime(m[1] + " " + m[2]);
    return null;
  }

  function parseAlarmDate(value) {
    const input = String(value || "").trim().toLowerCase();
    const now = new Date();
    if (/\btoday\b/.test(input)) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    }
    if (/\btomorrow\b/.test(input)) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    }
    let y, month, day, m;
    if ((m = input.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/))) {
      y=Number(m[1]); month=Number(m[2]); day=Number(m[3]);
    } else if ((m = input.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/))) {
      day=Number(m[1]); month=Number(m[2]); y=Number(m[3]);
    } else {
      const months = {jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
      m = input.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
      if (m && Object.prototype.hasOwnProperty.call(months,m[2])) { day=Number(m[1]); month=months[m[2]]+1; y=Number(m[3]); }
      else {
        m = input.match(/\b([a-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/i);
        if (!m || !Object.prototype.hasOwnProperty.call(months,m[1])) return null;
        month=months[m[1]]+1; day=Number(m[2]); y=Number(m[3]);
      }
    }
    const d = new Date(y, month-1, day);
    if (y < now.getFullYear() || d.getFullYear()!==y || d.getMonth()!==month-1 || d.getDate()!==day) return null;
    return y + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0");
  }

  function requestedHistoryDays(text) {
    const q = String(text).toLowerCase();
    const numeric = q.match(/(?:last|past|over|during|in the)[ ]+(\d{1,2})[ ]+days?/);
    if (numeric) return Math.max(1, Math.min(30, Number(numeric[1])));
    const words = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
    const word = q.match(/(?:last|past|over|during|in the)[ ]+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[ ]+days?/);
    return word ? words[word[1]] : 9;
  }
  async function fetchHistoricalContext(text) {
    const q = String(text).toLowerCase();
    const wantsHistory = /history|historical|last\s+\d+\s+days|past\s+\d+\s+days|water usage|water consumed|consumption|trend|refill|motor run|how much water|কত জল|পানি খরচ|इतना पानी|खपत/.test(q);
    if (!wantsHistory) return "";
    const days = requestedHistoryDays(text);
    const config = window.CASCADE_CONFIG || {};
    const base = String(config.SUPABASE_URL || "").replace(/\/$/, "");
    const key = String(config.SUPABASE_ANON_KEY || "");
    if (!base || !key) return "Historical sensor data could not be queried because Supabase browser configuration is missing.";
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const params = new URLSearchParams({
      select:"device_id,distance_cm,water_level_percent,motor_status,sensor_status,created_at",
      device_id:"eq." + String(config.DEVICE_ID || "cascade-esp32-01"),
      created_at:"gte." + from,
      order:"created_at.asc",
      limit:"5000"
    });
    const headers = { apikey:key, Accept:"application/json" };
    if (!key.startsWith("sb_publishable_")) headers.Authorization = "Bearer " + key;
    try {
      const response = await fetch(base + "/rest/v1/" + encodeURIComponent(config.SENSOR_TABLE || "sensor_readings") + "?" + params, { headers, cache:"no-store" });
      if (!response.ok) return "Historical sensor query failed with HTTP " + response.status + ". Do not invent historical values.";
      const rows = await response.json();
      const valid = (Array.isArray(rows) ? rows : []).filter(row => Number.isFinite(Number(row.water_level_percent)) && row.water_level_percent !== null)
        .map(row => ({ at:row.created_at, level:Number(row.water_level_percent), motor:String(row.motor_status || "unknown").toLowerCase(), distance:row.distance_cm === null ? null : Number(row.distance_cm) }))
        .filter(row => row.level >= 0 && row.level <= 100 && Number.isFinite(Date.parse(row.at)));
      const local = (() => { try { return JSON.parse(localStorage.getItem("fluidops_full_history") || "[]"); } catch (_) { return []; } })()
        .filter(item => Date.parse(item.timestamp) >= Date.now() - days * 86400000)
        .slice(0, 80);
      if (!valid.length) return JSON.stringify({ periodDays:days, sensorRows:0, message:"No valid sensor readings were recorded in this period. The device may have been offline or its sensor was faulty. Local activity events are included separately.", localActivity:local });
      const dailyBuckets = new Map();
      valid.forEach(row => {
        const day = new Date(row.at).toLocaleDateString("en-CA");
        const bucket = dailyBuckets.get(day) || { sum:0, count:0, min:100, max:0, first:row.level, last:row.level, samples:0 };
        bucket.sum += row.level; bucket.count++; bucket.min = Math.min(bucket.min,row.level);
        bucket.max = Math.max(bucket.max,row.level); bucket.last = row.level; bucket.samples++;
        dailyBuckets.set(day,bucket);
      });
      const dailySummary = [...dailyBuckets.entries()].map(([date,b]) => ({
        date, averageLevelPercent:Number((b.sum/b.count).toFixed(2)),
        minimumLevelPercent:Number(b.min.toFixed(2)), maximumLevelPercent:Number(b.max.toFixed(2)),
        firstLevelPercent:Number(b.first.toFixed(2)), lastLevelPercent:Number(b.last.toFixed(2)),
        sampleCount:b.samples
      }));
      const intervalBuckets = new Map();
      valid.forEach(row => {
        const slot = Math.floor(Date.parse(row.at) / 900000);
        const bucket = intervalBuckets.get(slot) || {sum:0,count:0};
        bucket.sum += row.level; bucket.count++;
        intervalBuckets.set(slot,bucket);
      });
      const smoothed = [...intervalBuckets.entries()].sort((a,b)=>a[0]-b[0])
        .map(([slot,b])=>({at:new Date(slot*900000).toISOString(),level:b.sum/b.count}));
      let cumulativeDrop = 0, refillRises = 0, motorOnSamples = 0;
      for (let i=0;i<valid.length;i++) if (valid[i].motor === "on") motorOnSamples++;
      for (let i=1;i<smoothed.length;i++) {
        const delta = smoothed[i].level - smoothed[i-1].level;
        if (delta < -0.5) cumulativeDrop += -delta;
        if (delta > 5) refillRises++;
      }
      const capacity = Number(config.TANK_CAPACITY_LITRES);
      const summary = {
        periodDays:days, sensorRows:valid.length,
        firstReading:{ at:valid[0].at, levelPercent:valid[0].level },
        latestReading:{ at:valid[valid.length-1].at, levelPercent:valid[valid.length-1].level },
        netLevelChangePercentagePoints:Number((valid[valid.length-1].level-valid[0].level).toFixed(2)),
        cumulativeObservedLevelDropsPercentagePoints:Number(cumulativeDrop.toFixed(2)),
        estimatedConsumptionLitres:Number.isFinite(capacity) && capacity > 0 ? Number((cumulativeDrop/100*capacity).toFixed(2)) : null,
        tankCapacityLitres:Number.isFinite(capacity) && capacity > 0 ? capacity : null,
        refillRiseEvents:refillRises, motorOnSamples,
        sampleWindowStart:valid[0].at, sampleWindowEnd:valid[valid.length-1].at,
        dailySummary,
        sampleReadings:valid.filter((row,index)=>index===0 || index===valid.length-1 || index % Math.max(1,Math.floor(valid.length/35))===0).slice(0,40),
        localActivity:local,
        interpretation:"Cumulative observed level drops are an estimate, not a precise water-consumption measurement. Refills, gaps between readings and sensor noise can affect it. Litres are provided only when TANK_CAPACITY_LITRES is configured."
      };
      return JSON.stringify(summary);
    } catch (error) {
      return "Could not retrieve historical readings: " + (error.message || "network error") + ". Do not invent historical values.";
    }
  }
  function listAlarmSummary() {
    const alarms = window.CascadeAlarms?.list?.() || [];
    if (!alarms.length) return "You have no saved alarms.";
    return "Your saved alarms: " + alarms.map(a => a.name + " at " + a.time + (a.repeat ? " (daily)" : " on " + a.date)).join("; ") + ".";
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
      if (field === "time") { const parsedTime = parseAlarmTime(text); if (parsedTime) pendingIntent.alarm.time = parsedTime; }
      if (field === "date") { const parsedDate = parseAlarmDate(text); if (parsedDate) pendingIntent.alarm.date = parsedDate; }
      if (field === "repeat" && /^(yes|daily|repeat)$/i.test(q)) pendingIntent.alarm.repeat = true;
      if (field === "repeat" && /^(no|once|one time)$/i.test(q)) pendingIntent.alarm.repeat = false;
      const a = pendingIntent.alarm;
      const missing = !a.name ? "name" : !a.time ? "time (e.g. 9:15pm, 9 AM or 21:15)" : (!a.date && !a.repeat) ? "date (e.g. 19/11/2026, 19-11-2026, 2026-11-19 or tomorrow)" : null;
      if (missing) { setPending({ type:"alarm-field", field: missing.startsWith("name") ? "name" : missing.startsWith("time") ? "time" : "date", alarm:a }); return "Got it. What is the alarm " + missing + "?"; }
      setPending(null);
      try {
        const created = window.CascadeAlarms.create({ name:a.name, time:a.time, date:a.date, repeat:!!a.repeat });
        return "Created “" + created.name + "” for " + created.time + (created.repeat ? " every day." : " on " + created.date + ".") + " Your device notification schedule has been updated where permission is available.";
      } catch (error) { return error.message || "I couldn't create that alarm."; }
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
    if (/\b(list|show|view|what are|my)\b.*\b(alarms?|reminders?)\b/.test(q) || /\b(list alarms|show alarms)\b/.test(q)) return listAlarmSummary();
    const alarmToggle = q.match(/\b(enable|turn on|disable|turn off)\b.*\balarm\b/i);
    if (alarmToggle && !/(low.?water|motor|cut.?off|alert)/.test(q)) {
      const alarms = window.CascadeAlarms?.list?.() || [];
      const target = alarms.find(a => q.includes(String(a.name).toLowerCase()));
      if (!target) return alarms.length ? "Which alarm should I " + (/disable|turn off/.test(q) ? "disable" : "enable") + "? Your alarms are: " + alarms.map(a=>a.name).join(", ") + "." : "There are no saved alarms.";
      const enabled = !/disable|turn off/.test(q);
      return confirmAction((enabled ? "Enable" : "Disable") + " the alarm “" + target.name + "”?", () => {
        try { window.CascadeAlarms.update(target.id,{enabled}); return (enabled ? "Enabled " : "Disabled ") + "“" + target.name + "”."; }
        catch(error) { return error.message; }
      });
    }
    const editAlarm = q.match(/\b(?:change|edit|update|move|reschedule)\b.*\balarm\b/i);
    if (editAlarm) {
      const alarms = window.CascadeAlarms?.list?.() || [];
      const target = alarms.find(a => q.includes(String(a.name).toLowerCase()));
      if (!target) return alarms.length ? "Which alarm should I change? Your alarms are: " + alarms.map(a=>a.name).join(", ") + "." : "There are no alarms to change.";
      const newTime = parseAlarmTime(text);
      const newDate = parseAlarmDate(text);
      if (!newTime && !newDate) return "What new time or date should I use for “" + target.name + "”?";
      return confirmAction("Update “" + target.name + "”" + (newTime ? " to " + newTime : "") + (newDate ? " on " + newDate : "") + "?", () => {
        try { window.CascadeAlarms.update(target.id, { ...(newTime ? {time:newTime} : {}), ...(newDate ? {date:newDate,repeat:false} : {}) }); return "Updated “" + target.name + "”. The alarm schedule has been refreshed."; }
        catch (error) { return error.message; }
      });
    }
    const alarmCreate = /\b(create|add|schedule|set up|set)\b.*\balarm\b/.test(q) || /\b(alarm|reminder)\b.*\b(set|create|schedule)\b/.test(q) || /\bremind me\b/.test(q);
    if (alarmCreate) {
      const alarm = { name:"", time:"", date:"", repeat:/daily|every day|repeat/.test(q) };
      const name = text.match(/\balarm\s+(?:called|named)\s+["“]?(.+?)["”]?(?=\s+(?:at|on)\b|$)/i)
        || text.match(/\balarm\s+for\s+(.+?)(?=\s+(?:at|on)\b|$)/i)
        || text.match(/\bremind me to\s+(.+?)(?=\s+(?:at|on|tomorrow|today)\b|$)/i);
      if (name) {
        const proposedName = name[1].trim().replace(/[“”"]/g, "");
        alarm.name = parseAlarmTime(proposedName) ? "Cascade reminder" : proposedName;
      }
      alarm.time = parseAlarmTime(text) || "";
      alarm.date = parseAlarmDate(text) || "";
      if (/daily|every day/.test(q)) alarm.repeat = true;
      if (alarm.time && !alarm.date && !alarm.repeat) {
        const [hour,minute] = alarm.time.split(":").map(Number);
        const now = new Date();
        const target = new Date(); target.setHours(hour,minute,0,0);
        if (target <= now) target.setDate(target.getDate()+1);
        alarm.date = target.getFullYear()+"-"+String(target.getMonth()+1).padStart(2,"0")+"-"+String(target.getDate()).padStart(2,"0");
      }
      const missing = !alarm.name ? "name" : !alarm.time ? "time (e.g. 9:15pm, 9 AM or 21:15)" : (!alarm.date && !alarm.repeat) ? "date (e.g. 19/11/2026, 19-11-2026, 2026-11-19 or tomorrow)" : null;
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
        if (!window.CascadeAlarms?.remove?.(target.id)) return "I couldn't delete that alarm.";
        return "Deleted alarm “"+target.name+"” and cancelled its scheduled notification.";
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
    if (/\b(turn|switch|start|run|activate)\s+(the\s+)?(pump|motor)\s+on\b|\b(turn|switch)\s+on\s+(the\s+)?(pump|motor)\b|\b(motor|pump)\s+(on|start|start karo|chalu)\b/.test(q)) {
      const button=document.getElementById("motorOnButton");
      if(!button) { navigateTo("dashboard"); return "Pump controls are on the Dashboard. Opening it; ask me again there."; }
      if(button.disabled) return "I can't send a pump-ON command right now. Check owner sign-in, device connection, fresh sensor reading and cutoff safety conditions on the Dashboard.";
      return confirmAction("Send a command to turn the pump ON? This affects physical hardware. Confirm only if the area and system are safe. Fresh sensor data and the cutoff interlock remain mandatory.", async () => {
        const ok = await window.motorOn();
        return ok ? "The pump-ON command was queued. This is not proof that the relay switched; wait for ESP32 feedback." : "The pump-ON command failed or was blocked. Check owner sign-in, sensor freshness, cutoff and device connectivity.";
      });
    }
    if (/\b(turn|switch|stop|deactivate)\s+(the\s+)?(pump|motor)\s+off\b|\b(turn|switch)\s+off\s+(the\s+)?(pump|motor)\b|\b(motor|pump)\s+(off|stop|band)\b/.test(q)) {
      const button=document.getElementById("motorOffButton");
      if(!button) { navigateTo("dashboard"); return "Pump controls are on the Dashboard. Opening it; ask me again there."; }
      if(button.disabled) return "I can't send a pump-OFF command: sign in with the owner account first.";
      return confirmAction("Send a command to turn the pump OFF?", async () => {
        const ok = await window.motorOff();
        return ok ? "The pump-OFF command was queued. Wait for ESP32 feedback to confirm the physical state." : "The pump-OFF command failed. Check owner sign-in and the device connection.";
      });
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
        const [historicalContext] = await Promise.all([fetchHistoricalContext(text)]);
        const response = await fetch(API_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text, history, page: pageName(), language: assistantLanguage,
            languageName: languageNames[assistantLanguage],
            liveStatus: typeof window.getCascadeAssistantContext === "function" ? window.getCascadeAssistantContext() : null,
            dataContext: historicalContext,
            reportName: attachedReportName,
            reportText: attachedReportText
          })
        });
        if (!response.ok) throw new Error("Assistant service returned " + response.status);
        const data = await response.json();
        typing.textContent = data.reply || (assistantLanguage === "hi" ? "माफ़ कीजिए, जवाब नहीं बन पाया। फिर कोशिश करें।" : assistantLanguage === "bn" ? "দুঃখিত, উত্তর তৈরি করা যায়নি। আবার চেষ্টা করুন।" : "I couldn't generate a reply. Please try again.");
        if (attachedReportText && /analyse|analyze|report|summari[sz]e|attached/i.test(text)) {
          attachedReportText = "";
          attachedReportName = "";
        }
      }
    } catch (error) {
      typing.textContent = assistantLanguage === "hi" ? "AI सेवा से संपर्क नहीं हो पाया। कृपया बाद में कोशिश करें।" : assistantLanguage === "bn" ? "AI পরিষেবার সঙ্গে যোগাযোগ করা যায়নি। পরে আবার চেষ্টা করুন।" : "I couldn't reach the AI service. Please try again later.";
      console.error("Cascade assistant:", error);
    } finally {
      typing.classList.remove("typing");
      persistConversation();
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
