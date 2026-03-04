const crypto = require("node:crypto");

function bad(res, code, msg) {
  res.status(code).json({ error: { message: msg } });
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

function signReport(report) {
  var secret = process.env.REPORT_SIGNATURE_SECRET || "radreportpro-signature-v1";
  var payload = [
    report.reportId || "",
    report.publicReportId || "",
    report.patientId || "",
    report.modality || "",
    report.findings || "",
    report.impression || "",
    report.recommendation || "",
    report.signedBy || "",
    report.signedAt || "",
    report.finalizedAt || ""
  ].join("|");

  return crypto.createHash("sha256").update(secret + "|" + payload).digest("hex").slice(0, 40);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return bad(res, 405, "Method not allowed");

  try {
    var token = sanitizeText((req.query && req.query.id) || "", 120);
    var pin = sanitizeText((req.query && req.query.pin) || "", 20);
    if (!token) return bad(res, 400, "Report id is required");

    var raw = await kvPipeline([
      ["GET", "rrp:reports:v1"],
      ["GET", "rrp:patients:v1"]
    ]);

    var reports = parseArrayJson(raw[0]);
    var patients = parseArrayJson(raw[1]);

    var report = null;
    for (var i = 0; i < reports.length; i += 1) {
      var r = reports[i] || {};
      if (String(r.reportId) === token || String(r.publicReportId) === token) {
        report = r;
        break;
      }
    }

    if (!report) return bad(res, 404, "Report not found");
    if (String(report.status) !== "Finalized") return bad(res, 404, "Report not available for portal yet");

    var expectedPin = sanitizeText(report.accessPin || "", 20);
    if (expectedPin && pin !== expectedPin) return bad(res, 401, "PIN required or invalid PIN");

    var patient = null;
    for (var p = 0; p < patients.length; p += 1) {
      if (String(patients[p].id) === String(report.patientId)) {
        patient = patients[p];
        break;
      }
    }

    var expectedSig = signReport(report);
    var providedSig = sanitizeText(report.digitalSignature || "", 100);

    return res.status(200).json({
      report: report,
      patient: patient || null,
      verification: {
        valid: !!providedSig && providedSig === expectedSig,
        signature: providedSig,
        algorithm: "sha256",
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Public report API failed");
  }
};
