const { isMultiTenantEnabled } = require("../../lib/db");
const { bad } = require("../../lib/http");
const { requireSession } = require("../../lib/session");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    bad(res, 405, "Method not allowed");
    return;
  }

  if (!isMultiTenantEnabled()) {
    bad(res, 503, "Multi-tenant mode is disabled");
    return;
  }

  try {
    var session = await requireSession(req, res);
    if (!session) return;
    res.status(200).json({ ok: true, session: session });
  } catch (err) {
    bad(res, 500, err && err.message ? err.message : "Session lookup failed");
  }
};
