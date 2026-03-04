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

function todayStamp() {
  var d = new Date();
  var y = String(d.getFullYear());
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + m + day;
}

function mkReceiptId(seq) {
  return "RCP-" + todayStamp() + "-" + String(seq).padStart(5, "0");
}

var PRICE_LIST = {
  "Ultrasound": 3500,
  "X-ray": 1800,
  "CT": 12000,
  "MRI": 20000,
  "Lab test": 1500
};

function normalizeTests(tests) {
  var src = Array.isArray(tests) ? tests : [];
  var out = [];
  for (var i = 0; i < src.length; i += 1) {
    var row = src[i] || {};
    var name = sanitizeText(row.name || row.test || "", 40);
    if (!PRICE_LIST[name]) continue;
    var qty = Number(row.qty || 1);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > 20) qty = 20;
    out.push({
      name: name,
      qty: Math.floor(qty),
      unitPrice: PRICE_LIST[name]
    });
  }
  return out;
}

function sumTests(tests) {
  var subtotal = 0;
  for (var i = 0; i < tests.length; i += 1) {
    subtotal += Number(tests[i].unitPrice || 0) * Number(tests[i].qty || 0);
  }
  return subtotal;
}

function searchReceipts(receipts, q) {
  var query = sanitizeText(q || "", 80).toLowerCase();
  var ordered = receipts.slice().sort(function(a, b) {
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  if (!query) return ordered.slice(0, 80);

  return ordered.filter(function(r) {
    var hay = [
      r.receiptId,
      r.patientId,
      r.patientName,
      r.phone,
      r.paymentMethod,
      (r.tests || []).map(function(t) { return t.name; }).join(" ")
    ].join(" ").toLowerCase();

    return hay.indexOf(query) !== -1;
  }).slice(0, 80);
}

module.exports = async function handler(req, res) {
  var KEYS = {
    patients: "rrp:patients:v1",
    receipts: "rrp:receipts:v1",
    seq: "rrp:receipts:seq:v1"
  };

  try {
    if (req.method === "GET") {
      var q = String((req.query && req.query.query) || "");
      var out = await kvPipeline([["GET", KEYS.receipts]]);
      var receipts = parseArrayJson(out[0]);
      return res.status(200).json({
        receipts: searchReceipts(receipts, q),
        priceList: PRICE_LIST
      });
    }

    if (req.method === "POST") {
      var body = readBody(req);
      var patientId = sanitizeText(body.patientId, 80);
      var operatorName = sanitizeText(body.operatorName || "Reception", 80);
      var paymentMethod = sanitizeText(body.paymentMethod || "Cash", 20);
      var allowedPayments = { Cash: true, Card: true, Online: true };
      if (!allowedPayments[paymentMethod]) return bad(res, 400, "Invalid payment method");
      if (!patientId) return bad(res, 400, "patientId is required");

      var normalizedTests = normalizeTests(body.tests);
      if (!normalizedTests.length) return bad(res, 400, "At least one test is required");

      var rows = await kvPipeline([
        ["GET", KEYS.patients],
        ["GET", KEYS.receipts],
        ["INCR", KEYS.seq]
      ]);

      var patients = parseArrayJson(rows[0]);
      var receipts = parseArrayJson(rows[1]);
      var seq = Number(rows[2] || 0);
      if (!seq || seq < 1) seq = Date.now();

      var patient = null;
      for (var i = 0; i < patients.length; i += 1) {
        if (String(patients[i].id) === patientId) {
          patient = patients[i];
          break;
        }
      }

      if (!patient) return bad(res, 404, "Patient not found");

      var subtotal = sumTests(normalizedTests);
      var discount = Number(body.discount || 0);
      if (!Number.isFinite(discount) || discount < 0) discount = 0;
      if (discount > subtotal) discount = subtotal;
      discount = Math.round(discount);

      var netAmount = subtotal - discount;
      var ts = new Date().toISOString();

      var receipt = {
        receiptId: mkReceiptId(seq),
        createdAt: ts,
        patientId: patient.id,
        patientName: patient.name || "",
        age: patient.age || "",
        gender: patient.gender || "",
        phone: patient.phone || "",
        referringDoctor: patient.referringDoctor || "",
        operatorName: operatorName,
        paymentMethod: paymentMethod,
        tests: normalizedTests,
        subtotal: subtotal,
        discount: discount,
        totalAmount: netAmount,
        status: "Paid"
      };

      receipts.unshift(receipt);

      await kvPipeline([["SET", KEYS.receipts, JSON.stringify(receipts)]]);

      return res.status(200).json({
        ok: true,
        receipt: receipt,
        priceList: PRICE_LIST
      });
    }

    return bad(res, 405, "Method not allowed");
  } catch (e) {
    return bad(res, 500, e && e.message ? e.message : "Billing API failed");
  }
};
