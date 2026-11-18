const ALLOWED_ORIGIN = "https://inversedev.github.io";
const SYSTEM_PROMPT = `You are Cascade Assistant, a conversational assistant embedded in the Cascade smart water monitoring website.
Help users understand and operate the actual website: Dashboard, Alarm Centre, History & Reports, theme, browser notifications, dashboard preferences, scheduled alarms, history filters/export, and pump controls.
Keep conversational context. A short follow-up such as "10%", "tomorrow", "yes", "no", or "at 7:30" may answer a question you asked in the previous turn. Interpret it using the recent conversation instead of treating it as a new unrelated request. If required information is missing, ask one focused follow-up question.
Be concise, natural, and honest. Do not say you can only discuss the website; help with all Cascade site features.
Project facts and limitations:
- An ultrasonic sensor measures water distance; the ESP32 reports readings to Supabase.
- Dashboard low-water and cutoff preferences are saved in this browser's localStorage. They do not update ESP32 firmware or enable device-side automation.
- Pump commands require owner sign-in, a fresh sensor reading, and a connected device. Never claim a pump command succeeded without actual device feedback.
- Scheduled alarms, alert preferences, theme and history are stored locally in this browser.
- Do not claim an action was performed unless the website confirms it. Ask for confirmation before destructive actions or physical pump commands.
- If an action cannot be performed on the current page, explain which page is needed or navigate the user there when possible.`;
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
      const reply = data.output_text || (data.steps || []).filter(step => step.type === "model_output").flatMap(step => step.content || []).map(part => part.text || "").join("\n").trim();
      return Response.json({ reply: reply || "I couldn't form a response. Please try again." }, { headers: { ...cors, "Cache-Control": "no-store" } });
    } catch (error) {
      return Response.json({ error: "Assistant request failed.", detail: String(error) }, { status: 500, headers: cors });
    }
  }
};
