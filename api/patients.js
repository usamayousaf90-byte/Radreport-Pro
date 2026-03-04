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

function nowIso() {
  return new Date().toISOString();
}

function dateStamp() {
  var d = new Date();
  var y = String(d.getFullYear());
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + m + day;
}

function makePatientId(seq) {
  return "RP-" + dateStamp() + "-" + String(seq).padStart(5, "0");
}

function sanitizeText(v, maxLen) {
  var t = String(v == null ? "" : v).trim();
  if (!maxLen) return t;
  return t.slice(0, maxLen);
}

function normalizeTests(input) {
  var allow = {
    "Ultrasound": true,
    "X-ray": true,
    "CT": true,
    "MRI": true,
    "Lab test": true
  };
  var list = Array.isArray(input) ? input : [];
  var out = [];
  for (var i = 0; i < list.length; i += 1) {
    var item = sanitizeText(list[i], 40);
    if (allow[item] && out.indexOf(item) === -1) out.push(item);
  }
  return out;
}

function searchPatients(patients, query) {
  var q = sanitizeText(query || "", 80).toLowerCase();
  var base = patients.slice().sort(function(a, b) {
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  if (!q) return base.slice(0, 500);

  return base.filter(function(p) {
    var hay = [p.id, p.name, p.phone, p.cnic, p.referringDoctor]
      .join(" ")
      .toLowerCase();
    return hay.indexOf(q) !== -1;
  }).slice(0, 80);
}

module.exports = async function handler(req, res) {
  var KEYS = {
    patients: "rrp:patients:v1",
    queue: "rrp:queue:v1",
    seq: "rrp:patients:seq:v1"
  };

  try {
    if (req.method === "GET") {
      var action = String((req.query && req.query.action) || "list");
      var query = String((req.query && req.query.query) || "");
      var patientId = String((req.query && req.query.id) || "");

      var data = await kvPipeline([
        ["GET", KEYS.patients],
        ["GET", KEYS.queue]
      ]);

      var patients = parseArrayJson(data[0]);
      var queue = parseArrayJson(data[1]);

      if (action === "queue") {
        var ordered = queue.slice().sort(function(a, b) {
          return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
        });
        return res.status(200).json({ queue: ordered });
      }

      if (action === "patient") {
        var one = null;
        for (var i = 0; i < patients.length; i += 1) {
          if (String(patients[i].id) === patientId) {
            one = patients[i];
            break;
          }
        }
        return res.status(200).json({ patient: one });
      }

      return res.status(200).json({
        patients: searchPatients(patients, query),
        queue: queue
      });
    }

    if (req.method === "POST") {
      var body = readBody(req);
      var actionPost = String(body.action || "register");
      if (actionPost !== "register") return bad(res, 400, "Unsupported action");

      var payload = body.patient || {};
      var tests = normalizeTests(body.tests);
      if (!tests.length) return bad(res, 400, "Select at least one test");

      var raw = await kvPipeline([
        ["GET", KEYS.patients],
        ["GET", KEYS.queue]
      ]);

      var patientsAll = parseArrayJson(raw[0]);
      var queueAll = parseArrayJson(raw[1]);

      var existingPatientId = sanitizeText(body.existingPatientId || "", 64);
      var patient = null;
      for (var p = 0; p < patientsAll.length; p += 1) {
        if (String(patientsAll[p].id) === existingPatientId) {
          patient = patientsAll[p];
          break;
        }
      }

      var ts = nowIso();
      if (!patient) {
        var name = sanitizeText(payload.name, 120);
        if (!name) return bad(res, 400, "Patient name is required");

        var seqData = await kvPipeline([["INCR", KEYS.seq]]);
        var seq = Number(seqData[0] || 0);
        if (!seq || seq < 1) seq = Date.now();

        patient = {
          id: makePatientId(seq),
          name: name,
          age: sanitizeText(payload.age, 6),
          gender: sanitizeText(payload.gender, 20),
          phone: sanitizeText(payload.phone, 40),
          referringDoctor: sanitizeText(payload.referringDoctor, 120),
          address: sanitizeText(payload.address, 220),
          cnic: sanitizeText(payload.cnic, 40),
          createdAt: ts,
          updatedAt: ts,
          history: []
        };
        patientsAll.unshift(patient);
      } else {
        if (sanitizeText(payload.name, 120)) patient.name = sanitizeText(payload.name, 120);
        if (sanitizeText(payload.age, 6)) patient.age = sanitizeText(payload.age, 6);
        if (sanitizeText(payload.gender, 20)) patient.gender = sanitizeText(payload.gender, 20);
        if (sanitizeText(payload.phone, 40)) patient.phone = sanitizeText(payload.phone, 40);
        if (sanitizeText(payload.referringDoctor, 120)) patient.referringDoctor = sanitizeText(payload.referringDoctor, 120);
        if (sanitizeText(payload.address, 220)) patient.address = sanitizeText(payload.address, 220);
        if (sanitizeText(payload.cnic, 40)) patient.cnic = sanitizeText(payload.cnic, 40);
      }

      var visitId = "VIS-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      var visit = {
        visitId: visitId,
        date: ts,
        tests: tests,
        status: "Registered",
        operatorName: sanitizeText(body.operatorName || "Reception", 80)
      };

      if (!Array.isArray(patient.history)) patient.history = [];
      patient.history.unshift(visit);
      patient.updatedAt = ts;

      var newQueue = tests.map(function(testName) {
        return {
          queueId: "Q-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
          visitId: visitId,
          patientId: patient.id,
          patientName: patient.name,
          modality: testName,
          status: "Waiting",
          createdAt: ts
        };
      });

      queueAll = queueAll.concat(newQueue);

      await kvPipeline([
        ["SET", KEYS.patients, JSON.stringify(patientsAll)],
        ["SET", KEYS.queue, JSON.stringify(queueAll)]
      ]);

      return res.status(200).json({
        ok: true,
        patient: patient,
        visit: visit,
        queueAdded: newQueue
      });
    }

    if (req.method === "PUT") {
      var putBody = readBody(req);
      var actionPut = String(putBody.action || "");

      if (actionPut !== "queue_status") return bad(res, 400, "Unsupported action");

      var queueId = sanitizeText(putBody.queueId, 80);
      var status = sanitizeText(putBody.status, 20);
      var allowed = { Waiting: true, "In Progress": true, "Ready for Reporting": true, Completed: true };
      if (!queueId) return bad(res, 400, "queueId is required");
      if (!allowed[status]) return bad(res, 400, "Invalid status");

      var qData = await kvPipeline([["GET", KEYS.queue]]);
      var queueItems = parseArrayJson(qData[0]);

      var changed = false;
      for (var j = 0; j < queueItems.length; j += 1) {
        if (String(queueItems[j].queueId) === queueId) {
          queueItems[j].status = status;
          changed = true;
          break;
        }
      }

      if (!changed) return bad(res, 404, "Queue item not found");

      await kvPipeline([["SET", KEYS.queue, JSON.stringify(queueItems)]]);
      return res.status(200).json({ ok: true, queue: queueItems });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Patient API failed");
  }
};
