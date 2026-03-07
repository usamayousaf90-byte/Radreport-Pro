function getRequestHost(req) {
  var forwarded = req && req.headers ? req.headers["x-forwarded-host"] : "";
  var host = forwarded || (req && req.headers ? req.headers.host : "") || "";
  return String(host).split(",")[0].trim().toLowerCase();
}

function normalizeOrganizationSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveRequestedOrganizationSlug(req, explicitValue) {
  var explicit = normalizeOrganizationSlug(explicitValue);
  if (explicit) return explicit;

  var host = getRequestHost(req);
  var baseDomain = String(process.env.APP_BASE_DOMAIN || "").trim().toLowerCase();
  if (!host || !baseDomain) return "";
  if (!host.endsWith("." + baseDomain)) return "";

  var subdomain = host.slice(0, -(baseDomain.length + 1));
  if (!subdomain || subdomain === "www" || subdomain === "app") return "";
  return normalizeOrganizationSlug(subdomain);
}

module.exports = {
  getRequestHost,
  normalizeOrganizationSlug,
  resolveRequestedOrganizationSlug
};
