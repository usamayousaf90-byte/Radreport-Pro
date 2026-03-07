const { isMultiTenantEnabled } = require("../lib/db");
const { bad, readJsonBody } = require("../lib/http");
const { requireRole } = require("../lib/session");
const { listFinalizedReports, replaceFinalizedReports } = require("../lib/multiTenantStore");

async function kvCmd(cmd) {
  var base = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) throw new Error("Cloud records not configured (KV env vars missing)");

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

module.exports = async function handler(req, res) {
  try {
    if (isMultiTenantEnabled()) {
      var session = await requireRole(req, res, ["super_admin", "organization_admin", "radiologist", "receptionist", "referring_doctor"]);
      if (!session) return;

      if (req.method === "GET") {
        return res.status(200).json({ records: await listFinalizedReports(session.organization_id) });
      }

      if (req.method === "PUT") {
        if (session.user.role === "referring_doctor") {
          return bad(res, 403, "Referring doctors cannot modify records");
        }
        var tenantBody = await readJsonBody(req);
        var records = Array.isArray(tenantBody.records) ? tenantBody.records : [];
        await replaceFinalizedReports(session.organization_id, session.user.id, records);
        return res.status(200).json({ ok: true });
      }

      return bad(res, 405, "Method not allowed");
    }

    if (req.method === "GET") {
      var user = String((req.query && req.query.user) || "").trim().toLowerCase();
      if (!user) return bad(res, 400, "Missing user");
      var raw = await kvCmd(["GET", "rrp:records:" + user]);
      if (!raw) return res.status(200).json({ records: [] });
      var parsed = [];
      try { parsed = JSON.parse(raw); } catch (e) { parsed = []; }
      return res.status(200).json({ records: Array.isArray(parsed) ? parsed : [] });
    }

    if (req.method === "PUT") {
      var body = await readJsonBody(req);
      var userId = String(body.user || "").trim().toLowerCase();
      var legacyRecords = Array.isArray(body.records) ? body.records : [];
      if (!userId) return bad(res, 400, "Missing user");
      await kvCmd(["SET", "rrp:records:" + userId, JSON.stringify(legacyRecords)]);
      return res.status(200).json({ ok: true });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Record sync failed");
  }
};
