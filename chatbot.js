(() => {
  "use strict";
  const API_URL = window.CASCADE_CHAT_API_URL || "";
  const root = document.createElement("div");
  root.id = "cascade-chat";
  root.innerHTML = `
    <button class="cascade-chat-launcher" type="button" aria-label="Open Cascade AI assistant" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c-4.9 0-8.8 3.2-8.8 7.2 0 2.1 1.1 4 3 5.3l-.8 4 4.1-2c.8.2 1.6.3 2.5.3 4.9 0 8.8-3.2 8.8-7.2S16.9 3.2 12 3.2Z"/><path d="M8 10.5h8M8 13.5h5"/></svg>
    </button>
    <section class="cascade-chat-panel" aria-label="Cascade AI assistant" aria-hidden="true">
      <header class="cascade-chat-head">
        <div class="cascade-chat-brand"><span class="cascade-chat-avatar">C</span><span><strong>Cascade Assistant</strong><small><i></i> Here to help</small></span></div>
        <button class="cascade-chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="cascade-chat-messages" role="log" aria-live="polite">
        <div class="cascade-chat-message bot">Hi! I'm the Cascade assistant. Ask me about the system, dashboard, water monitoring or pump automation.</div>
        <div class="cascade-chat-suggestions">
          <button type="button" data-question="How does Cascade work?">How does it work?</button>
          <button type="button" data-question="Explain the dashboard features.">Dashboard features</button>
          <button type="button" data-question="How do I change the low-water alert?">Change alert level</button>
        </div>
      </div>
      <form class="cascade-chat-form">
        <input name="message" type="text" maxlength="1000" placeholder="Ask about Cascade..." autocomplete="off" aria-label="Message Cascade assistant" required>
        <button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h13"/></svg></button>
      </form>
      <div class="cascade-chat-foot">AI responses may be inaccurate. Hardware actions require confirmation.</div>
    </section>`;
  document.body.appendChild(root);

  const launcher = root.querySelector(".cascade-chat-launcher");
  const panel = root.querySelector(".cascade-chat-panel");
  const close = root.querySelector(".cascade-chat-close");
  const form = root.querySelector("form");
  const input = form.elements.message;
  const messages = root.querySelector(".cascade-chat-messages");
  let busy = false;

  function setOpen(open) {
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", String(!open));
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close Cascade AI assistant" : "Open Cascade AI assistant");
    if (open) setTimeout(() => input.focus(), 120);
  }
  launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  close.addEventListener("click", () => setOpen(false));

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
    const m = text.match(/(?:low(?:[- ]water)?\\s+)?(?:alert|threshold)(?:\\s+(?:to|at|of))?\\s*(\\d{1,2})\\s*%?/i)
      || text.match(/set\\s+(?:the\\s+)?low(?:[- ]water)?\\s+(?:alert|level|threshold)\\s+(?:to\\s+)?(\\d{1,2})\\s*%?/i);
    if (!m) return null;
    const value = Number(m[1]);
    return value >= 5 && value <= 40 ? value : null;
  }
  function parseCutoff(text) {
    if (!/\\b(set|change|make|adjust|update)\\b/i.test(text)) return null;
    const m = text.match(/(?:maximum|max|cut[ -]?off|stop|full[- ]tank)\\s*(?:water\\s*)?(?:level|threshold)?\\s*(?:to|at|of|=)?\\s*(\\d{1,3})\\s*%?/i)
      || text.match(/(?:level|cut[ -]?off)\\s*(?:to|at)\\s*(\\d{1,3})\\s*%?/i);
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
  async function send(text) {
    if (busy || !text.trim()) return;
    addMessage(text, "user");
    const value = parseLowAlert(text);
    if (value !== null) { askLowAlertConfirmation(value); return; }
    const cutoff = parseCutoff(text);
    if (cutoff !== null) { askCutoffConfirmation(cutoff); return; }
    busy = true;
    const typing = addTyping();
    try {
      if (!API_URL) {
        typing.textContent = localAnswer(text);
      } else {
        const history = [...messages.querySelectorAll(".cascade-chat-message:not(.typing)")].slice(-12)
          .map(node => (node.classList.contains("user") ? "Visitor: " : "Assistant: ") + node.textContent)
          .join("\n");
        const response = await fetch(API_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history })
        });
        if (!response.ok) throw new Error("Assistant service returned " + response.status);
        const data = await response.json();
        typing.textContent = data.reply || "I couldn't generate a reply. Please try again.";
      }
    } catch (error) {
      typing.textContent = "I couldn't reach the AI service. " + (API_URL ? "Please try again later." : "The AI backend is not configured yet.");
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
