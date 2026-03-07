const { isMultiTenantEnabled, query, withTransaction } = require("../lib/db");
const { bad, readJsonBody } = require("../lib/http");
const { requireRole } = require("../lib/session");
const { hashPassword } = require("../lib/password");
const { normalizeOrganizationSlug } = require("../lib/tenant");

async function listOrganizations() {
  return query(
    "select o.id, o.name, o.slug::text as slug, o.subdomain::text as subdomain, o.status, o.created_at, o.updated_at, s.clinic_name, s.logo_url, s.phone, s.address, (select count(*)::int from users u where u.organization_id = o.id) as user_count from organizations o left join organization_settings s on s.organization_id = o.id order by o.created_at asc"
  );
}

module.exports = async function handler(req, res) {
  if (!isMultiTenantEnabled()) {
    bad(res, 503, "Multi-tenant mode is disabled");
    return;
  }

  try {
    var session = await requireRole(req, res, ["super_admin"]);
    if (!session) return;

    if (req.method === "GET") {
      res.status(200).json({ organizations: await listOrganizations() });
      return;
    }

    if (req.method === "POST") {
      var body = await readJsonBody(req);
      var name = String(body.name || "").trim();
      var slug = normalizeOrganizationSlug(body.slug || name);
      var subdomain = normalizeOrganizationSlug(body.subdomain || slug);
      var clinicName = String(body.clinic_name || body.clinicName || name).trim();
      var phone = String(body.phone || "").trim();
      var address = String(body.address || "").trim();
      var logoUrl = String(body.logo_url || body.logoUrl || "").trim();
      var adminUser = body.admin_user || body.adminUser || null;

      if (!name || !slug) {
        bad(res, 400, "Organization name and slug are required");
        return;
      }

      var created = await withTransaction(async function(client) {
        var orgResult = await client.query(
          "insert into organizations (name, slug, subdomain, status) values ($1, $2, $3, 'active') returning id, name, slug::text as slug, subdomain::text as subdomain, status, created_at, updated_at",
          [name, slug, subdomain || null]
        );
        var org = orgResult.rows[0];
        await client.query(
          "insert into organization_settings (organization_id, clinic_name, logo_url, phone, address) values ($1, $2, $3, $4, $5)",
          [org.id, clinicName, logoUrl, phone, address]
        );
        if (adminUser && adminUser.username && adminUser.password) {
          await client.query(
            "insert into users (organization_id, username, email, full_name, role, password_hash) values ($1, $2, $3, $4, 'organization_admin', $5)",
            [
              org.id,
              String(adminUser.username || "").trim(),
              adminUser.email ? String(adminUser.email).trim() : null,
              String(adminUser.full_name || adminUser.fullName || adminUser.username || "").trim(),
              hashPassword(adminUser.password)
            ]
          );
        }
        return org;
      });

      res.status(201).json({ ok: true, organization: created });
      return;
    }

    if (req.method === "PATCH") {
      var patch = await readJsonBody(req);
      var organizationId = String(patch.id || patch.organization_id || patch.organizationId || "").trim();
      if (!organizationId) {
        bad(res, 400, "Organization id is required");
        return;
      }

      var currentRows = await query("select id, name, slug::text as slug, subdomain::text as subdomain, status from organizations where id = $1 limit 1", [organizationId]);
      if (!currentRows[0]) {
        bad(res, 404, "Organization not found");
        return;
      }
      var current = currentRows[0];
      var nextName = String(patch.name || current.name).trim();
      var nextSlug = normalizeOrganizationSlug(patch.slug || current.slug);
      var nextSubdomain = normalizeOrganizationSlug(patch.subdomain || current.subdomain || "");
      var nextStatus = String(patch.status || current.status).trim() || current.status;

      await withTransaction(async function(client) {
        await client.query(
          "update organizations set name = $2, slug = $3, subdomain = $4, status = $5, updated_at = now() where id = $1",
          [organizationId, nextName, nextSlug, nextSubdomain || null, nextStatus]
        );
        if (patch.clinic_name || patch.clinicName || patch.phone || patch.address || patch.logo_url || patch.logoUrl) {
          await client.query(
            "insert into organization_settings (organization_id, clinic_name, logo_url, phone, address) values ($1, $2, $3, $4, $5) on conflict (organization_id) do update set clinic_name = excluded.clinic_name, logo_url = excluded.logo_url, phone = excluded.phone, address = excluded.address, updated_at = now()",
            [
              organizationId,
              String(patch.clinic_name || patch.clinicName || nextName).trim(),
              String(patch.logo_url || patch.logoUrl || "").trim(),
              String(patch.phone || "").trim(),
              String(patch.address || "").trim()
            ]
          );
        }
      });

      res.status(200).json({ ok: true, organizations: await listOrganizations() });
      return;
    }

    bad(res, 405, "Method not allowed");
  } catch (err) {
    bad(res, 500, err && err.message ? err.message : "Organization request failed");
  }
};
