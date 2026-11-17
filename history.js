const HISTORY_KEY = "fluidops_full_history";
let historyRecords = [];
let activeFilter = "all";
const timeline = document.getElementById("historyTimeline");
const searchInput = document.getElementById("historySearch");
function loadHistory() {
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        const parsed = JSON.parse(saved || "[]");

        historyRecords = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("History loading failed:", error);
        historyRecords = [];
    }
    renderHistory();
}
function escapeHTML(value) {
    const element = document.createElement("span");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}
function getDateKey(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "unknown";
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}
function getDayLabel(dateKey) {
    const today = getDateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateKey === today) return "Today";
    if (dateKey === getDateKey(yesterday)) return "Yesterday";
    const date = new Date(dateKey + "T12:00:00");
    return Number.isNaN(date.getTime())
        ? "Other dates"
        : date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}
function renderHistory() {
    if (!timeline) return;
    const search = searchInput.value.trim().toLowerCase();
    const from = document.getElementById("historyFrom").value;
    const to = document.getElementById("historyTo").value;
    const filtered = historyRecords
        .filter(record => {
            const message = String(record.message || "").toLowerCase();
            const type = String(record.type || "").toLowerCase();
            const dateKey = getDateKey(record.timestamp);
            const matchesCategory =
                activeFilter === "all" || type === activeFilter;
            const matchesSearch =
                message.includes(search) || type.includes(search);
            const matchesFrom = !from || dateKey >= from;
            const matchesTo = !to || dateKey <= to;
            return matchesCategory &&
                matchesSearch &&
                matchesFrom &&
                matchesTo;
        })
        .sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    const groups = {};
    filtered.forEach(record => {
        const key = getDateKey(record.timestamp);
        if (!groups[key]) groups[key] = [];
        groups[key].push(record);
    });
    const icons = {
        water: "💧",
        motor: "⚡",
        alert: "⚠️",
        system: "⚙️"
    };
    if (filtered.length === 0) {
        timeline.innerHTML = `
            <div class="history-empty">
                <h3>${historyRecords.length === 0
                    ? "No history available yet"
                    : "No matching records found"}</h3>
                <p>${
                    historyRecords.length === 0
                        ? "Your system activities will appear here."
                        : "Try changing your search or filters."
                }</p>
            </div>
        `;
    } else {
        timeline.innerHTML = Object.entries(groups).map(([day, records]) => {
            return `
                <div class="history-day-group">
                    <h3 class="history-day-heading">
                        ${escapeHTML(getDayLabel(day))}
                    </h3>
                    ${records.map(record => {
                        const date = new Date(record.timestamp);
                        const dateText = date.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        });
                        const timeText = date.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true
                        });
                        const type = String(record.type || "system");
                        const icon = icons[type] || "📌";
                        return `
                            <article class="history-entry">
                                <div class="history-entry-icon">
                                    ${icon}
                                </div>
                                <div class="history-entry-info">
                                    <strong>
                                        ${escapeHTML(record.message)}
                                    </strong>
                                    <small>
                                        ${escapeHTML(type.toUpperCase())}
                                    </small>
                                </div>
                                <time datetime="${escapeHTML(record.timestamp)}">
                                    ${escapeHTML(dateText)}<br>
                                    ${escapeHTML(timeText)}
                                </time>
                            </article>
                        `;
                    }).join("")}
                </div>
            `;
        }).join("");
    }
    updateSummary();
}
function updateSummary() {
    document.getElementById("historyTotal").textContent =
        historyRecords.length;
    document.getElementById("historyWaterCount").textContent =
        historyRecords.filter(r => r.type === "water").length;
    document.getElementById("historyMotorCount").textContent =
        historyRecords.filter(r => r.type === "motor").length;
    document.getElementById("historyAlertCount").textContent =
        historyRecords.filter(r => r.type === "alert").length;
    document.getElementById("historyRecordCount").textContent =
        historyRecords.length + " total records";
}
// Category filters
document.querySelectorAll(".history-filter").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".history-filter").forEach(item => {
            item.classList.remove("active");
        });
        button.classList.add("active");
        activeFilter = button.dataset.filter;
        renderHistory();
    });
});
// Search
searchInput.addEventListener("input", renderHistory);
// Date filters
document.getElementById("historyFrom")
    .addEventListener("change", renderHistory);
document.getElementById("historyTo")
    .addEventListener("change", renderHistory);
// CSV export
document.getElementById("historyExport")
    .addEventListener("click", () => {
        if (historyRecords.length === 0) {
            alert("No history records available to export.");
            return;
        }
        const rows = [
            ["Category", "Event", "Value", "Date and Time"],
            ...historyRecords.map(record => [
                record.type,
                record.message,
                record.value ?? "",
                record.timestamp
            ])
        ];
        const csv = rows.map(row =>
            row.map(value =>
                '"' + String(value).replace(/"/g, '""') + '"'
            ).join(",")
        ).join("\r\n");
        const blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Cascade-History.csv";
        link.click();
        URL.revokeObjectURL(url);
    });
// Clear history
document.getElementById("historyClear")
    .addEventListener("click", () => {
        if (!confirm("Are you sure you want to clear all history?")) {
            return;
        }
        historyRecords = [];
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    });
// Theme preference
const themeButton = document.getElementById("historyThemeToggle");
function applyHistoryTheme() {
    const isDark = localStorage.getItem("fluidops-theme") === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    themeButton.textContent = isDark ? "☀️" : "🌙";
}
themeButton.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem(
        "fluidops-theme",
        isDark ? "dark" : "light"
    );
    applyHistoryTheme();
});
// Update if main website changes history in another tab
window.addEventListener("storage", event => {
    if (event.key === HISTORY_KEY) {
        loadHistory();
    }
});
// Initial setup
applyHistoryTheme();
loadHistory();
