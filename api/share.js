const { randomBytes } = require("node:crypto");

function bad(res, code, msg) {
  res.status(code).json({ error: { message: msg } });
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

async function kvCmd(cmd) {
  var base = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) throw new Error("Cloud share portal not configured (KV env vars missing)");

  var res = await fetch(base + "/pipeline", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([cmd])
  });
  var data = await res.json().catch(function() { return []; });
  if (!res.ok) throw new Error("KV HTTP " + res.status);
  if (!Array.isArray(data) || !data.length) return null;
  if (data[0] && data[0].error) throw new Error(String(data[0].error));
  return data[0] ? data[0].result : null;
}

async function loadSharedPayload(token) {
  if (!token) return null;
  var raw = await kvCmd(["GET", "rrp:share:" + token]);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      var token = String((req.query && req.query.token) || "").trim();
      if (!token) return bad(res, 400, "Missing share token");
      var payload = await loadSharedPayload(token);
      if (!payload || !payload.report) return bad(res, 404, "Shared report not found");
      if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
        return bad(res, 410, "Shared report link has expired");
      }
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(payload);
    }

    if (req.method === "PUT") {
      var body = readBody(req);
      var owner = String(body.owner || "").trim().toLowerCase();
      var report = body.report && typeof body.report === "object" ? body.report : null;
      var origin = String(body.origin || "").trim().replace(/\/+$/g, "");
      var requestedToken = String(body.token || "").trim();
      if (!report) return bad(res, 400, "Missing report payload");

      var token = requestedToken || randomBytes(18).toString("hex");
      var existing = requestedToken ? await loadSharedPayload(requestedToken) : null;
      var now = new Date().toISOString();
      var expiresAt = existing && existing.expiresAt
        ? existing.expiresAt
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      var payload = {
        token: token,
        owner: owner,
        createdAt: existing && existing.createdAt ? existing.createdAt : now,
        updatedAt: now,
        expiresAt: expiresAt,
        report: report
      };
      await kvCmd(["SET", "rrp:share:" + token, JSON.stringify(payload)]);
      return res.status(200).json({
        ok: true,
        token: token,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        expiresAt: payload.expiresAt,
        url: origin ? (origin + "/?share=" + encodeURIComponent(token)) : ""
      });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Share portal failed");
  }
};
