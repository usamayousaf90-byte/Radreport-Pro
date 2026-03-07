const { isMultiTenantEnabled, query } = require("../lib/db");
const { bad, readJsonBody } = require("../lib/http");
const { requireRole } = require("../lib/session");
const { hashPassword } = require("../lib/password");

var ALLOWED_ROLES = ["organization_admin", "radiologist", "receptionist", "referring_doctor", "super_admin"];

function canManageRole(actorRole, nextRole) {
  if (actorRole === "super_admin") return ALLOWED_ROLES.indexOf(nextRole) !== -1;
  if (actorRole !== "organization_admin") return false;
  return ["radiologist", "receptionist", "referring_doctor"].indexOf(nextRole) !== -1;
}

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
      var params = [targetOrganizationId];
      var sql = "select u.id, u.organization_id, u.username::text as username, u.email::text as email, u.full_name, u.role, u.status, u.created_at, u.updated_at from users u where u.organization_id = $1";
      if (session.user.role === "super_admin" && !queryOrgId) {
        sql = "select u.id, u.organization_id, o.name as organization_name, o.slug::text as organization_slug, u.username::text as username, u.email::text as email, u.full_name, u.role, u.status, u.created_at, u.updated_at from users u join organizations o on o.id = u.organization_id order by o.name asc, u.created_at asc";
        params = [];
      } else {
        sql += " order by u.created_at asc";
      }
      res.status(200).json({ users: await query(sql, params) });
      return;
    }

    var body = await readJsonBody(req);

    if (req.method === "POST") {
      var role = String(body.role || "").trim();
      if (!canManageRole(session.user.role, role)) {
        bad(res, 403, "You cannot create that role");
        return;
      }
      var username = String(body.username || "").trim();
      var password = String(body.password || "").trim();
      if (!username || !password) {
        bad(res, 400, "Username and password are required");
        return;
      }
      var organizationId = session.user.role === "super_admin"
        ? String(body.organization_id || body.organizationId || targetOrganizationId || "").trim()
        : session.organization_id;
      await query(
        "insert into users (organization_id, username, email, full_name, role, password_hash, status) values ($1, $2, $3, $4, $5, $6, $7)",
        [
          organizationId,
          username,
          body.email ? String(body.email).trim() : null,
          String(body.full_name || body.fullName || username).trim(),
          role,
          hashPassword(password),
          String(body.status || "active").trim()
        ]
      );
      res.status(201).json({ ok: true });
      return;
    }

    if (req.method === "PATCH") {
      var userId = String(body.id || body.user_id || body.userId || "").trim();
      if (!userId) {
        bad(res, 400, "User id is required");
        return;
      }
      var rows = await query("select * from users where id = $1 limit 1", [userId]);
      var current = rows[0];
      if (!current) {
        bad(res, 404, "User not found");
        return;
      }
      if (session.user.role !== "super_admin" && current.organization_id !== session.organization_id) {
        bad(res, 403, "Cross-organization access denied");
        return;
      }
      var nextRole = String(body.role || current.role).trim();
      if (!canManageRole(session.user.role, nextRole) && !(session.user.role === "super_admin" && nextRole === "super_admin")) {
        bad(res, 403, "You cannot assign that role");
        return;
      }
      var nextPasswordHash = body.password ? hashPassword(body.password) : current.password_hash;
      await query(
        "update users set email = $2, full_name = $3, role = $4, status = $5, password_hash = $6, updated_at = now() where id = $1",
        [
          userId,
          body.email != null ? String(body.email).trim() || null : current.email,
          String(body.full_name || body.fullName || current.full_name || "").trim(),
          nextRole,
          String(body.status || current.status).trim(),
          nextPasswordHash
        ]
      );
      res.status(200).json({ ok: true });
      return;
    }

    bad(res, 405, "Method not allowed");
  } catch (err) {
    bad(res, 500, err && err.message ? err.message : "User request failed");
  }
};
