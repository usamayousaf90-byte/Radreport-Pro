function parseCookies(header) {
  var raw = String(header || "").trim();
  if (!raw) return {};
  return raw.split(";").reduce(function(acc, pair) {
    var idx = pair.indexOf("=");
    if (idx === -1) return acc;
    var key = pair.slice(0, idx).trim();
    var value = pair.slice(idx + 1).trim();
    if (!key) return acc;
    try {
      acc[key] = decodeURIComponent(value);
    } catch (e) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function serializeCookie(name, value, options) {
  var opts = options || {};
  var parts = [name + "=" + encodeURIComponent(String(value || ""))];
  parts.push("Path=" + (opts.path || "/"));
  if (opts.domain) parts.push("Domain=" + opts.domain);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.sameSite) parts.push("SameSite=" + opts.sameSite);
  if (opts.secure) parts.push("Secure");
  if (opts.maxAge != null) parts.push("Max-Age=" + String(opts.maxAge));
  if (opts.expires) parts.push("Expires=" + new Date(opts.expires).toUTCString());
  return parts.join("; ");
}

module.exports = {
  parseCookies,
  serializeCookie
};
