const { isMultiTenantEnabled } = require("../../lib/db");
const { bad } = require("../../lib/http");
const { destroySession } = require("../../lib/session");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    bad(res, 405, "Method not allowed");
    return;
  }

  if (!isMultiTenantEnabled()) {
    bad(res, 503, "Multi-tenant mode is disabled");
    return;
  }

  try {
    await destroySession(req, res);
    res.status(200).json({ ok: true });
  } catch (err) {
    bad(res, 500, err && err.message ? err.message : "Logout failed");
  }
};
