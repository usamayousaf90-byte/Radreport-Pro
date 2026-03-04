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

async function kvPipeline(commands) {
  var base = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) throw new Error("Cloud storage not configured (KV env vars missing)");

  var res = await fetch(base + "/pipeline", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands)
  });

  var data = await res.json().catch(function() { return []; });
  if (!res.ok) throw new Error("KV HTTP " + res.status);
  if (!Array.isArray(data)) return [];

  return data.map(function(item) {
    if (item && item.error) throw new Error(String(item.error));
    return item ? item.result : null;
  });
}

function parseArrayJson(value) {
  if (!value) return [];
  try {
    var out = JSON.parse(value);
    return Array.isArray(out) ? out : [];
  } catch (e) {
    return [];
  }
}

function sanitizeText(v, maxLen) {
  var t = String(v == null ? "" : v).trim();
  if (!maxLen) return t;
  return t.slice(0, maxLen);
}

function normalizePhone(v) {
  return String(v || "").replace(/[^0-9+]/g, "");
}

function toMapBy(arr, key) {
  var map = {};
  for (var i = 0; i < arr.length; i += 1) {
    var row = arr[i] || {};
    var k = row[key];
    if (k != null && k !== "") map[String(k)] = row;
  }
  return map;
}

function looksLikeImage(type, name) {
  var t = String(type || "").toLowerCase();
  var n = String(name || "").toLowerCase();
  return t.indexOf("image/") === 0 || /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|dcm)$/i.test(n);
}

function asPortalReport(report, patient, entry) {
  var files = (entry && Array.isArray(entry.files)) ? entry.files : [];
  var imageFiles = files.filter(function(f) {
    return looksLikeImage(f && f.type, f && f.name);
  });

  var findings = String(report.findings || "");
  var preview = findings.slice(0, 220);
  if (findings.length > 220) preview += "...";

  return {
    reportId: report.reportId || "",
    publicReportId: report.publicReportId || "",
    queueId: report.queueId || "",
    patientId: report.patientId || "",
    patientName: (patient && patient.name) || "",
    phone: (patient && patient.phone) || "",
    modality: report.modality || "",
    status: report.status || "",
    signedBy: report.signedBy || "",
    signedAt: report.signedAt || "",
    finalizedAt: report.finalizedAt || "",
    findingsPreview: preview,
    imageFiles: imageFiles,
    filesCount: files.length,
    imageCount: imageFiles.length,
    portalPath: "/report/" + encodeURIComponent(report.publicReportId || report.reportId || ""),
    hasPin: !!report.accessPin
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return bad(res, 405, "Method not allowed");

  try {
    var body = readBody(req);
    var action = sanitizeText(body.action || "login", 40);
    if (action !== "login") return bad(res, 400, "Unsupported action");

    var phone = sanitizeText(body.phone || "", 40);
    var reportId = sanitizeText(body.reportId || "", 120);
    var pin = sanitizeText(body.pin || "", 20);

    if (!pin) return bad(res, 400, "PIN/Password is required");
    if (!phone && !reportId) return bad(res, 400, "Enter phone or report ID");

    var raw = await kvPipeline([
      ["GET", "rrp:reports:v1"],
      ["GET", "rrp:patients:v1"],
      ["GET", "rrp:tech:entries:v1"]
    ]);

    var reports = parseArrayJson(raw[0]).filter(function(r) {
      return String(r && r.status || "") === "Finalized";
    });
    var patients = parseArrayJson(raw[1]);
    var entries = parseArrayJson(raw[2]);

    var patientMap = toMapBy(patients, "id");
    var entryMap = toMapBy(entries, "queueId");

    var matched = [];

    if (reportId) {
      var one = null;
      for (var i = 0; i < reports.length; i += 1) {
        var r = reports[i] || {};
        if (String(r.reportId) === reportId || String(r.publicReportId) === reportId) {
          one = r;
          break;
        }
      }

      if (!one) return bad(res, 404, "Report not found");
      if (String(one.accessPin || "") !== pin) return bad(res, 401, "Invalid PIN/Password");

      if (phone) {
        var p0 = patientMap[String(one.patientId)] || {};
        if (normalizePhone(p0.phone || "") !== normalizePhone(phone)) {
          return bad(res, 401, "Phone does not match this report");
        }
      }

      matched = [one];
    } else {
      var normalizedPhone = normalizePhone(phone);
      var patientIds = {};

      for (var p = 0; p < patients.length; p += 1) {
        var patient = patients[p] || {};
        if (normalizePhone(patient.phone || "") === normalizedPhone) {
          patientIds[String(patient.id)] = true;
        }
      }

      if (!Object.keys(patientIds).length) return bad(res, 404, "No patient found with this phone");

      matched = reports.filter(function(rpt) {
        return patientIds[String(rpt.patientId)] && String(rpt.accessPin || "") === pin;
      });

      if (!matched.length) return bad(res, 401, "No reports found for this phone with entered PIN");
    }

    matched.sort(function(a, b) {
      return String(b.finalizedAt || b.updatedAt || "").localeCompare(String(a.finalizedAt || a.updatedAt || ""));
    });

    var portalReports = matched.map(function(rpt) {
      return asPortalReport(rpt, patientMap[String(rpt.patientId)] || null, entryMap[String(rpt.queueId)] || null);
    });

    var primaryPatient = patientMap[String(matched[0].patientId)] || null;

    return res.status(200).json({
      ok: true,
      patient: primaryPatient,
      reports: portalReports
    });
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Patient portal API failed");
  }
};
