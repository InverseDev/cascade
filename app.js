// Cascade live dashboard — real Supabase sensor readings, no demo simulation.
const CASCADE_CONFIG = window.CASCADE_CONFIG || {};
let waterLevel = null;
let distanceCm = null;
let motorStatus = "unknown";
let sensorOnline = false;
let latestReadingAt = null;
let latestOfflineReason = "waiting for first reading";
let cutoffLevel = 90;
let lowWaterLevel = 20;
let previousLowState = false;
let previousMotorStatus = "unknown";
let previousConnectionState = "waiting";
let readingRequestInProgress = false;
let cascadeSupabase = null;
let motorAuthSession = null;
let motorCommandInFlight = false;
let scene, camera, renderer, waterMesh, waterGeometry, waterPositions, animationFrame;
let threeReady = false;

function setConnectionState(state, label) {
  const badge = document.getElementById("connectionStatus");
  const labelNode = document.getElementById("connectionLabel");
  const heroText = document.getElementById("heroConnectionText");
  if (badge) badge.dataset.state = state;
  if (labelNode) labelNode.textContent = label;
  if (heroText) {
    heroText.textContent = state === "live" ? "Device connected" :
      state === "offline" ? "Device offline" :
      state === "error" ? "Connection error" :
      state === "setup" ? "Setup required" : "Waiting for sensor";
  }
}

function isCascadeAlertEnabled(preferenceId) {
  try {
    const preferences = JSON.parse(localStorage.getItem("cascade-alert-preferences") || "{}");
    return preferences[preferenceId] !== false;
  } catch (_) { return true; }
}

async function sendCascadeAppNotification(title, body, id = 1201) {
  const capacitor = window.Capacitor;
  const nativePlugin = capacitor?.isNativePlatform?.()
    ? (capacitor.registerPlugin?.("LocalNotifications") || capacitor.Plugins?.LocalNotifications)
    : null;
  if (nativePlugin) {
    try {
      const permission = await nativePlugin.checkPermissions();
      if (permission.display !== "granted") return;
      if (nativePlugin.createChannel) await nativePlugin.createChannel({ id: "cascade-alerts", name: "Cascade alerts", description: "Water level and pump alerts", importance: 4 });
      await nativePlugin.schedule({ notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + 500) }, channelId: "cascade-alerts" }] });
    } catch (error) { console.warn("Cascade app notification failed:", error); }
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
}

function updateDashboard() {
  updateMotorControls();
  const waitingForReading = waterLevel === null || !Number.isFinite(waterLevel);
  const pct = waitingForReading ? null : Math.max(0, Math.min(100, waterLevel));
  const percentText = waitingForReading ? "--%" : `${pct.toFixed(1)}%`;
  const distanceText = Number.isFinite(distanceCm) ? `Distance: ${distanceCm.toFixed(2)} cm` : "Distance: -- cm";

  ["waterLevel", "tankReading", "heroPercent"].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.textContent = percentText;
  });
  const bar = document.getElementById("waterBar");
  if (bar) bar.style.width = waitingForReading ? "0%" : `${pct}%`;
  ["heroWater", "dashWater"].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.style.height = waitingForReading ? "0%" : `${pct}%`;
  });
  const litres = document.getElementById("litres");
  const heroLitres = document.getElementById("heroLitres");
  if (litres) litres.textContent = distanceText;
  if (heroLitres) heroLitres.textContent = distanceText;

  const motorIsOn = sensorOnline && motorStatus === "on";
  if (sensorOnline && motorStatus !== "unknown") {
    if (previousMotorStatus !== "unknown" && previousMotorStatus !== motorStatus) {
      if (isCascadeAlertEnabled("motorAlertEnabled")) {
        sendCascadeAppNotification(
          motorStatus === "on" ? "Cascade: Pump started" : "Cascade: Pump stopped",
          motorStatus === "on" ? "The device reports that the pump is now running." : "The device reports that the pump has stopped.",
          1202
        );
      }
      if (previousMotorStatus === "on" && motorStatus === "off" && pct !== null && pct >= cutoffLevel && isCascadeAlertEnabled("cutoffAlertEnabled")) {
        sendCascadeAppNotification("Cascade: Automatic cutoff", `The pump stopped at a tank level of ${pct.toFixed(1)}%.`, 1203);
      }
    }
    previousMotorStatus = motorStatus;
  } else {
    previousMotorStatus = "unknown";
  }
  const motorStatusNode = document.getElementById("motorStatus");
  if (motorStatusNode) motorStatusNode.textContent = sensorOnline && motorStatus !== "unknown" ? motorStatus.toUpperCase() : "—";
  const motorMessage = document.getElementById("motorMessage");
  if (motorMessage) {
    motorMessage.textContent = !sensorOnline
      ? "Device feedback is unavailable."
      : motorStatus === "on"
        ? "The device reports that the motor is ON."
        : motorStatus === "off"
          ? "The device reports that the motor is OFF."
          : "The device has not reported a motor state.";
  }
  const motorPill = document.getElementById("motorPill");
  if (motorPill) {
    motorPill.textContent = !sensorOnline ? "● Unknown" : motorIsOn ? "● Running" : motorStatus === "off" ? "● Stopped" : "● Unknown";
    motorPill.classList.toggle("running", motorIsOn);
    motorPill.classList.toggle("unknown", !sensorOnline || motorStatus === "unknown");
  }
  document.body.classList.toggle("motor-running", motorIsOn);

  const levelState = document.getElementById("levelState");
  if (levelState) {
    levelState.textContent = waitingForReading ? "Awaiting reading" :
      pct <= lowWaterLevel ? "Low water" :
      pct >= cutoffLevel ? "High water" : "Healthy level";
  }

  const alertMessage = document.getElementById("alertMessage");
  if (alertMessage) {
    if (waitingForReading) {
      alertMessage.textContent = "";
      alertMessage.classList.remove("warning");
      previousLowState = false;
    } else if (pct <= lowWaterLevel) {
      alertMessage.textContent = "⚠ Minimum threshold reached. The pump start rule is set, but automatic starting is not active until ESP32 automation is implemented.";
      alertMessage.classList.add("warning");
      if (!previousLowState) {
        addActivity("Minimum water threshold reached: " + pct.toFixed(1) + "%");
        if (isCascadeAlertEnabled("lowWaterAlertEnabled")) {
          sendCascadeAppNotification("Cascade: Low water", `Tank level is ${pct.toFixed(1)}%. Check the pump and water supply.`, 1201);
        }
      }
      previousLowState = true;
    } else {
      alertMessage.textContent = "✓ Water level is normal.";
      alertMessage.classList.remove("warning");
      previousLowState = false;
    }
  }

  const sensorMeta = document.getElementById("sensorMeta");
  if (sensorMeta) {
    if (!latestReadingAt) sensorMeta.textContent = "No sensor reading received yet.";
    else {
      const time = new Date(latestReadingAt).toLocaleString();
      sensorMeta.textContent = `${distanceText} · Last update: ${time}`;
    }
  }
}

function updateMotorControls() {
  const onButton = document.getElementById("motorOnButton");
  const offButton = document.getElementById("motorOffButton");
  const loginControls = document.getElementById("motorLoginControls");
  const sessionControls = document.getElementById("motorSessionControls");
  const userLabel = document.getElementById("motorUserLabel");
  const authMessage = document.getElementById("motorAuthMessage");
  const signedIn = Boolean(motorAuthSession?.access_token);
  const freshLevel = sensorOnline && Number.isFinite(waterLevel);

  if (loginControls) loginControls.hidden = signedIn;
  if (sessionControls) sessionControls.hidden = !signedIn;
  if (userLabel) userLabel.textContent = signedIn ? `Signed in: ${motorAuthSession.user?.email || "owner account"}` : "";
  if (onButton) onButton.disabled = !signedIn || !freshLevel || waterLevel >= cutoffLevel || motorCommandInFlight;
  if (offButton) offButton.disabled = !signedIn || motorCommandInFlight;
  if (authMessage) {
    if (!signedIn) authMessage.textContent = "Sign in with the owner account to enable motor commands.";
    else if (motorCommandInFlight) authMessage.textContent = "Sending command… waiting for the device channel.";
    else if (!sensorOnline) authMessage.textContent = "Fresh sensor data is required before motor ON can be enabled.";
    else if (waterLevel >= cutoffLevel) authMessage.textContent = `Tank is at or above ${cutoffLevel}%. Motor ON is blocked.`;
    else authMessage.textContent = "Owner account signed in. Commands are sent to the ESP32; status changes only after device feedback.";
  }
}

async function initializeMotorAuth() {
  const baseUrl = String(CASCADE_CONFIG.SUPABASE_URL || "").replace(/\/$/, "");
  const publicKey = String(CASCADE_CONFIG.SUPABASE_ANON_KEY || "").trim();
  if (!window.supabase?.createClient || !baseUrl || !publicKey || publicKey.includes("PASTE_YOUR")) {
    const authMessage = document.getElementById("motorAuthMessage");
    if (authMessage) authMessage.textContent = "Supabase client/key setup is incomplete. Check supabase-config.js.";
    updateMotorControls();
    return;
  }

  cascadeSupabase = window.supabase.createClient(baseUrl, publicKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data, error } = await cascadeSupabase.auth.getSession();
  if (!error) motorAuthSession = data.session;
  cascadeSupabase.auth.onAuthStateChange((_event, session) => {
    motorAuthSession = session;
    updateMotorControls();
  });
  updateMotorControls();
}

async function motorSignIn() {
  const email = document.getElementById("motorEmail")?.value.trim();
  const password = document.getElementById("motorPassword")?.value;
  const message = document.getElementById("motorAuthMessage");
  const loginButton = document.getElementById("motorLoginButton");
  if (!cascadeSupabase) {
    if (message) message.textContent = "Supabase login is not configured yet.";
    return;
  }
  if (!email || !password) {
    if (message) message.textContent = "Enter the owner email and password.";
    return;
  }
  if (loginButton) loginButton.disabled = true;
  if (message) message.textContent = "Signing in…";
  try {
    const { data, error } = await cascadeSupabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    motorAuthSession = data.session;
    if (message) message.textContent = "Signed in. Motor commands are available subject to safety checks.";
    addActivity("Owner signed in to the motor control panel.");
  } catch (error) {
    console.error("Cascade sign-in error:", error);
    if (message) message.textContent = error.message || "Sign-in failed. Check your account details.";
  } finally {
    if (loginButton) loginButton.disabled = false;
    updateMotorControls();
  }
}

async function motorSignOut() {
  if (!cascadeSupabase) return;
  const { error } = await cascadeSupabase.auth.signOut();
  if (error) {
    console.error("Cascade sign-out error:", error);
    alert("Could not sign out. Please try again.");
    return;
  }
  motorAuthSession = null;
  addActivity("Owner signed out of the motor control panel.");
  updateMotorControls();
}

async function sendMotorCommand(command) {
  if (!motorAuthSession?.access_token || !cascadeSupabase) {
    alert("Please sign in with the owner account first.");
    return;
  }
  if (command === "ON" && (!sensorOnline || !Number.isFinite(waterLevel) || waterLevel >= cutoffLevel)) {
    alert("Motor ON is blocked: a fresh sensor reading below the cutoff is required.");
    return;
  }
  if (motorCommandInFlight) return;

  motorCommandInFlight = true;
  updateMotorControls();
  try {
    const { data, error } = await cascadeSupabase.functions.invoke("motor-control", {
      body: { action: "command", command }
    });
    if (error) {
      let detail = error.message || "Motor command request failed.";
      try {
        const body = error.context && await error.context.json();
        if (body?.error) detail = body.error;
      } catch (_) { /* Keep the SDK error message. */ }
      throw new Error(detail);
    }
    if (!data?.success) throw new Error(data?.error || "Motor command was not accepted.");
    const id = data.command?.id;
    const message = `Motor ${command} command queued${id ? ` (#${id})` : ""}. Waiting for ESP32 acknowledgement.`;
    addActivity(message);
    const motorMessage = document.getElementById("motorMessage");
    if (motorMessage) motorMessage.textContent = message;
    return true;
  } catch (error) {
    console.error("Cascade motor command error:", error);
    alert(error.message || "Could not send the motor command.");
    addActivity(`Motor ${command} command failed: ${error.message || "request error"}`);
    return false;
  } finally {
    motorCommandInFlight = false;
    updateMotorControls();
  }
}

function motorOn() { return sendMotorCommand("ON"); }
function motorOff() { return sendMotorCommand("OFF"); }

function updateCutoff() {
  cutoffLevel = Number(document.getElementById("cutoff").value);
  document.getElementById("cutoffValue").textContent = cutoffLevel + "%";
}
function updateLowLevel() {
  lowWaterLevel = Number(document.getElementById("lowLevel").value);
  document.getElementById("lowValue").textContent = lowWaterLevel + "%";
}
function saveSettings() {
  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
  if (lowWaterLevel >= cutoffLevel) {
    if (!isNative) alert("Low-water alert must be below the cutoff level.");
    return false;
  }
  try {
    localStorage.setItem("cascade-dashboard-settings", JSON.stringify({ cutoffLevel, lowWaterLevel }));
    addActivity(`Thresholds updated: maximum ${cutoffLevel}%, minimum ${lowWaterLevel}%.`);
    if (!isNative) alert("Dashboard preferences saved on this browser. Device-side automation is not active yet.");
    return true;
  } catch (error) {
    console.error("Settings save failed:", error);
    if (!isNative) alert("Could not save dashboard preferences in this browser.");
    return false;
  }
}
async function enableNotifications() {
  const capacitor = window.Capacitor;
  const nativePlugin = capacitor?.isNativePlatform?.()
    ? (capacitor.registerPlugin?.("LocalNotifications") || capacitor.Plugins?.LocalNotifications)
    : null;
  if (nativePlugin) {
    try {
      const permission = await nativePlugin.checkPermissions();
      if (permission.display === "granted") return;
      const alreadyAsked = localStorage.getItem("cascade-native-notification-prompted") === "1";
      if (!alreadyAsked && (permission.display === "prompt" || permission.display === "prompt-with-rationale")) {
        localStorage.setItem("cascade-native-notification-prompted", "1");
        await nativePlugin.requestPermissions();
      }
    } catch (error) { console.error("App notification permission:", error); }
    return;
  }
  if (!("Notification" in window)) { alert("Your browser does not support notifications."); return; }
  const permission = await Notification.requestPermission();
  if (permission === "granted") { new Notification("Cascade", { body: "Browser notifications are enabled." }); addActivity("Browser notifications enabled."); }
  else alert("Notification permission was not granted.");
}

function setSensorOffline(message, state = "offline", label = "DEVICE OFFLINE") {
  sensorOnline = false;
  motorStatus = "unknown";
  setConnectionState(state, label);
  if (previousConnectionState !== state) {
    if (previousConnectionState === "live") addActivity("ESP32 sensor connection lost.");
    previousConnectionState = state;
  }
  updateDashboard();
  // Connectivity diagnostics stay internal; keep the reading area focused on measurements.
}

async function fetchLatestReading() {
  if (readingRequestInProgress) return;
  const baseUrl = String(CASCADE_CONFIG.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = String(CASCADE_CONFIG.SUPABASE_ANON_KEY || "").trim();
  const deviceId = String(CASCADE_CONFIG.DEVICE_ID || "cascade-esp32-01");
  if (!baseUrl || !anonKey || anonKey.includes("PASTE_YOUR")) {
    setSensorOffline("Add the Supabase publishable/anon key in supabase-config.js.", "setup", "SETUP REQUIRED");
    previousConnectionState = "setup";
    return;
  }

  readingRequestInProgress = true;
  try {
    const query = new URLSearchParams({
      select: "device_id,distance_cm,water_level_percent,motor_status,sensor_status,created_at",
      device_id: `eq.${deviceId}`,
      order: "created_at.desc",
      limit: "1"
    });
    const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(CASCADE_CONFIG.SENSOR_TABLE || "sensor_readings")}?${query}`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        // New sb_publishable keys belong in apikey only; legacy anon JWT keys
        // may also be sent as a bearer token for backward compatibility.
        ...(anonKey.startsWith("sb_publishable_") ? {} : { Authorization: `Bearer ${anonKey}` }),
        Accept: "application/json"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Supabase sensor query failed:", response.status, detail);
      setSensorOffline(
        response.status === 401 || response.status === 403
          ? "Supabase denied the read. Check the publishable key and sensor_readings SELECT policy."
          : `Supabase request failed (HTTP ${response.status}). Check the table and API settings.`,
        "error", "SUPABASE ERROR"
      );
      previousConnectionState = "error";
      return;
    }
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      waterLevel = null;
      distanceCm = null;
      latestReadingAt = null;
      setSensorOffline("No rows found for device " + deviceId + ". Waiting for the ESP32 to upload.", "waiting", "WAITING FOR DATA");
      previousConnectionState = "waiting";
      return;
    }

    const row = rows[0];
    const level = row.water_level_percent === null || row.water_level_percent === undefined
      ? NaN : Number(row.water_level_percent);
    const distance = row.distance_cm === null || row.distance_cm === undefined
      ? NaN : Number(row.distance_cm);
    const timestamp = Date.parse(row.created_at);
    const staleAfter = Number(CASCADE_CONFIG.STALE_AFTER_MS || 30000);
    const age = Number.isFinite(timestamp) ? Date.now() - timestamp : Infinity;
    const fresh = age >= -60000 && age <= staleAfter;
    // Older ESP32 firmware uploads only the measurement fields and does not
    // include sensor_status. A fresh, valid reading is itself proof that the
    // device is communicating. Respect an explicit "offline" / "error" value,
    // but do not reject rows merely because sensor_status is absent.
    const hasReportedSensorStatus = row.sensor_status !== null &&
      row.sensor_status !== undefined &&
      String(row.sensor_status).trim() !== "";
    const reportedSensorStatus = hasReportedSensorStatus
      ? String(row.sensor_status).trim().toLowerCase()
      : null;
    const declaredOnline = !hasReportedSensorStatus || reportedSensorStatus === "online";

    waterLevel = Number.isFinite(level) && level >= 0 && level <= 100
      ? level : null;
    distanceCm = Number.isFinite(distance) && distance >= 0 && distance <= 500
      ? distance : null;
    latestReadingAt = Number.isFinite(timestamp) ? timestamp : null;
    sensorOnline = fresh && declaredOnline && waterLevel !== null;

    // Keep connectivity diagnostics in the console; the dashboard stays focused on readings.
    const ageSeconds = Number.isFinite(age) ? Math.round(age / 1000) : "unknown";
    latestOfflineReason = !Number.isFinite(timestamp) ? "invalid created_at timestamp"
      : age < -60000 ? "database timestamp is more than 60s in the future"
      : age > staleAfter ? `latest row is ${ageSeconds}s old (limit ${Math.round(staleAfter / 1000)}s)`
      : !declaredOnline ? `sensor_status is "${reportedSensorStatus}"`
      : waterLevel === null ? `invalid water_level_percent: ${String(row.water_level_percent)}`
      : "none";
    console.info("[CASCADE] Supabase reading diagnostic", {
      deviceId: row.device_id, created_at: row.created_at, ageSeconds,
      staleAfterSeconds: Math.round(staleAfter / 1000),
      sensor_status: row.sensor_status, water_level_percent: row.water_level_percent,
      fresh, declaredOnline, sensorOnline, offlineReason: latestOfflineReason
    });

    const reportedMotorStatus = String(row.motor_status || "unknown").toLowerCase();
    motorStatus = sensorOnline && ["on", "off"].includes(reportedMotorStatus)
      ? reportedMotorStatus : "unknown";

    if (sensorOnline) {
      setConnectionState("live", "DEVICE ONLINE");
      if (previousConnectionState !== "live") addActivity("ESP32 sensor connected. Live readings received.");
      previousConnectionState = "live";
    } else {
      setConnectionState("offline", "DEVICE OFFLINE");
      if (previousConnectionState === "live") addActivity("ESP32 reading is stale or sensor reports offline.");
      previousConnectionState = "offline";
    }
    updateDashboard();
  } catch (error) {
    console.error("Cascade live data error:", error);
    setSensorOffline("Could not reach Supabase. Check internet connection and project URL.", "error", "CONNECTION ERROR");
    previousConnectionState = "error";
  } finally {
    readingRequestInProgress = false;
  }
}

function startLiveData() {
  fetchLatestReading();
  const interval = Math.max(3000, Number(CASCADE_CONFIG.POLL_INTERVAL_MS || 5000));
  window.setInterval(fetchLatestReading, interval);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchLatestReading();
  });
}

/* SAVE HISTORY RECORDS */
const FLUIDOPS_HISTORY_KEY = "fluidops_full_history";
function saveHistoryRecord(type, message, value = null) {
    let records = [];
    try {
        const saved = JSON.parse(
            localStorage.getItem(FLUIDOPS_HISTORY_KEY) || "[]"
        );
        if (Array.isArray(saved)) {
            records = saved;
        }
    } catch (error) {
        console.error("History read error:", error);
    }
    const record = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2),
        type: type,
        message: message,
        value: value,
        timestamp: new Date().toISOString()
    };
    records.unshift(record);
    records = records.slice(0, 2000);
    try {
        localStorage.setItem(
            FLUIDOPS_HISTORY_KEY,
            JSON.stringify(records)
        );
    } catch (error) {
        console.error("History save error:", error);
    }
}
function getHistoryCategory(message) {
    const text = String(message).toLowerCase();
    if (/low-water|alert|warning|cutoff|blocked/.test(text)) {
        return "alert";
    }
    if (text.includes("motor")) {
        return "motor";
    }
    return "system";
}
function addActivity(message) {
  saveHistoryRecord(getHistoryCategory(message), message);
  const list = document.getElementById("activityList");
  const item = document.createElement("li");
  const dot = document.createElement("span");
  dot.className = "activity-dot";
  const text = document.createElement("span");
  text.textContent = message;
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  item.append(dot, text, time);
  // The activity panel may be absent on compact/mobile layouts.
  if (list) {
    list.prepend(item);
    while (list.children.length > 8) list.lastElementChild.remove();
  }
    // Add notification to Notification Center
    const notificationList = document.getElementById("notificationList");
    const notificationCount = document.getElementById("notificationCount");
    if (notificationList && notificationCount) {
        const emptyMessage = notificationList.querySelector(".empty-notifications");
        if (emptyMessage) emptyMessage.remove();
        const notification = document.createElement("li");
        notification.className = "empty-notifications";
        notification.style.cssText = "text-align:left;padding:14px 8px;border-bottom:1px solid var(--line);";
        notification.textContent = message;
        notificationList.prepend(notification);
        const currentCount = Number(notificationCount.textContent) || 0;
        notificationCount.textContent = currentCount + 1;
    }
}

function setupThreeScene() {
  if (!window.THREE) return;
  const host = document.getElementById("tankScene");
  if (!host) return;
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.2, 6.8);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(1, 1);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.72;z-index:6";
    // The handcrafted CSS tank remains the visual fallback and primary illustration.
    // Three.js adds a subtle 3D water-globe accent floating in the scene.
    host.appendChild(renderer.domElement);
    const ambient = new THREE.AmbientLight(0xffffff, 1.8); scene.add(ambient);
    const key = new THREE.PointLight(0x8e7aff, 2.2, 20); key.position.set(2,3,4); scene.add(key);
    const geometry = new THREE.SphereGeometry(.17, 32, 24);
    const material = new THREE.MeshPhysicalMaterial({color:0x8de7ee, metalness:.08, roughness:.12, transmission:.35, transparent:true, opacity:.8});
    const orb = new THREE.Mesh(geometry, material); orb.position.set(-2.15,.2,0); scene.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.28,.008,8,64), new THREE.MeshBasicMaterial({color:0x9b8bff,transparent:true,opacity:.65}));
    ring.position.copy(orb.position); ring.rotation.x = 1.1; scene.add(ring);
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
    };
    resize(); window.addEventListener("resize", resize);
    let t=0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate); t += .012;
      orb.position.y = .2 + Math.sin(t)*.14;
      ring.rotation.z += .004;
      renderer.render(scene,camera);
    };
    animate(); threeReady = true;
  } catch (e) { console.warn("3D accent unavailable; CSS animation fallback active.", e); }
}
function setupMotion() {
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: .12});
    revealItems.forEach(el => observer.observe(el));
  } else revealItems.forEach(el => el.classList.add("visible"));

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".glow-one", {
    y: 350,
    ease: "none",
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
    }
});
gsap.to(".glow-two", {
    y: -250,
    ease: "none",
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
    }
});
    gsap.from(".hero-copy > *", {y:22,opacity:0,duration:.75,stagger:.1,ease:"power2.out",delay:.1});
    gsap.from(".hero-visual", {y:25,opacity:0,duration:1,ease:"power3.out",delay:.25});
  }
  const nav = document.getElementById("mainNav");
  document.getElementById("menuToggle").addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
}
// Restore browser-saved dashboard preferences before rendering the controls.
try {
  const savedPreferences = JSON.parse(localStorage.getItem("cascade-dashboard-settings") || "null");
  if (savedPreferences && typeof savedPreferences === "object") {
    if (Number.isFinite(Number(savedPreferences.cutoffLevel))) cutoffLevel = Number(savedPreferences.cutoffLevel);
    if (Number.isFinite(Number(savedPreferences.lowWaterLevel))) lowWaterLevel = Number(savedPreferences.lowWaterLevel);
    const cutoffInput = document.getElementById("cutoff");
    const lowInput = document.getElementById("lowLevel");
    if (cutoffInput) cutoffInput.value = String(cutoffLevel);
    if (lowInput) lowInput.value = String(lowWaterLevel);
    const cutoffLabel = document.getElementById("cutoffValue");
    const lowLabel = document.getElementById("lowValue");
    if (cutoffLabel) cutoffLabel.textContent = cutoffLevel + "%";
    if (lowLabel) lowLabel.textContent = lowWaterLevel + "%";
  }
} catch (error) {
  console.warn("Could not restore dashboard preferences:", error);
}
updateDashboard();
setupMotion();
setupThreeScene();
startLiveData();
initializeMotorAuth();
// Dark and Light Mode
const themeToggle = document.getElementById("themeToggle");
// Load saved theme
const savedTheme = localStorage.getItem("fluidops-theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
    themeToggle.setAttribute("aria-label", "Switch to light mode");
}
// Toggle theme on click
themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    localStorage.setItem(
        "fluidops-theme",
        isDark ? "dark" : "light"
    );
});
// Notification Panel Controls
(() => {
    const bell = document.getElementById("notificationToggle");
    const panel = document.getElementById("notificationPanel");
    const clearBtn = document.getElementById("clearNotifications");
    const notificationList = document.getElementById("notificationList");
    const count = document.getElementById("notificationCount");
    if (!bell || !panel) return;
    // Keep the notification panel in the viewport, anchored below the sticky header.
    const positionPanel = () => {
        const header = document.querySelector(".site-header");
        const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
        const top = Math.max(12, Math.min(headerBottom + 10, window.innerHeight - 120));
        panel.style.position = "fixed";
        panel.style.top = top + "px";
        panel.style.left = "auto";
        panel.style.right = "12px";
        panel.style.zIndex = "2001";
        panel.style.maxHeight = "calc(100dvh - " + (top + 16) + "px)";
        panel.style.overflowY = "auto";
    };
    bell.addEventListener("click", () => {
        const willOpen = !panel.classList.contains("show");
        if (willOpen) positionPanel();
        panel.classList.toggle("show", willOpen);
        panel.setAttribute("aria-hidden", String(!willOpen));
    });
    window.addEventListener("resize", () => {
        if (panel.classList.contains("show")) positionPanel();
    });
    // Close panel when clicking outside
    document.addEventListener("click", (event) => {
        if (!panel.contains(event.target) && !bell.contains(event.target)) {
            panel.classList.remove("show");
            panel.setAttribute("aria-hidden", "true");
        }
    });
    // Clear all notifications
    clearBtn.addEventListener("click", () => {
        notificationList.innerHTML = `
            <li class="empty-notifications">
                You're all caught up!
            </li>
        `;
        count.textContent = "0";
    });
})();
// Keep the in-page navigation highlight synchronized with the section in view.
(() => {
  const nav = document.querySelector(".site-header .main-nav");
  if (!nav) return;
  const sectionLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = sectionLinks
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = id => {
    sectionLinks.forEach(link => {
      const active = link.getAttribute("href") === "#" + id;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  let ticking = false;
  const updateFromScroll = () => {
    ticking = false;
    const marker = (document.querySelector(".site-header")?.getBoundingClientRect().height || 0) + Math.min(150, window.innerHeight * 0.22);
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) current = section;
      else break;
    }
    setActive(current.id);
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateFromScroll);
  };

  sectionLinks.forEach(link => link.addEventListener("click", () => {
    const id = link.getAttribute("href").slice(1);
    setActive(id);
    nav.classList.remove("open");
  }));
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateFromScroll();
})();


 
// Read-only live context for the website's AI assistant.
window.fetchLatestReading = fetchLatestReading;
window.getCascadeAssistantContext = function () {
  return {
    waterLevelPercent: Number.isFinite(waterLevel) ? waterLevel : null,
    distanceCm: Number.isFinite(distanceCm) ? distanceCm : null,
    sensorOnline: !!sensorOnline,
    motorStatus: sensorOnline ? motorStatus : "unknown",
    lastUpdated: Number.isFinite(latestReadingAt) ? new Date(latestReadingAt).toISOString() : null,
    lowWaterAlertPercent: lowWaterLevel,
    maximumCutoffPercent: cutoffLevel
  };
};
