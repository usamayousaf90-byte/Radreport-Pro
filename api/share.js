const { randomBytes } = require("node:crypto");

function bad(res, code, msg) {
  res.status(code).json({ error: { message: msg } });
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

async function kvCmd(cmd) {
  var base = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) throw new Error("Cloud share portal not configured (KV env vars missing)");

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

async function loadSharedPayload(token) {
  if (!token) return null;
  var raw = await kvCmd(["GET", "rrp:share:" + token]);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

async function loadPortalPayload(username) {
  if (!username) return null;
  var raw = await kvCmd(["GET", "rrp:portal:" + username]);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

function normalizePortalUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "");
}

function getReportPortalCredentials(report) {
  var patient = report && report.patient && typeof report.patient === "object" ? report.patient : {};
  return {
    username: normalizePortalUsername(patient.portalUsername || ""),
    password: String(patient.portalPassword || "").trim()
  };
}

function isExpired(expiresAt) {
  return !!(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

function buildPortalReportSummary(payload) {
  var report = payload && payload.report && typeof payload.report === "object" ? payload.report : {};
  var patient = report.patient && typeof report.patient === "object" ? report.patient : {};
  return {
    token: payload.token,
    id: report.id || "",
    label: report.label || patient.name || "",
    modality: report.modality || "",
    region: report.region || "",
    urgency: report.urgency || "Routine",
    studyDate: patient.studyDate || "",
    mrno: patient.mrno || "",
    finalizedAt: report.finalizedAt || "",
    expiresAt: payload.expiresAt || "",
    updatedAt: payload.updatedAt || payload.createdAt || ""
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      var token = String((req.query && req.query.token) || "").trim();
      if (!token) return bad(res, 400, "Missing share token");
      var payload = await loadSharedPayload(token);
      if (!payload || !payload.report) return bad(res, 404, "Shared report not found");
      if (isExpired(payload.expiresAt)) {
        return bad(res, 410, "Shared report link has expired");
      }
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        ok: true,
        token: payload.token || token,
        expiresAt: payload.expiresAt || "",
        createdAt: payload.createdAt || "",
        updatedAt: payload.updatedAt || "",
        requiresAuth: true
      });
    }

    if (req.method === "POST") {
      var postBody = readBody(req);
      var action = String(postBody.action || "").trim();

      if (action === "authenticate") {
        var authToken = String(postBody.token || "").trim();
        var authUsername = normalizePortalUsername(postBody.username || "");
        var authPassword = String(postBody.password || "").trim();
        if (!authToken) return bad(res, 400, "Missing share token");
        if (!authUsername || !authPassword) return bad(res, 400, "Portal username and password are required");
        var authPayload = await loadSharedPayload(authToken);
        if (!authPayload || !authPayload.report) return bad(res, 404, "Shared report not found");
        if (isExpired(authPayload.expiresAt)) return bad(res, 410, "Shared report link has expired");
        var authCreds = getReportPortalCredentials(authPayload.report);
        if (!authCreds.username || !authCreds.password) return bad(res, 403, "Portal credentials are not configured for this patient");
        if (authCreds.username !== authUsername || authCreds.password !== authPassword) return bad(res, 401, "Invalid portal username or password");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({
          ok: true,
          token: authPayload.token || authToken,
          expiresAt: authPayload.expiresAt || "",
          report: authPayload.report
        });
      }

      if (action === "portalLogin") {
        var portalUsername = normalizePortalUsername(postBody.username || "");
        var portalPassword = String(postBody.password || "").trim();
        if (!portalUsername || !portalPassword) return bad(res, 400, "Portal username and password are required");
        var portalPayload = await loadPortalPayload(portalUsername);
        if (!portalPayload) return bad(res, 404, "Patient portal was not found");
        if (String(portalPayload.password || "").trim() !== portalPassword) return bad(res, 401, "Invalid portal username or password");
        var reports = Array.isArray(portalPayload.reports) ? portalPayload.reports : [];
        reports = reports.filter(function(entry) {
          return entry && entry.token && !isExpired(entry.expiresAt);
        }).sort(function(a, b) {
          return String(b && (b.finalizedAt || b.updatedAt) || "").localeCompare(String(a && (a.finalizedAt || a.updatedAt) || ""));
        });
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({
          ok: true,
          portal: {
            username: portalPayload.username || portalUsername,
            patient: portalPayload.patient || null,
            reports: reports
          }
        });
      }

      return bad(res, 400, "Unsupported share action");
    }

    if (req.method === "PUT") {
      var body = readBody(req);
      var owner = String(body.owner || "").trim().toLowerCase();
      var report = body.report && typeof body.report === "object" ? body.report : null;
      var origin = String(body.origin || "").trim().replace(/\/+$/g, "");
      var requestedToken = String(body.token || "").trim();
      if (!report) return bad(res, 400, "Missing report payload");
      var portalCreds = getReportPortalCredentials(report);
      if (!portalCreds.username || !portalCreds.password) return bad(res, 400, "Patient portal username/password are required before sharing");

      var token = requestedToken || randomBytes(18).toString("hex");
      var existing = requestedToken ? await loadSharedPayload(requestedToken) : null;
      var now = new Date().toISOString();
      var expiresAt = existing && existing.expiresAt
        ? existing.expiresAt
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      var payload = {
        token: token,
        owner: owner,
        createdAt: existing && existing.createdAt ? existing.createdAt : now,
        updatedAt: now,
        expiresAt: expiresAt,
        report: report
      };
      await kvCmd(["SET", "rrp:share:" + token, JSON.stringify(payload)]);

      var existingPortal = await loadPortalPayload(portalCreds.username);
      var existingReports = Array.isArray(existingPortal && existingPortal.reports) ? existingPortal.reports : [];
      var portalReport = buildPortalReportSummary(payload);
      var nextReports = existingReports.filter(function(entry) {
        return entry && entry.token && entry.token !== token;
      });
      nextReports.unshift(portalReport);
      var portalPayload = {
        username: portalCreds.username,
        password: portalCreds.password,
        createdAt: existingPortal && existingPortal.createdAt ? existingPortal.createdAt : now,
        updatedAt: now,
        patient: {
          name: report.patient && report.patient.name || "",
          fatherName: report.patient && report.patient.fatherName || "",
          age: report.patient && report.patient.age || "",
          cell: report.patient && report.patient.cell || "",
          mrno: report.patient && report.patient.mrno || ""
        },
        reports: nextReports
      };
      await kvCmd(["SET", "rrp:portal:" + portalCreds.username, JSON.stringify(portalPayload)]);

      return res.status(200).json({
        ok: true,
        token: token,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        expiresAt: payload.expiresAt,
        url: origin ? (origin + "/?share=" + encodeURIComponent(token)) : ""
      });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Share portal failed");
  }
};
