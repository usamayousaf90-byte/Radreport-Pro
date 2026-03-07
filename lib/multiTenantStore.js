const { randomUUID } = require("node:crypto");
const { isMultiTenantEnabled, query, withTransaction } = require("./db");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureId(value, prefix) {
  var raw = String(value || "").trim();
  return raw || (prefix + "_" + randomUUID());
}

function patientNameFromPayload(payload) {
  var first = String(payload && payload.firstName || "").trim();
  var last = String(payload && payload.lastName || "").trim();
  var title = String(payload && payload.title || "").trim();
  var fallback = String(payload && payload.name || "").trim();
  var joined = [title, first, last].filter(Boolean).join(" ").trim();
  return joined || fallback || "Unnamed patient";
}

function reportLabelFromPayload(payload) {
  return String(payload && (payload.label || payload.patient && payload.patient.name) || "").trim() || "Untitled report";
}

async function replaceRows(client, sql, items) {
  for (var i = 0; i < items.length; i += 1) {
    await client.query(sql, items[i]);
  }
}

async function listPatients(organizationId) {
  var rows = await query(
    "select payload from patients where organization_id = $1 order by updated_at desc, created_at desc",
    [organizationId]
  );
  return rows.map(function(row) { return row.payload; });
}

async function replacePatients(organizationId, userId, patients) {
  var nextPatients = asArray(patients).map(function(payload) {
    var safe = payload && typeof payload === "object" ? payload : {};
    var patientId = ensureId(safe.id, "patient");
    return {
      id: patientId,
      mrno: String(safe.mrno || "").trim(),
      full_name: patientNameFromPayload(safe),
      payload: Object.assign({}, safe, { id: patientId })
    };
  });

  await withTransaction(async function(client) {
    var ids = nextPatients.map(function(item) { return item.id; });
    if (ids.length) {
      await client.query("delete from patients where organization_id = $1 and not (id = any($2::text[]))", [organizationId, ids]);
    } else {
      await client.query("delete from patients where organization_id = $1", [organizationId]);
    }
    await replaceRows(
      client,
      "insert into patients (organization_id, id, mrno, full_name, payload, created_by, updated_by) values ($1, $2, $3, $4, $5::jsonb, $6, $6) on conflict (organization_id, id) do update set mrno = excluded.mrno, full_name = excluded.full_name, payload = excluded.payload, updated_by = excluded.updated_by, updated_at = now()",
      nextPatients.map(function(item) {
        return [organizationId, item.id, item.mrno, item.full_name, JSON.stringify(item.payload), userId];
      })
    );
  });
}

async function listReportsByStatus(organizationId, status) {
  var rows = await query(
    "select payload from reports where organization_id = $1 and status = $2 order by updated_at desc, created_at desc",
    [organizationId, status]
  );
  return rows.map(function(row) { return row.payload; });
}

async function replaceReportsByStatus(organizationId, userId, status, reports) {
  var nextReports = asArray(reports).map(function(payload) {
    var safe = payload && typeof payload === "object" ? payload : {};
    var reportId = ensureId(safe.id, status === "draft" ? "draft" : "report");
    return {
      id: reportId,
      status: status,
      label: reportLabelFromPayload(safe),
      patient_id: String(safe && safe.patient && (safe.patient.registryPatientId || safe.patient.id || "") || "").trim(),
      modality: String(safe.modality || "").trim(),
      region: String(safe.region || "").trim(),
      payload: Object.assign({}, safe, { id: reportId })
    };
  });

  await withTransaction(async function(client) {
    var ids = nextReports.map(function(item) { return item.id; });
    if (ids.length) {
      await client.query("delete from reports where organization_id = $1 and status = $2 and not (id = any($3::text[]))", [organizationId, status, ids]);
    } else {
      await client.query("delete from reports where organization_id = $1 and status = $2", [organizationId, status]);
    }
    await replaceRows(
      client,
      "insert into reports (organization_id, id, patient_id, label, modality, region, status, payload, created_by, updated_by, finalized_at, finalized_by) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9, $10, $11) on conflict (organization_id, id) do update set patient_id = excluded.patient_id, label = excluded.label, modality = excluded.modality, region = excluded.region, status = excluded.status, payload = excluded.payload, updated_by = excluded.updated_by, updated_at = now(), finalized_at = excluded.finalized_at, finalized_by = excluded.finalized_by",
      nextReports.map(function(item) {
        var finalizedMeta = item.payload && item.payload.finalizedMeta ? item.payload.finalizedMeta : null;
        var finalizedAt = item.status === "finalized" ? (item.payload.finalizedAt || finalizedMeta && finalizedMeta.at || null) : null;
        var finalizedBy = item.status === "finalized" ? (finalizedMeta && finalizedMeta.by || null) : null;
        return [organizationId, item.id, item.patient_id || null, item.label, item.modality, item.region, item.status, JSON.stringify(item.payload), userId, finalizedAt, finalizedBy];
      })
    );
  });
}

module.exports = {
  isMultiTenantEnabled,
  listDrafts: function(organizationId) { return listReportsByStatus(organizationId, "draft"); },
  listFinalizedReports: function(organizationId) { return listReportsByStatus(organizationId, "finalized"); },
  listPatients,
  replaceDrafts: function(organizationId, userId, reports) { return replaceReportsByStatus(organizationId, userId, "draft", reports); },
  replaceFinalizedReports: function(organizationId, userId, reports) { return replaceReportsByStatus(organizationId, userId, "finalized", reports); },
  replacePatients
};
