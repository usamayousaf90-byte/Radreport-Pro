function bad(res, code, msg) {
  res.status(code).json({ error: { message: msg } });
}

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

module.exports = {
  bad,
  readJsonBody
};
