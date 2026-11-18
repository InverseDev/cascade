const ALLOWED_ORIGIN = "https://inversedev.github.io";
const SYSTEM_PROMPT = `You are Cascade Assistant, the support chatbot for the Cascade smart water monitoring website.
Answer only about Cascade, its features, water-level monitoring, ultrasonic sensing, ESP32, pump management, alerts, dashboard and site navigation. Be friendly, concise and honest.
Important project facts:
- An ultrasonic sensor measures distance to the water surface; the ESP32 processes and reports readings to Supabase.
- The dashboard displays tank percentage, distance, reported pump state, a configurable cutoff preference and a low-water alert preference.
- Pump commands require owner sign-in and a connected ESP32.
- The website currently saves cutoff and low-water alert settings in the visitor's browser localStorage. Changing a website preference does NOT update ESP32 firmware or device-side automation.
- Do not claim to control hardware, change remote settings, access live readings, or save anything unless an authenticated backend tool actually reports success.
- If asked to change a setting, explain that the website can currently save a local browser preference only; direct ESP32 configuration is not connected yet.`;
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (origin !== ALLOWED_ORIGIN) return new Response("Forbidden", { status: 403, headers: cors });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
    if (!env.GEMINI_API_KEY) return Response.json({ error: "Missing GEMINI_API_KEY secret." }, { status: 503, headers: cors });
    try {
      const body = await request.json();
      const message = String(body.message || "").trim().slice(0, 1000);
      const history = String(body.history || "").slice(-6000);
      if (!message) return Response.json({ error: "Message is required." }, { status: 400, headers: cors });
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: SYSTEM_PROMPT + "\n\nRecent conversation:\n" + history + "\n\nVisitor's latest message: " + message
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) return Response.json({ error: "Gemini request failed.", detail: data.error?.message || "Unknown API error." }, { status: 502, headers: cors });
      const reply = data.output_text || (data.output || []).map(item => item.text || item.content?.map(part => part.text || "").join("")).join("\n").trim();
      return Response.json({ reply: reply || "I couldn't form a response. Please try again." }, { headers: { ...cors, "Cache-Control": "no-store" } });
    } catch (error) {
      return Response.json({ error: "Assistant request failed.", detail: String(error) }, { status: 500, headers: cors });
    }
  }
};
