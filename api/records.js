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

function inDateRange(ts, dateFrom, dateTo) {
  var t = toDateMs(ts);
  if (!t) return false;

  if (dateFrom) {
    var start = toDateMs(dateFrom + "T00:00:00");
    if (start && t < start) return false;
  }

  if (dateTo) {
    var end = toDateMs(dateTo + "T23:59:59");
    if (end && t > end) return false;
  }

  return true;
}

function pushTimelineEvent(timelineMap, patientId, event) {
  var key = String(patientId || "");
  if (!key) return;
  if (!timelineMap[key]) timelineMap[key] = [];
  timelineMap[key].push(event);
}

function maybeNumber(v) {
  var n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return bad(res, 405, "Method not allowed");

  try {
    var query = sanitizeText((req.query && req.query.query) || "", 120).toLowerCase();
    var testType = sanitizeText((req.query && req.query.testType) || "All", 40);
    var dateFrom = sanitizeText((req.query && req.query.dateFrom) || "", 20);
    var dateTo = sanitizeText((req.query && req.query.dateTo) || "", 20);

    var raw = await kvPipeline([
      ["GET", "rrp:patients:v1"],
      ["GET", "rrp:queue:v1"],
      ["GET", "rrp:reports:v1"],
      ["GET", "rrp:receipts:v1"],
      ["GET", "rrp:tech:entries:v1"]
    ]);

    var patients = parseArrayJson(raw[0]);
    var queue = parseArrayJson(raw[1]);
    var reports = parseArrayJson(raw[2]);
    var receipts = parseArrayJson(raw[3]);
    var entries = parseArrayJson(raw[4]);

    var reportMap = toMapBy(reports, "queueId");
    var entryMap = toMapBy(entries, "queueId");

    var timelineMap = {};

    for (var qi = 0; qi < queue.length; qi += 1) {
      var q = queue[qi] || {};
      var rpt = reportMap[String(q.queueId)] || null;
      var ent = entryMap[String(q.queueId)] || null;

      pushTimelineEvent(timelineMap, q.patientId, {
        eventType: "Test Workflow",
        date: q.createdAt || "",
        testType: q.modality || "",
        visitId: q.visitId || "",
        queueId: q.queueId || "",
        queueStatus: q.status || "",
        reportStatus: rpt ? (rpt.status || "") : "",
        reportId: rpt ? (rpt.reportId || "") : "",
        publicReportId: rpt ? (rpt.publicReportId || "") : "",
        signedBy: rpt ? (rpt.signedBy || "") : "",
        finalizedAt: rpt ? (rpt.finalizedAt || "") : "",
        technicianName: ent ? (ent.technicianName || "") : "",
        notePreview: ent && ent.clinicalNotes ? String(ent.clinicalNotes).slice(0, 140) : ""
      });
    }

    for (var ri = 0; ri < receipts.length; ri += 1) {
      var rc = receipts[ri] || {};
      var testLines = Array.isArray(rc.tests) ? rc.tests : [];

      for (var ti = 0; ti < testLines.length; ti += 1) {
        var lt = testLines[ti] || {};
        pushTimelineEvent(timelineMap, rc.patientId, {
          eventType: "Billing",
          date: rc.createdAt || "",
          testType: lt.name || "",
          visitId: "",
          queueId: "",
          queueStatus: "",
          reportStatus: "",
          reportId: "",
          publicReportId: "",
          signedBy: "",
          finalizedAt: "",
          technicianName: "",
          notePreview: "",
          receiptId: rc.receiptId || "",
          amount: maybeNumber(lt.unitPrice) * maybeNumber(lt.qty),
          paymentMethod: rc.paymentMethod || "",
          quantity: maybeNumber(lt.qty)
        });
      }
    }

    for (var pi = 0; pi < patients.length; pi += 1) {
      var p = patients[pi] || {};
      var history = Array.isArray(p.history) ? p.history : [];

      for (var hi = 0; hi < history.length; hi += 1) {
        var h = history[hi] || {};
        var tests = Array.isArray(h.tests) ? h.tests : [];
        for (var ht = 0; ht < tests.length; ht += 1) {
          pushTimelineEvent(timelineMap, p.id, {
            eventType: "Registration",
            date: h.date || "",
            testType: tests[ht] || "",
            visitId: h.visitId || "",
            queueId: "",
            queueStatus: h.status || "Registered",
            reportStatus: "",
            reportId: "",
            publicReportId: "",
            signedBy: "",
            finalizedAt: "",
            technicianName: "",
            notePreview: "",
            operatorName: h.operatorName || ""
          });
        }
      }
    }

    var outPatients = [];
    var filteredRecordsCount = 0;
    var filteredRevenue = 0;

    for (var x = 0; x < patients.length; x += 1) {
      var patient = patients[x] || {};
      var id = String(patient.id || "");
      if (!id) continue;

      var timeline = (timelineMap[id] || []).slice().sort(function(a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });

      var byTest = testType && testType !== "All"
        ? timeline.filter(function(e) { return String(e.testType || "") === testType; })
        : timeline;

      var byDate = (dateFrom || dateTo)
        ? byTest.filter(function(e) { return inDateRange(e.date, dateFrom, dateTo); })
        : byTest;

      var fullHay = [
        patient.id,
        patient.name,
        patient.phone,
        patient.cnic,
        patient.referringDoctor,
        byDate.map(function(e) {
          return [e.testType, e.eventType, e.queueStatus, e.reportStatus, e.reportId, e.publicReportId, e.receiptId].join(" ");
        }).join(" ")
      ].join(" ").toLowerCase();

      if (query && fullHay.indexOf(query) === -1) continue;

      filteredRecordsCount += byDate.length;
      filteredRevenue += byDate.reduce(function(sum, e) {
        return sum + maybeNumber(e.amount);
      }, 0);

      var lastVisit = byDate[0] || timeline[0] || null;
      var finalizedCount = byDate.filter(function(e) { return String(e.reportStatus) === "Finalized"; }).length;

      outPatients.push({
        id: patient.id || "",
        mrn: patient.id || "",
        name: patient.name || "",
        age: patient.age || "",
        gender: patient.gender || "",
        phone: patient.phone || "",
        cnic: patient.cnic || "",
        address: patient.address || "",
        referringDoctor: patient.referringDoctor || "",
        totalTimelineEvents: byDate.length,
        totalReportsFinalized: finalizedCount,
        totalRevenue: byDate.reduce(function(sum, e) { return sum + maybeNumber(e.amount); }, 0),
        lastVisitAt: lastVisit ? (lastVisit.date || "") : "",
        lastTestType: lastVisit ? (lastVisit.testType || "") : "",
        timeline: byDate.slice(0, 800)
      });
    }

    outPatients.sort(function(a, b) {
      return String(b.lastVisitAt || "").localeCompare(String(a.lastVisitAt || ""));
    });

    return res.status(200).json({
      patients: outPatients.slice(0, 500),
      stats: {
        totalPatients: outPatients.length,
        totalTimelineEvents: filteredRecordsCount,
        totalRevenue: Math.round(filteredRevenue),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Records API failed");
  }
};
