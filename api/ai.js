async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }

  var chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};

  var raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: "Server missing ANTHROPIC_API_KEY" } });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 30000);
    var response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: payload.system || "",
          messages: Array.isArray(payload.messages) ? payload.messages : []
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(function() { return {}; });
    if (!response.ok) {
      const msg = (data && data.error && data.error.message) || ("HTTP " + response.status);
      res.status(response.status).json({ error: { message: msg } });
      return;
    }

    const text = (data.content || [])
      .map(function(block) { return block && block.text ? block.text : ""; })
      .join("")
      .trim();

    res.status(200).json({ text: text });
  } catch (err) {
    res.status(500).json({ error: { message: err && err.message ? err.message : "Unexpected server error" } });
  }
};
