(() => {
    "use strict";
    if (window.__cascadeChatLoaded) return;
    window.__cascadeChatLoaded = true;

    const QUICK_QUESTIONS = [
        "Tank status",
        "Motor state",
        "How cutoff works"
    ];

    function getReply(rawInput) {
        const q = rawInput.trim().toLowerCase();

        // 1. Live Tank Level (reads global variables from app.js if on dashboard)
        if (/water|tank|level|percent|status/.test(q)) {
            if (typeof waterLevel === "number" && Number.isFinite(waterLevel)) {
                const state = typeof sensorOnline !== "undefined" && sensorOnline ? "online" : "offline (last cached)";
                return `Current water level is ${waterLevel.toFixed(1)}% (${state}). Cutoff threshold is set to ${typeof cutoffLevel !== "undefined" ? cutoffLevel : 90}%.`;
            }
            return "Live tank telemetry is available on the Dashboard. Open Dashboard to view real-time ESP32 ultrasonic readings.";
        }

        // 2. Motor / Pump State
        if (/motor|pump|on|off|switch/.test(q)) {
            if (typeof motorStatus !== "undefined") {
                const online = typeof sensorOnline !== "undefined" && sensorOnline;
                return online
                    ? `The pump motor is currently reported as ${motorStatus.toUpperCase()}.`
                    : "The ESP32 device is currently offline, so motor feedback is unavailable. Sign in as owner on the Dashboard to send commands once online.";
            }
            return "Motor controls require owner authentication on the main Dashboard and automatically block ON commands when tank level reaches the cutoff limit.";
        }

        // 4. History & Logs
        if (/history|log|report|activity/.test(q)) {
            try {
                const logs = JSON.parse(localStorage.getItem("fluidops_full_history") || "[]");
                if (!logs.length) return "No system events have been logged yet.";
                return `There are ${logs.length} recorded events. Latest: "${logs[0].message}".`;
            } catch (_) {
                return "View full pump, alert, and system logs on the History & Reports page.";
            }
        }

        // 5. Overflow / Cutoff / Safety Info
        if (/cutoff|overflow|safe|how|help|cascade/.test(q)) {
            return "Cascade monitors overhead tank water levels via ultrasonic sensing and automatically stops the pump at your cutoff threshold to prevent overflow and dry-run damage.";
        }

        return "I can help with live tank water level, motor status, recent logs, or overflow cutoff rules. Tap a quick prompt below or ask away!";
    }

    function initChat() {
        const launcher = document.createElement("button");
        launcher.type = "button";
        launcher.className = "cascade-chat-launcher";
        launcher.setAttribute("aria-label", "Open Cascade Assistant");
        launcher.textContent = "💬";

        const chatWindow = document.createElement("aside");
        chatWindow.className = "cascade-chat-window";
        chatWindow.setAttribute("aria-hidden", "true");
        chatWindow.innerHTML = `
            <div class="cascade-chat-header">
                <div class="cascade-chat-title">
                    <span style="font-size:22px;">💧</span>
                    <div>
                        <strong>Cascade Assistant</strong>
                        <small>Smart Water Helper</small>
                    </div>
                </div>
                <button type="button" class="cascade-chat-close" aria-label="Close chat">✕</button>
            </div>
            <div class="cascade-chat-messages" id="cascadeChatMessages">
                <div class="cascade-msg bot">
                    Hi! Ask me about your water tank level or motor status.
                </div>
            </div>
            <div class="cascade-chat-chips" id="cascadeChatChips"></div>
            <form class="cascade-chat-form" id="cascadeChatForm">
                <input
                    type="text"
                    class="cascade-chat-input"
                    id="cascadeChatInput"
                    placeholder="Ask Cascade..."
                    autocomplete="off"
                >
                <button type="submit" class="cascade-chat-send">Send</button>
            </form>
        `;

        document.body.append(launcher, chatWindow);

        const messagesBox = chatWindow.querySelector("#cascadeChatMessages");
        const chipsBox = chatWindow.querySelector("#cascadeChatChips");
        const form = chatWindow.querySelector("#cascadeChatForm");
        const input = chatWindow.querySelector("#cascadeChatInput");
        const closeBtn = chatWindow.querySelector(".cascade-chat-close");

        function appendMessage(text, sender) {
            const bubble = document.createElement("div");
            bubble.className = `cascade-msg ${sender}`;
            bubble.textContent = text;
            messagesBox.appendChild(bubble);
            messagesBox.scrollTop = messagesBox.scrollHeight;
        }

        function handleUserQuery(text) {
            const clean = text.trim();
            if (!clean) return;
            appendMessage(clean, "user");
            setTimeout(() => {
                appendMessage(getReply(clean), "bot");
            }, 220);
        }

        QUICK_QUESTIONS.forEach(label => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "cascade-chip";
            chip.textContent = label;
            chip.addEventListener("click", () => handleUserQuery(label));
            chipsBox.appendChild(chip);
        });

        function toggleChat(forceOpen) {
            const open = typeof forceOpen === "boolean"
                ? forceOpen
                : !chatWindow.classList.contains("open");
            chatWindow.classList.toggle("open", open);
            chatWindow.setAttribute("aria-hidden", String(!open));
            launcher.textContent = open ? "✕" : "💬";
            if (open) setTimeout(() => input.focus(), 150);
        }

        launcher.addEventListener("click", () => toggleChat());
        closeBtn.addEventListener("click", () => toggleChat(false));

        form.addEventListener("submit", e => {
            e.preventDefault();
            handleUserQuery(input.value);
            input.value = "";
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initChat);
    } else {
        initChat();
    }
})();