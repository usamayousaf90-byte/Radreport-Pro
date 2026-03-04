const crypto = require("node:crypto");

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

function toMapBy(arr, key) {
  var map = {};
  for (var i = 0; i < arr.length; i += 1) {
    var row = arr[i] || {};
    var k = row[key];
    if (k != null && k !== "") map[String(k)] = row;
  }
  return map;
}

function toDateMs(input) {
  if (!input) return 0;
  var d = new Date(input);
  var t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function dayStamp() {
  var d = new Date();
  var y = String(d.getFullYear());
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + m + day;
}

function makeReportId(seq) {
  return "RPT-" + dayStamp() + "-" + String(seq).padStart(5, "0");
}

function makePublicReportId(seq) {
  return String(seq).padStart(6, "0");
}

function makeAccessPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
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

function matchFilters(record, query, modality, dateFrom, dateTo, status) {
  var q = sanitizeText(query || "", 100).toLowerCase();
  if (q) {
    var hay = [
      record.queueId,
      record.patientId,
      record.patientName,
      record.modality,
      record.queueStatus,
      record.report && record.report.reportId,
      record.report && record.report.publicReportId,
      record.report && record.report.status
    ].join(" ").toLowerCase();
    if (hay.indexOf(q) === -1) return false;
  }

  if (modality && modality !== "All" && String(record.modality) !== modality) return false;

  if (status && status !== "All") {
    var rs = record.report && record.report.status ? record.report.status : "No Report";
    if (rs !== status) return false;
  }

  var ts = toDateMs(record.createdAt);
  if (dateFrom) {
    var start = toDateMs(dateFrom + "T00:00:00");
    if (start && ts < start) return false;
  }

  if (dateTo) {
    var end = toDateMs(dateTo + "T23:59:59");
    if (end && ts > end) return false;
  }

  return true;
}

module.exports = async function handler(req, res) {
  var KEYS = {
    queue: "rrp:queue:v1",
    entries: "rrp:tech:entries:v1",
    reports: "rrp:reports:v1",
    patients: "rrp:patients:v1",
    seq: "rrp:reports:seq:v1"
  };

  try {
    if (req.method === "GET") {
      var query = String((req.query && req.query.query) || "");
      var modality = String((req.query && req.query.modality) || "All");
      var dateFrom = String((req.query && req.query.dateFrom) || "");
      var dateTo = String((req.query && req.query.dateTo) || "");
      var status = String((req.query && req.query.status) || "All");

      var raw = await kvPipeline([
        ["GET", KEYS.queue],
        ["GET", KEYS.entries],
        ["GET", KEYS.reports],
        ["GET", KEYS.patients]
      ]);

      var queue = parseArrayJson(raw[0]);
      var entries = parseArrayJson(raw[1]);
      var reports = parseArrayJson(raw[2]);
      var patients = parseArrayJson(raw[3]);

      var entryMap = toMapBy(entries, "queueId");
      var reportMap = toMapBy(reports, "queueId");
      var patientMap = toMapBy(patients, "id");

      var worklist = queue
        .map(function(item) {
          var patient = patientMap[String(item.patientId)] || {};
          var entry = entryMap[String(item.queueId)] || null;
          var report = reportMap[String(item.queueId)] || null;
          return {
            queueId: item.queueId,
            visitId: item.visitId || "",
            patientId: item.patientId || "",
            patientName: item.patientName || patient.name || "",
            patientAge: patient.age || "",
            patientGender: patient.gender || "",
            phone: patient.phone || "",
            referringDoctor: patient.referringDoctor || "",
            modality: item.modality || "",
            queueStatus: item.status || "Waiting",
            createdAt: item.createdAt || "",
            technicianEntry: entry,
            report: report
          };
        })
        .filter(function(record) {
          return matchFilters(record, query, modality, dateFrom, dateTo, status);
        })
        .sort(function(a, b) {
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        })
        .slice(0, 200);

      return res.status(200).json({
        worklist: worklist,
        reports: reports,
        templates: {
          us_abdomen: {
            label: "Ultrasound Abdomen",
            findings: "Liver size and contour are maintained. No focal hepatic lesion seen. Gallbladder is distended with no wall thickening or calculi. CBD is not dilated. Pancreas appears unremarkable where visualized. Spleen and kidneys are normal in size and echotexture. No free fluid seen.",
            impression: "No significant sonographic abnormality in abdomen.",
            recommendation: "Clinical correlation. Follow-up ultrasound if symptoms persist."
          },
          ct_brain: {
            label: "CT Brain (Non-contrast)",
            findings: "No acute intracranial hemorrhage, infarct, or extra-axial collection. Ventricular system is normal in size and configuration. Midline structures are central. No calvarial fracture detected.",
            impression: "No acute intracranial abnormality.",
            recommendation: "Correlate clinically. MRI brain if persistent neurological deficit."
          },
          mri_spine: {
            label: "MRI Lumbar Spine",
            findings: "Lumbar alignment is preserved. Mild multilevel disc desiccation is noted. Small posterior diffuse disc bulge at L4-L5 causing mild thecal sac indentation without significant canal stenosis. Neural foramina are patent.",
            impression: "Mild degenerative lumbar spondylotic changes, most notable at L4-L5.",
            recommendation: "Clinical and neurologic correlation. Conservative management and follow-up as indicated."
          },
          xray_chest: {
            label: "X-ray Chest PA",
            findings: "Cardiomediastinal silhouette is within normal limits. No focal consolidation, pleural effusion, or pneumothorax. Visualized bony thorax shows no acute abnormality.",
            impression: "No acute cardiopulmonary abnormality.",
            recommendation: "Routine clinical follow-up."
          },
          doppler_lower_limb: {
            label: "Doppler Lower Limb Venous",
            findings: "Common femoral, superficial femoral, popliteal, and calf veins are compressible with normal color filling and spectral flow. No intraluminal thrombus identified.",
            impression: "No evidence of deep venous thrombosis in examined lower limb veins.",
            recommendation: "Repeat Doppler if symptoms worsen or persist."
          }
        }
      });
    }

    if (req.method === "POST") {
      var body = readBody(req);
      var action = sanitizeText(body.action, 40);
      var queueId = sanitizeText(body.queueId, 80);
      if (!queueId) return bad(res, 400, "queueId is required");
      if (action !== "save_report" && action !== "sign_report" && action !== "finalize_report") {
        return bad(res, 400, "Unsupported action");
      }

      var rawMut = await kvPipeline([
        ["GET", KEYS.queue],
        ["GET", KEYS.reports],
        ["INCR", KEYS.seq]
      ]);

      var queueMut = parseArrayJson(rawMut[0]);
      var reportsMut = parseArrayJson(rawMut[1]);
      var seq = Number(rawMut[2] || 0);
      if (!seq || seq < 1) seq = Date.now();

      var queueIdx = -1;
      for (var i = 0; i < queueMut.length; i += 1) {
        if (String(queueMut[i].queueId) === queueId) {
          queueIdx = i;
          break;
        }
      }
      if (queueIdx === -1) return bad(res, 404, "Queue item not found");

      var reportIdx = -1;
      for (var j = 0; j < reportsMut.length; j += 1) {
        if (String(reportsMut[j].queueId) === queueId) {
          reportIdx = j;
          break;
        }
      }

      var now = new Date().toISOString();
      var queueItem = queueMut[queueIdx];
      var report = reportIdx >= 0 ? reportsMut[reportIdx] : null;

      if (!report) {
        report = {
          reportId: makeReportId(seq),
          queueId: queueItem.queueId,
          visitId: queueItem.visitId || "",
          patientId: queueItem.patientId || "",
          modality: queueItem.modality || "",
          templateKey: "",
          findings: "",
          impression: "",
          recommendation: "",
          status: "Draft",
          signedBy: "",
          signedAt: "",
          finalizedAt: "",
          publicReportId: "",
          accessPin: "",
          digitalSignature: "",
          createdAt: now,
          updatedAt: now
        };
      }

      if (report.status === "Finalized" && action !== "finalize_report") {
        return bad(res, 400, "Report already finalized and cannot be edited");
      }

      var findings = sanitizeText(body.findings || report.findings || "", 40000);
      var impression = sanitizeText(body.impression || report.impression || "", 12000);
      var recommendation = sanitizeText(body.recommendation || report.recommendation || "", 12000);
      var templateKey = sanitizeText(body.templateKey || report.templateKey || "", 80);
      var radiologistName = sanitizeText(body.radiologistName || "", 120);

      report.findings = findings;
      report.impression = impression;
      report.recommendation = recommendation;
      report.templateKey = templateKey;
      report.updatedAt = now;

      if (action === "save_report") {
        report.status = "Draft";
        if (String(queueItem.status) === "Waiting") queueItem.status = "In Progress";
      }

      if (action === "sign_report") {
        if (!radiologistName) return bad(res, 400, "Radiologist name is required for signing");
        report.status = "Signed";
        report.signedBy = radiologistName;
        report.signedAt = now;
        if (String(queueItem.status) === "Waiting") queueItem.status = "In Progress";
      }

      if (action === "finalize_report") {
        if (!radiologistName && !report.signedBy) return bad(res, 400, "Radiologist name is required to finalize");
        if (!findings && !impression) return bad(res, 400, "Findings or impression required before finalize");

        if (!report.signedBy) {
          report.signedBy = radiologistName;
          report.signedAt = now;
        }

        report.status = "Finalized";
        report.finalizedAt = now;
        report.publicReportId = report.publicReportId || makePublicReportId(seq);
        report.accessPin = report.accessPin || makeAccessPin();
        report.digitalSignature = signReport(report);

        queueItem.status = "Completed";
        queueItem.completedAt = now;
      }

      if (reportIdx >= 0) reportsMut[reportIdx] = report;
      else reportsMut.unshift(report);
      queueMut[queueIdx] = queueItem;

      await kvPipeline([
        ["SET", KEYS.reports, JSON.stringify(reportsMut)],
        ["SET", KEYS.queue, JSON.stringify(queueMut)]
      ]);

      return res.status(200).json({
        ok: true,
        report: report,
        queueItem: queueItem,
        portal: report.status === "Finalized"
          ? {
              reportId: report.publicReportId || report.reportId,
              pin: report.accessPin || "",
              path: "/report/" + encodeURIComponent(report.publicReportId || report.reportId || "")
            }
          : null
      });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Report API failed");
  }
};
