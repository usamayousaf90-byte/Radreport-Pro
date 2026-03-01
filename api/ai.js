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
    const payload = req.body || {};
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
      })
    });

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
