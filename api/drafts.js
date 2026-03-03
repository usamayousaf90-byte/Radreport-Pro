function bad(res, code, msg) {
  res.status(code).json({ error: { message: msg } });
}

async function kv(path, body) {
  var base = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) throw new Error("Cloud drafts not configured (KV env vars missing)");
  var res = await fetch(base + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : "{}"
  });
  var data = await res.json().catch(function() { return {}; });
  if (!res.ok) throw new Error((data && data.error) || ("KV HTTP " + res.status));
  return data;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      var user = String((req.query && req.query.user) || "").trim().toLowerCase();
      if (!user) return bad(res, 400, "Missing user");
      var getResp = await kv("/get/" + encodeURIComponent("rrp:drafts:" + user));
      var value = getResp && getResp.result ? getResp.result : [];
      return res.status(200).json({ reports: Array.isArray(value) ? value : [] });
    }

    if (req.method === "PUT") {
      var body = req.body && typeof req.body === "object" ? req.body : {};
      var u = String(body.user || "").trim().toLowerCase();
      var reports = Array.isArray(body.reports) ? body.reports : [];
      if (!u) return bad(res, 400, "Missing user");
      await kv("/set/" + encodeURIComponent("rrp:drafts:" + u), [reports]);
      return res.status(200).json({ ok: true });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Draft sync failed");
  }
};
