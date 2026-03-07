const { isMultiTenantEnabled, query } = require("../../lib/db");
const { bad, readJsonBody } = require("../../lib/http");
const { createSession, serializeSessionUser } = require("../../lib/session");
const { verifyPassword } = require("../../lib/password");
const { resolveRequestedOrganizationSlug } = require("../../lib/tenant");

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
    var body = await readJsonBody(req);
    var identifier = String(body.username || body.email || "").trim();
    var password = String(body.password || "").trim();
    var requestedSlug = resolveRequestedOrganizationSlug(
      req,
      body.organization_slug || body.organizationSlug || body.slug || body.organization
    );

    if (!identifier || !password) {
      bad(res, 400, "Username and password are required");
      return;
    }

    var rows;
    if (requestedSlug) {
      rows = await query(
        "select u.id as user_id, u.organization_id, u.username::text as username, u.email::text as email, u.full_name, u.role, u.status as user_status, u.password_hash, o.name as organization_name, o.slug::text as organization_slug, o.subdomain::text as organization_subdomain, o.status as organization_status from users u join organizations o on o.id = u.organization_id where o.slug = $1 and (u.username = $2 or coalesce(u.email, ''::citext) = $2) limit 1",
        [requestedSlug, identifier]
      );
    } else {
      rows = await query(
        "select u.id as user_id, u.organization_id, u.username::text as username, u.email::text as email, u.full_name, u.role, u.status as user_status, u.password_hash, o.name as organization_name, o.slug::text as organization_slug, o.subdomain::text as organization_subdomain, o.status as organization_status from users u join organizations o on o.id = u.organization_id where u.role = 'super_admin' and (u.username = $1 or coalesce(u.email, ''::citext) = $1) limit 1",
        [identifier]
      );
    }

    var row = rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) {
      bad(res, 401, "Invalid credentials");
      return;
    }
    if (row.user_status !== "active" || row.organization_status !== "active") {
      bad(res, 403, "Account is disabled");
      return;
    }

    await createSession(res, row, req);
    res.status(200).json({
      ok: true,
      user: serializeSessionUser(row)
    });
  } catch (err) {
    bad(res, 500, err && err.message ? err.message : "Login failed");
  }
};
