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

function normalizeFiles(list) {
  var src = Array.isArray(list) ? list : [];
  var out = [];
  for (var i = 0; i < src.length; i += 1) {
    var x = src[i] || {};
    var name = sanitizeText(x.name, 160);
    if (!name) continue;
    var size = Number(x.size || 0);
    if (!Number.isFinite(size) || size < 0) size = 0;
    var row = {
      id: sanitizeText(x.id, 80) || ("F-" + Date.now() + "-" + Math.floor(Math.random() * 100000)),
      name: name,
      type: sanitizeText(x.type, 80),
      size: Math.round(size),
      lastModified: Number(x.lastModified || 0) || 0
    };
    out.push(row);
  }
  return out.slice(0, 100);
}

function normalizeLabs(list) {
  var src = Array.isArray(list) ? list : [];
  var out = [];
  for (var i = 0; i < src.length; i += 1) {
    var x = src[i] || {};
    var name = sanitizeText(x.name, 120);
    var value = sanitizeText(x.value, 60);
    var unit = sanitizeText(x.unit, 30);
    var ref = sanitizeText(x.reference, 60);
    if (!name && !value && !unit && !ref) continue;
    out.push({ name: name, value: value, unit: unit, reference: ref });
  }
  return out.slice(0, 200);
}

function toMap(entries) {
  var map = {};
  for (var i = 0; i < entries.length; i += 1) {
    var e = entries[i];
    if (e && e.queueId) map[String(e.queueId)] = e;
  }
  return map;
}

module.exports = async function handler(req, res) {
  var KEYS = {
    queue: "rrp:queue:v1",
    entries: "rrp:tech:entries:v1"
  };

  try {
    if (req.method === "GET") {
      var q = sanitizeText((req.query && req.query.query) || "", 100).toLowerCase();
      var raw = await kvPipeline([
        ["GET", KEYS.queue],
        ["GET", KEYS.entries]
      ]);

      var queue = parseArrayJson(raw[0]);
      var entries = parseArrayJson(raw[1]);
      var entryMap = toMap(entries);

      var ordered = queue.slice().sort(function(a, b) {
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });

      var filtered = !q ? ordered : ordered.filter(function(item) {
        var linked = entryMap[String(item.queueId)] || {};
        var hay = [
          item.queueId,
          item.patientId,
          item.patientName,
          item.modality,
          item.status,
          linked.technicianName
        ].join(" ").toLowerCase();
        return hay.indexOf(q) !== -1;
      });

      return res.status(200).json({
        queue: filtered.slice(0, 120),
        entries: entries
      });
    }

    if (req.method === "POST") {
      var body = readBody(req);
      var action = sanitizeText(body.action || "save_entry", 40);
      var queueId = sanitizeText(body.queueId, 80);
      if (!queueId) return bad(res, 400, "queueId is required");

      var data = await kvPipeline([
        ["GET", KEYS.queue],
        ["GET", KEYS.entries]
      ]);

      var queue = parseArrayJson(data[0]);
      var entries = parseArrayJson(data[1]);

      var queueRow = null;
      for (var i = 0; i < queue.length; i += 1) {
        if (String(queue[i].queueId) === queueId) {
          queueRow = queue[i];
          break;
        }
      }

      if (!queueRow) return bad(res, 404, "Queue item not found");

      var idx = -1;
      for (var j = 0; j < entries.length; j += 1) {
        if (String(entries[j].queueId) === queueId) {
          idx = j;
          break;
        }
      }

      var now = new Date().toISOString();
      var entry = idx >= 0 ? entries[idx] : null;
      if (!entry) {
        entry = {
          queueId: queueRow.queueId,
          visitId: queueRow.visitId || "",
          patientId: queueRow.patientId || "",
          patientName: queueRow.patientName || "",
          modality: queueRow.modality || "",
          createdAt: now,
          updatedAt: now,
          status: "Draft",
          technicianName: "",
          clinicalNotes: "",
          files: [],
          labValues: []
        };
      }

      entry.technicianName = sanitizeText(body.technicianName || entry.technicianName || "", 80);
      entry.clinicalNotes = sanitizeText(body.clinicalNotes || entry.clinicalNotes || "", 8000);
      entry.files = normalizeFiles(body.files || entry.files || []);
      entry.labValues = normalizeLabs(body.labValues || entry.labValues || []);
      entry.updatedAt = now;

      if (action === "save_entry") {
        if (String(queueRow.status) === "Waiting") queueRow.status = "In Progress";
        if (!entry.status || entry.status === "Ready for Reporting") entry.status = "Draft";
      } else if (action === "mark_ready") {
        queueRow.status = "Ready for Reporting";
        entry.status = "Ready for Reporting";
        entry.readyAt = now;
      } else {
        return bad(res, 400, "Unsupported action");
      }

      if (idx >= 0) entries[idx] = entry;
      else entries.unshift(entry);

      await kvPipeline([
        ["SET", KEYS.queue, JSON.stringify(queue)],
        ["SET", KEYS.entries, JSON.stringify(entries)]
      ]);

      return res.status(200).json({
        ok: true,
        queueItem: queueRow,
        entry: entry
      });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Technician API failed");
  }
};
