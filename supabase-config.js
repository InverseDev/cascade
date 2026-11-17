/*
 * Cascade browser configuration.
 * Use only the Supabase Publishable key (sb_publishable_...) or legacy anon key.
 * NEVER put service_role / secret keys or DEVICE_API_TOKEN in this file.
 */
window.CASCADE_CONFIG = Object.freeze({
  SUPABASE_URL: "https://wdsoitnevgqvwlxrjhwz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_pLXM8xn90ZoxCCGQdXIhrg_TH6x1V-A",
  DEVICE_ID: "cascade-esp32-01",
  SENSOR_TABLE: "sensor_readings",
  POLL_INTERVAL_MS: 5000,
  STALE_AFTER_MS: 30000
});


