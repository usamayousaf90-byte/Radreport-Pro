const { isMultiTenantEnabled, query } = require("../lib/db");
const { bad, readJsonBody } = require("../lib/http");
const { requireRole } = require("../lib/session");

module.exports = async function handler(req, res) {
  if (!isMultiTenantEnabled()) {
    bad(res, 503, "Multi-tenant mode is disabled");
    return;
  }

  try {
    var session = await requireRole(req, res, ["super_admin", "organization_admin"]);
    if (!session) return;
    var queryOrgId = String((req.query && (req.query.organization_id || req.query.organizationId)) || "").trim();
    var targetOrganizationId = session.user.role === "super_admin" ? (queryOrgId || session.organization_id) : session.organization_id;

    if (req.method === "GET") {
      var rows = await query(
        "select o.id, o.name, o.slug::text as slug, o.subdomain::text as subdomain, s.clinic_name, s.logo_url, s.phone, s.address from organizations o left join organization_settings s on s.organization_id = o.id where o.id = $1 limit 1",
        [targetOrganizationId]
      );
      if (!rows[0]) {
        bad(res, 404, "Organization settings not found");
        return;
      }
      res.status(200).json({ settings: rows[0] });
      return;
    }

    if (req.method === "PUT") {
      var body = await readJsonBody(req);
      await query(
        "insert into organization_settings (organization_id, clinic_name, logo_url, phone, address) values ($1, $2, $3, $4, $5) on conflict (organization_id) do update set clinic_name = excluded.clinic_name, logo_url = excluded.logo_url, phone = excluded.phone, address = excluded.address, updated_at = now()",
        [
          targetOrganizationId,
          String(body.clinic_name || body.clinicName || "").trim(),
          String(body.logo_url || body.logoUrl || "").trim(),
          String(body.phone || "").trim(),
          String(body.address || "").trim()
        ]
      );
      res.status(200).json({ ok: true });
      return;
    }

    bad(res, 405, "Method not allowed");
  } catch (err) {
    bad(res, 500, err && err.message ? err.message : "Settings request failed");
  }
};
