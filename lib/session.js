const { createHash, randomBytes } = require("node:crypto");
const { parseCookies, serializeCookie } = require("./cookies");
const { bad } = require("./http");
const { isMultiTenantEnabled, query } = require("./db");

var COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "rrp_session";
var SESSION_TTL_DAYS = 14;

function hashToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

function isSecureRequest(req) {
  var proto = req && req.headers ? req.headers["x-forwarded-proto"] : "";
  return process.env.NODE_ENV === "production" || String(proto || "").toLowerCase() === "https";
}

function setSessionCookie(res, token, expiresAt, req) {
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    expires: expiresAt
  }));
}

function clearSessionCookie(res, req) {
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    expires: new Date(0)
  }));
}

function serializeSessionUser(row) {
  return {
    id: row.user_id,
    username: row.username,
    email: row.email || "",
    full_name: row.full_name || "",
    role: row.role,
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      slug: row.organization_slug,
      subdomain: row.organization_subdomain || "",
      status: row.organization_status
    }
  };
}

async function createSession(res, userRow, req) {
  var token = randomBytes(32).toString("hex");
  var expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "insert into sessions (organization_id, user_id, token_hash, expires_at, ip_address, user_agent) values ($1, $2, $3, $4, $5, $6)",
    [
      userRow.organization_id,
      userRow.user_id,
      hashToken(token),
      expiresAt.toISOString(),
      (req && req.headers && (req.headers["x-forwarded-for"] || req.socket && req.socket.remoteAddress)) || "",
      (req && req.headers && req.headers["user-agent"]) || ""
    ]
  );
  setSessionCookie(res, token, expiresAt, req);
  return { token: token, expires_at: expiresAt.toISOString() };
}

async function readSession(req) {
  if (!isMultiTenantEnabled()) return null;
  var cookies = parseCookies(req && req.headers ? req.headers.cookie : "");
  var token = cookies[COOKIE_NAME];
  if (!token) return null;

  var rows = await query(
    "select s.id as session_id, s.expires_at, u.id as user_id, u.organization_id, u.username, u.email, u.full_name, u.role, u.status as user_status, o.name as organization_name, o.slug as organization_slug, o.subdomain as organization_subdomain, o.status as organization_status from sessions s join users u on u.id = s.user_id join organizations o on o.id = s.organization_id where s.token_hash = $1 and s.expires_at > now() limit 1",
    [hashToken(token)]
  );
  var row = rows[0];
  if (!row) return null;
  if (row.user_status !== "active" || row.organization_status !== "active") return null;

  await query("update sessions set last_seen_at = now() where id = $1", [row.session_id]);
  return {
    session_id: row.session_id,
    organization_id: row.organization_id,
    user: serializeSessionUser(row)
  };
}

async function destroySession(req, res) {
  if (!isMultiTenantEnabled()) {
    clearSessionCookie(res, req);
    return;
  }
  var cookies = parseCookies(req && req.headers ? req.headers.cookie : "");
  var token = cookies[COOKIE_NAME];
  if (token) {
    await query("delete from sessions where token_hash = $1", [hashToken(token)]);
  }
  clearSessionCookie(res, req);
}

async function requireSession(req, res) {
  var session = await readSession(req);
  if (!session) {
    bad(res, 401, "Authentication required");
    return null;
  }
  return session;
}

async function requireRole(req, res, allowedRoles) {
  var session = await requireSession(req, res);
  if (!session) return null;
  var roles = Array.isArray(allowedRoles) ? allowedRoles : [];
  if (!roles.length || roles.indexOf(session.user.role) !== -1) return session;
  bad(res, 403, "Insufficient permissions");
  return null;
}

module.exports = {
  createSession,
  destroySession,
  readSession,
  requireRole,
  requireSession,
  serializeSessionUser
};
