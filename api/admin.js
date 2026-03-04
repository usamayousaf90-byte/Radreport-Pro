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

function toDateMs(input) {
  if (!input) return 0;
  var d = new Date(input);
  var t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function startOfDayMs(d) {
  var x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDayMs(d) {
  var x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function dayKey(ms) {
  var d = new Date(ms);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function parseWindow(query) {
  var now = Date.now();
  var windowName = sanitizeText((query && query.window) || "7d", 10);
  var dateFrom = sanitizeText((query && query.dateFrom) || "", 20);
  var dateTo = sanitizeText((query && query.dateTo) || "", 20);

  var start = 0;
  var end = now;

  if (dateFrom || dateTo) {
    start = dateFrom ? toDateMs(dateFrom + "T00:00:00") : 0;
    end = dateTo ? toDateMs(dateTo + "T23:59:59") : now;
    if (!end) end = now;
    if (start && end && start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }
    return { start: start, end: end, label: "custom", dateFrom: dateFrom, dateTo: dateTo };
  }

  if (windowName === "1d") {
    start = startOfDayMs(now);
  } else if (windowName === "7d") {
    start = startOfDayMs(now - 6 * 86400000);
  } else if (windowName === "30d") {
    start = startOfDayMs(now - 29 * 86400000);
  } else {
    start = 0;
    windowName = "all";
  }

  return { start: start, end: end, label: windowName, dateFrom: "", dateTo: "" };
}

function inRange(ts, range) {
  var t = toDateMs(ts);
  if (!t) return false;
  if (range.start && t < range.start) return false;
  if (range.end && t > range.end) return false;
  return true;
}

function sumRevenue(receipts, range) {
  var sum = 0;
  for (var i = 0; i < receipts.length; i += 1) {
    var r = receipts[i] || {};
    if (!inRange(r.createdAt, range)) continue;
    var amount = Number(r.totalAmount || 0);
    if (!Number.isFinite(amount)) amount = 0;
    sum += amount;
  }
  return Math.round(sum);
}

function uniquePatientsInRange(queue, patients, receipts, range) {
  var set = {};
  for (var i = 0; i < queue.length; i += 1) {
    var q = queue[i] || {};
    if (inRange(q.createdAt, range) && q.patientId) set[String(q.patientId)] = true;
  }
  for (var r = 0; r < receipts.length; r += 1) {
    var rc = receipts[r] || {};
    if (inRange(rc.createdAt, range) && rc.patientId) set[String(rc.patientId)] = true;
  }
  for (var p = 0; p < patients.length; p += 1) {
    var pt = patients[p] || {};
    if (inRange(pt.createdAt, range) && pt.id) set[String(pt.id)] = true;
  }
  return Object.keys(set).length;
}

function queueStats(queue, range) {
  var pending = 0;
  var completed = 0;
  var byStatus = {};

  for (var i = 0; i < queue.length; i += 1) {
    var q = queue[i] || {};
    if (!inRange(q.createdAt, range)) continue;

    var s = String(q.status || "Waiting");
    byStatus[s] = (byStatus[s] || 0) + 1;

    if (s === "Completed") completed += 1;
    else pending += 1;
  }

  return {
    pendingReports: pending,
    completedReports: completed,
    byStatus: byStatus
  };
}

function modalityUsage(queue, range) {
  var map = {};
  for (var i = 0; i < queue.length; i += 1) {
    var q = queue[i] || {};
    if (!inRange(q.createdAt, range)) continue;
    var m = String(q.modality || "Unknown");
    map[m] = (map[m] || 0) + 1;
  }

  return Object.keys(map)
    .map(function(k) { return { modality: k, count: map[k] }; })
    .sort(function(a, b) { return b.count - a.count; });
}

function doctorReferrals(patients, receipts, range) {
  var map = {};

  for (var i = 0; i < receipts.length; i += 1) {
    var rc = receipts[i] || {};
    if (!inRange(rc.createdAt, range)) continue;
    var name = sanitizeText(rc.referringDoctor || "", 120) || "Unknown";
    map[name] = (map[name] || 0) + 1;
  }

  if (!Object.keys(map).length) {
    for (var p = 0; p < patients.length; p += 1) {
      var pt = patients[p] || {};
      if (!inRange(pt.createdAt, range)) continue;
      var doc = sanitizeText(pt.referringDoctor || "", 120) || "Unknown";
      map[doc] = (map[doc] || 0) + 1;
    }
  }

  return Object.keys(map)
    .map(function(name) { return { doctor: name, count: map[name] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 12);
}

function revenueTrend(receipts, range) {
  var start = range.start || startOfDayMs(Date.now() - 6 * 86400000);
  var end = range.end || Date.now();

  var stepStart = startOfDayMs(start);
  var stepEnd = endOfDayMs(end);
  var map = {};

  for (var t = stepStart; t <= stepEnd; t += 86400000) {
    map[dayKey(t)] = 0;
  }

  for (var i = 0; i < receipts.length; i += 1) {
    var rc = receipts[i] || {};
    if (!inRange(rc.createdAt, { start: stepStart, end: stepEnd })) continue;
    var k = dayKey(toDateMs(rc.createdAt));
    var amount = Number(rc.totalAmount || 0);
    if (!Number.isFinite(amount)) amount = 0;
    map[k] = (map[k] || 0) + amount;
  }

  return Object.keys(map).sort().map(function(k) {
    return { day: k, revenue: Math.round(map[k] || 0) };
  });
}

function buildSummary(queue, patients, receipts, range) {
  var patientCount = uniquePatientsInRange(queue, patients, receipts, range);
  var revenue = sumRevenue(receipts, range);
  var qStats = queueStats(queue, range);

  return {
    totalPatients: patientCount,
    totalRevenue: revenue,
    pendingReports: qStats.pendingReports,
    completedReports: qStats.completedReports,
    queueStatus: qStats.byStatus
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return bad(res, 405, "Method not allowed");

  try {
    var range = parseWindow(req.query || {});

    var raw = await kvPipeline([
      ["GET", "rrp:patients:v1"],
      ["GET", "rrp:queue:v1"],
      ["GET", "rrp:reports:v1"],
      ["GET", "rrp:receipts:v1"]
    ]);

    var patients = parseArrayJson(raw[0]);
    var queue = parseArrayJson(raw[1]);
    var reports = parseArrayJson(raw[2]);
    var receipts = parseArrayJson(raw[3]);

    var todayRange = {
      start: startOfDayMs(Date.now()),
      end: endOfDayMs(Date.now())
    };

    var summaryRange = buildSummary(queue, patients, receipts, range);
    var summaryToday = buildSummary(queue, patients, receipts, todayRange);

    var finalizedReportsInRange = reports.filter(function(r) {
      return String((r && r.status) || "") === "Finalized" && inRange(r.finalizedAt || r.updatedAt || r.createdAt, range);
    }).length;

    var pendingReportDrafts = reports.filter(function(r) {
      var st = String((r && r.status) || "");
      return (st === "Draft" || st === "Signed") && inRange(r.updatedAt || r.createdAt, range);
    }).length;

    return res.status(200).json({
      range: {
        label: range.label,
        start: range.start || null,
        end: range.end || null,
        dateFrom: range.dateFrom || "",
        dateTo: range.dateTo || ""
      },
      today: summaryToday,
      summary: {
        totalPatients: summaryRange.totalPatients,
        totalRevenue: summaryRange.totalRevenue,
        pendingReports: summaryRange.pendingReports,
        completedReports: summaryRange.completedReports,
        finalizedReports: finalizedReportsInRange,
        draftOrSignedReports: pendingReportDrafts,
        queueStatus: summaryRange.queueStatus
      },
      charts: {
        modalityUsage: modalityUsage(queue, range),
        revenueTrend: revenueTrend(receipts, range),
        doctorReferrals: doctorReferrals(patients, receipts, range)
      },
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Admin API failed");
  }
};
