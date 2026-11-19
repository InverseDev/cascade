const ALARM_KEY = "cascade_scheduled_alarms";
const alarmForm = document.getElementById("alarmForm");
const alarmList = document.getElementById("scheduledAlarmList");
const alarmCount = document.getElementById("alarmCount");
let scheduledAlarms = [];
function loadAlarms() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(ALARM_KEY) || "[]"
        );
        scheduledAlarms = Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("Could not load alarms:", error);
        scheduledAlarms = [];
    }
    renderAlarms();
}
window.addEventListener("cascade-notification-permission-ready", () => {
    scheduledAlarms.forEach(alarm => syncNativeAlarm(alarm));
});
function saveAlarms() {
    localStorage.setItem(ALARM_KEY, JSON.stringify(scheduledAlarms));
}
function getLocalNotifications() {
    const capacitor = window.Capacitor;
    if (!capacitor?.isNativePlatform?.()) return null;
    return capacitor.registerPlugin?.("LocalNotifications") || capacitor.Plugins?.LocalNotifications || null;
}
function nativeAlarmNotificationId(alarmId) {
    let hash = 0;
    for (const char of String(alarmId)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return 200000 + (Math.abs(hash) % 1000000000);
}
async function syncNativeAlarm(alarm) {
    const plugin = getLocalNotifications();
    if (!plugin || !alarm?.enabled) return;
    try {
        const permission = await plugin.checkPermissions();
        if (permission.display !== "granted") return;
        const id = nativeAlarmNotificationId(alarm.id);
        await plugin.cancel({ notifications: [{ id }] });
        let at;
        if (alarm.repeat) {
            const [hour, minute] = alarm.time.split(":").map(Number);
            at = new Date();
            at.setHours(hour, minute, 0, 0);
            if (at <= new Date()) at.setDate(at.getDate() + 1);
        } else {
            at = new Date(`${alarm.date || new Date().toLocaleDateString("en-CA")}T${alarm.time}:00`);
            if (at <= new Date()) return;
        }
        const schedule = alarm.repeat
            ? { on: { hour: Number(alarm.time.split(":")[0]), minute: Number(alarm.time.split(":")[1]) }, allowWhileIdle: true }
            : { at, allowWhileIdle: true };
        await plugin.schedule({ notifications: [{
            id, title: alarm.name || "Cascade reminder",
            body: "Your scheduled Cascade reminder.",
            schedule, channelId: "cascade-alerts"
        }] });
    } catch (error) {
        console.warn("Could not schedule Cascade alarm notification:", error);
    }
}
async function cancelNativeAlarm(alarmId) {
    const plugin = getLocalNotifications();
    if (!plugin) return;
    try { await plugin.cancel({ notifications: [{ id: nativeAlarmNotificationId(alarmId) }] }); }
    catch (error) { console.warn("Could not cancel Cascade alarm notification:", error); }
}
function escapeAlarmText(value) {
    const element = document.createElement("span");
    element.textContent = String(value);
    return element.innerHTML;
}
// CREATE ALARM
alarmForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const name = document.getElementById("alarmName").value.trim();
    const time = document.getElementById("alarmTime").value;
    const date = document.getElementById("alarmDate").value;
    const repeat = document.getElementById("alarmRepeat").checked;
    const message = document.getElementById("alarmFormMessage");
    if (!name || !time) {
        message.textContent = "Please enter an alarm name and time.";
        return;
    }
    const today = new Date().toLocaleDateString("en-CA");
    const selectedDate = date || today;
    if (!repeat) {
        const scheduledDate = new Date(`${selectedDate}T${time}:00`);
        if (Number.isNaN(scheduledDate.getTime()) ||
            scheduledDate.getTime() <= Date.now()) {
            message.textContent = "Please select a future date and time.";
            return;
        }
    }
    const alarm = {
        id: Date.now().toString(),
        name,
        time,
        date: repeat ? null : selectedDate,
        repeat,
        enabled: true,
        createdAt: new Date().toISOString()
    };
    scheduledAlarms.push(alarm);
    saveAlarms();
    syncNativeAlarm(alarm);
    renderAlarms();
    alarmForm.reset();
    message.textContent = "Alarm successfully created!";
});
// DISPLAY ALARMS
function renderAlarms() {
    alarmCount.textContent =
        `${scheduledAlarms.length} alarm${scheduledAlarms.length === 1 ? "" : "s"}`;
    if (scheduledAlarms.length === 0) {
        alarmList.innerHTML = `
            <div class="alarm-empty">
                <h3>No alarms scheduled yet.</h3>
                <p>Your saved alarms will appear here.</p>
            </div>
        `;
        return;
    }
    alarmList.innerHTML = scheduledAlarms.map(alarm => {
        const timeText = new Date(
            `2000-01-01T${alarm.time}:00`
        ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
        return `
            <div class="scheduled-alarm-item">
                <div>
                    <strong>${escapeAlarmText(alarm.name)}</strong>
                    <small>
                        ${timeText} ·
                        ${alarm.repeat
                            ? "Repeats daily"
                            : escapeAlarmText(alarm.date)}
                    </small>
                </div>
                <button
                    type="button"
                    class="delete-alarm"
                    data-id="${escapeAlarmText(alarm.id)}"
                >
                    Delete
                </button>
            </div>
        `;
    }).join("");
}
// DELETE ALARM
alarmList.addEventListener("click", function(event) {
    const button = event.target.closest(".delete-alarm");
    if (!button) return;
    const removed = scheduledAlarms.find(alarm => alarm.id === button.dataset.id);
    if (removed) cancelNativeAlarm(removed.id);
    scheduledAlarms = scheduledAlarms.filter(
        alarm => alarm.id !== button.dataset.id
    );
    saveAlarms();
    renderAlarms();
});
// INITIAL LOAD
loadAlarms();
// Public, validated alarm API used by Cascade AI. Keeps browser and native
// Android notifications in sync instead of writing localStorage directly.
window.CascadeAlarms = {
    list() { return scheduledAlarms.map(alarm => ({ ...alarm })); },
    create({ name, time, date = null, repeat = false }) {
        const cleanName = String(name || "").trim().slice(0, 80);
        if (!cleanName || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(time || ""))) {
            throw new Error("A name and valid 24-hour time are required.");
        }
        const selectedDate = repeat ? null : String(date || new Date().toLocaleDateString("en-CA"));
        if (!repeat) {
            const scheduled = new Date(selectedDate + "T" + time + ":00");
            if (Number.isNaN(scheduled.getTime()) || scheduled <= new Date()) {
                throw new Error("Please choose a future date and time.");
            }
        }
        const alarm = { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), name: cleanName, time, date: selectedDate, repeat: !!repeat, enabled: true, createdAt: new Date().toISOString() };
        scheduledAlarms.push(alarm);
        saveAlarms();
        syncNativeAlarm(alarm);
        renderAlarms();
        const message = document.getElementById("alarmFormMessage");
        if (message) message.textContent = "Alarm successfully created by Cascade AI.";
        return { ...alarm };
    },
    remove(id) {
        const alarm = scheduledAlarms.find(item => String(item.id) === String(id));
        if (!alarm) return false;
        cancelNativeAlarm(alarm.id);
        scheduledAlarms = scheduledAlarms.filter(item => String(item.id) !== String(id));
        saveAlarms();
        renderAlarms();
        return true;
    },
    update(id, changes = {}) {
        const alarm = scheduledAlarms.find(item => String(item.id) === String(id));
        if (!alarm) throw new Error("I couldn't find that alarm.");
        const next = { ...alarm, ...changes };
        if (changes.time && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(next.time)) throw new Error("Invalid alarm time.");
        if (!next.repeat) {
            const scheduled = new Date(String(next.date || new Date().toLocaleDateString("en-CA")) + "T" + next.time + ":00");
            if (Number.isNaN(scheduled.getTime()) || scheduled <= new Date()) throw new Error("The updated alarm must be in the future.");
        }
        Object.assign(alarm, next);
        saveAlarms();
        cancelNativeAlarm(alarm.id);
        syncNativeAlarm(alarm);
        renderAlarms();
        return { ...alarm };
    }
};


// Persist the Alarm Centre alert toggles as browser preferences.
const alertPreferenceIds = ["lowWaterAlertEnabled", "motorAlertEnabled", "cutoffAlertEnabled"];
let savedAlertPreferences = {};
try { savedAlertPreferences = JSON.parse(localStorage.getItem("cascade-alert-preferences") || "{}"); } catch (_) {}
alertPreferenceIds.forEach(id => {
    const control = document.getElementById(id);
    if (!control) return;
    if (typeof savedAlertPreferences[id] === "boolean") control.checked = savedAlertPreferences[id];
    control.addEventListener("change", () => {
        savedAlertPreferences[id] = control.checked;
        localStorage.setItem("cascade-alert-preferences", JSON.stringify(savedAlertPreferences));
    });
});

// Alarm Sound Preview
const soundPresetControl =
    document.getElementById("alarmSoundPreset");
const soundFileControl =
    document.getElementById("alarmSoundFile");
const soundPreview =
    document.getElementById("alarmSoundPreview");
const soundFileLabel =
    document.getElementById("soundFileName");
const testSoundButton =
    document.getElementById("testAlarmSound");
const stopSoundButton =
    document.getElementById("stopAlarmSound");
let previewAudioContext = null;
let previewOscillators = [];
let previewFileURL = null;
// Stop currently playing preview
function stopSoundPreview() {
    if (soundPreview) {
        soundPreview.pause();
        soundPreview.currentTime = 0;
    }
    previewOscillators.forEach(oscillator => {
        try {
            oscillator.stop();
        } catch (error) {
            // Oscillator may already have stopped.
        }
    });
    previewOscillators = [];
    if (previewAudioContext) {
        const context = previewAudioContext;
        previewAudioContext = null;

        context.close().catch(() => {});
    }
}
// Generate preset alarm sounds
async function playPresetPreview(preset) {
    stopSoundPreview();
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        alert("Audio preview is not supported by this browser.");
        return;
    }
    const context = new AudioContextClass();
    previewAudioContext = context;
    await context.resume();
    const sounds = {
        classic: [
            [880, 0.20],
            [660, 0.20],
            [880, 0.20],
            [660, 0.25]
        ],
        gentle: [
            [523, 0.35],
            [659, 0.35],
            [784, 0.55]
        ],
        digital: [
            [1100, 0.12],
            [0, 0.08],
            [1100, 0.12],
            [0, 0.08],
            [1450, 0.25]
        ]
    };
    const notes = sounds[preset] || sounds.classic;
    let offset = 0;
    notes.forEach(([frequency, duration]) => {
        if (frequency > 0) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type =
                preset === "digital" ? "square" : "sine";
            oscillator.frequency.setValueAtTime(
                frequency,
                context.currentTime + offset
            );
            gain.gain.setValueAtTime(
                0.0001,
                context.currentTime + offset
            );
            gain.gain.exponentialRampToValueAtTime(
                0.15,
                context.currentTime + offset + 0.025
            );
            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                context.currentTime + offset + duration
            );
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(context.currentTime + offset);
            oscillator.stop(context.currentTime + offset + duration);
            previewOscillators.push(oscillator);
        }
        offset += duration + 0.08;
    });
    setTimeout(() => {
        if (previewAudioContext === context) {
            previewAudioContext = null;
            previewOscillators = [];
            context.close().catch(() => {});
        }
    }, (offset + 0.3) * 1000);
}
/* PRESET AND CUSTOM RINGTONE CONTROL */
// Clear selected custom ringtone
function clearCustomRingtone() {
    stopSoundPreview();
    if (previewFileURL) {
        URL.revokeObjectURL(previewFileURL);
        previewFileURL = null;
    }
    soundFileControl.value = "";
    soundPreview.pause();
    soundPreview.removeAttribute("src");
    soundPreview.load();
    soundPreview.hidden = true;
    soundPreview.controls = false;
    soundFileLabel.textContent =
        "No custom ringtone selected.";
}
// Dropdown selection
soundPresetControl.addEventListener("change", () => {
    const selectedSound = soundPresetControl.value;
    if (selectedSound === "custom") {
        // Automatically open computer file picker
        soundFileControl.click();
    } else {
        // Remove previously selected custom ringtone
        clearCustomRingtone();
    }
});
// Custom ringtone file selection
soundFileControl.addEventListener("change", () => {
    const file = soundFileControl.files[0];
    if (!file) return;
    const validAudio =
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
    if (!validAudio) {
        alert("Please select a valid audio file.");
        clearCustomRingtone();
        soundPresetControl.value = "classic";
        return;
    }
    stopSoundPreview();
    if (previewFileURL) {
        URL.revokeObjectURL(previewFileURL);
    }
    previewFileURL = URL.createObjectURL(file);
    soundPreview.src = previewFileURL;
    soundPreview.controls = true;
    soundPreview.hidden = false;
    soundPresetControl.value = "custom";
    soundFileLabel.textContent =
        "Selected: " + file.name;
});
// Test sound button
testSoundButton.addEventListener("click", async () => {
    const preset = soundPresetControl.value;
    try {
        stopSoundPreview();
        if (preset === "custom") {
            if (!soundFileControl.files.length) {
                alert("Please choose your custom ringtone first.");
                return;
            }
            soundPreview.currentTime = 0;
            await soundPreview.play();
        } else {
            await playPresetPreview(preset);
        }
    } catch (error) {
        console.error("Sound preview error:", error);
        alert("Could not play the sound. Please try again.");
    }
});
// Stop sound button
stopSoundButton.addEventListener("click", stopSoundPreview);
// ===== ALARM PAGE THEME SYSTEM =====
const alarmThemeToggle = document.getElementById("alarmThemeToggle");
function applyAlarmTheme() {
    const savedTheme = localStorage.getItem("fluidops-theme");
    const isDark = savedTheme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    if (alarmThemeToggle) {
        alarmThemeToggle.textContent = isDark ? "☀️" : "🌙";
        alarmThemeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );
    }
}
if (alarmThemeToggle) {
    alarmThemeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem(
            "fluidops-theme",
            isDark ? "dark" : "light"
        );
        applyAlarmTheme();
    });
}
applyAlarmTheme();
