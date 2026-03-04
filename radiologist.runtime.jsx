const { useEffect, useMemo, useState } = React;

const DEFAULT_TEMPLATES = {
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
};

function inputStyle(extra) {
  return {
    width: "100%",
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    padding: "10px 11px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 14,
    ...(extra || {})
  };
}

function boxStyle() {
  return {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #DDE6F1",
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)",
    padding: 18
  };
}

function btnStyle(primary, color) {
  if (primary) {
    return {
      border: 0,
      borderRadius: 10,
      background: color || "#1D4ED8",
      color: "#fff",
      padding: "10px 13px",
      fontWeight: 700,
      cursor: "pointer"
    };
  }

  return {
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    background: "#fff",
    color: "#334155",
    padding: "10px 13px",
    fontWeight: 700,
    cursor: "pointer"
  };
}

function localRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const out = JSON.parse(raw);
    return out == null ? fallback : out;
  } catch (e) {
    return fallback;
  }
}

function localWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toMapBy(list, key) {
  const map = {};
  (Array.isArray(list) ? list : []).forEach(function(row) {
    if (row && row[key] != null && row[key] !== "") map[String(row[key])] = row;
  });
  return map;
}

function toDateMs(input) {
  if (!input) return 0;
  const d = new Date(input);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function parseAIDraft(text) {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();
  if (!clean) return null;

  let jsonText = clean;
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) jsonText = fenced[1].trim();

  try {
    const obj = JSON.parse(jsonText);
    return {
      findings: String(obj.findings || "").trim(),
      impression: String(obj.impression || "").trim(),
      recommendation: String(obj.recommendation || "").trim()
    };
  } catch (e) {
    return {
      findings: clean,
      impression: "",
      recommendation: ""
    };
  }
}

function makeLocalSignature(report) {
  const raw = [
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

  try {
    return btoa(unescape(encodeURIComponent(raw))).replace(/=/g, "").slice(0, 40);
  } catch (e) {
    return String(Date.now());
  }
}

function buildPortalUrl(report, options) {
  if (!report) return "";
  const id = report.publicReportId || report.reportId;
  if (!id) return "";

  const origin = window.location.origin || "";
  let url = origin + "/report/" + encodeURIComponent(id);

  const params = [];
  if (options && options.verify) params.push("verify=1");
  if (options && options.print) params.push("print=1");
  if (report.accessPin) params.push("pin=" + encodeURIComponent(report.accessPin));
  if (params.length) url += "?" + params.join("&");

  return url;
}

function App() {
  const [storageMode, setStorageMode] = useState("cloud");
  const [worklist, setWorklist] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  const [query, setQuery] = useState("");
  const [modality, setModality] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportStatus, setReportStatus] = useState("All");

  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [templateKey, setTemplateKey] = useState("us_abdomen");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [radiologistName, setRadiologistName] = useState("Radiologist");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const selectedRecord = useMemo(function() {
    return worklist.find(function(row) { return row.queueId === selectedQueueId; }) || null;
  }, [worklist, selectedQueueId]);

  const selectedReport = selectedRecord && selectedRecord.report ? selectedRecord.report : null;

  const portalUrl = useMemo(function() {
    return selectedReport ? buildPortalUrl(selectedReport, {}) : "";
  }, [selectedReport]);

  const verifyUrl = useMemo(function() {
    return selectedReport ? buildPortalUrl(selectedReport, { verify: true }) : "";
  }, [selectedReport]);

  const qrSrc = useMemo(function() {
    if (!verifyUrl) return "";
    return "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(verifyUrl);
  }, [verifyUrl]);

  const modalities = useMemo(function() {
    const map = { All: true };
    worklist.forEach(function(row) {
      if (row && row.modality) map[String(row.modality)] = true;
    });
    return Object.keys(map);
  }, [worklist]);

  function applyRecordToEditor(record) {
    if (!record) {
      setTemplateKey("us_abdomen");
      setFindings("");
      setImpression("");
      setRecommendation("");
      return;
    }

    const rpt = record.report || {};
    setTemplateKey(rpt.templateKey || "us_abdomen");
    setFindings(rpt.findings || "");
    setImpression(rpt.impression || "");
    setRecommendation(rpt.recommendation || "");
    if (rpt.signedBy) setRadiologistName(rpt.signedBy);
  }

  async function fetchCloud() {
    const params = new URLSearchParams({
      query: query,
      modality: modality,
      dateFrom: dateFrom,
      dateTo: dateTo,
      status: reportStatus
    });

    const res = await fetch("/api/reports?" + params.toString());
    const data = await res.json().catch(function() { return {}; });
    if (!res.ok) {
      throw new Error((data && data.error && data.error.message) || ("HTTP " + res.status));
    }

    const rows = Array.isArray(data.worklist) ? data.worklist : [];
    setWorklist(rows);
    setTemplates(data.templates || DEFAULT_TEMPLATES);
    setStorageMode("cloud");

    if (selectedQueueId) {
      const still = rows.find(function(x) { return x.queueId === selectedQueueId; });
      if (!still) {
        setSelectedQueueId("");
        applyRecordToEditor(null);
      } else {
        applyRecordToEditor(still);
      }
    }
  }

  function buildLocalWorklist() {
    const queue = localRead("rrp_local_queue_v1", []);
    const entries = localRead("rrp_local_tech_entries_v1", []);
    const reports = localRead("rrp_local_reports_v1", []);
    const patients = localRead("rrp_local_patients_v1", []);

    const entryMap = toMapBy(entries, "queueId");
    const reportMap = toMapBy(reports, "queueId");
    const patientMap = toMapBy(patients, "id");

    const q = String(query || "").trim().toLowerCase();

    const rows = (Array.isArray(queue) ? queue : [])
      .map(function(item) {
        const patient = patientMap[String(item.patientId)] || {};
        const report = reportMap[String(item.queueId)] || null;
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
          technicianEntry: entryMap[String(item.queueId)] || null,
          report: report
        };
      })
      .filter(function(r) {
        if (q) {
          const hay = [
            r.queueId,
            r.patientId,
            r.patientName,
            r.modality,
            r.queueStatus,
            r.report && r.report.reportId,
            r.report && r.report.publicReportId,
            r.report && r.report.status
          ].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (modality && modality !== "All" && String(r.modality) !== modality) return false;

        const rs = r.report && r.report.status ? r.report.status : "No Report";
        if (reportStatus && reportStatus !== "All" && rs !== reportStatus) return false;

        const ts = toDateMs(r.createdAt);
        if (dateFrom) {
          const start = toDateMs(dateFrom + "T00:00:00");
          if (start && ts < start) return false;
        }
        if (dateTo) {
          const end = toDateMs(dateTo + "T23:59:59");
          if (end && ts > end) return false;
        }

        return true;
      })
      .sort(function(a, b) {
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      })
      .slice(0, 200);

    return rows;
  }

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      await fetchCloud();
    } catch (err) {
      const rows = buildLocalWorklist();
      setWorklist(rows);
      setTemplates(DEFAULT_TEMPLATES);
      setStorageMode("local");
      setMessage("Cloud unavailable, using local storage.");

      if (selectedQueueId) {
        const still = rows.find(function(x) { return x.queueId === selectedQueueId; });
        if (!still) {
          setSelectedQueueId("");
          applyRecordToEditor(null);
        } else {
          applyRecordToEditor(still);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    refresh();
  }, []);

  function onPick(record) {
    setSelectedQueueId(record.queueId);
    applyRecordToEditor(record);
  }

  function applyTemplateToEditor() {
    const t = templates[templateKey] || DEFAULT_TEMPLATES[templateKey];
    if (!t) {
      setMessage("Template not found.");
      return;
    }
    setFindings(t.findings || "");
    setImpression(t.impression || "");
    setRecommendation(t.recommendation || "");
    setMessage("Template applied: " + (t.label || templateKey));
  }

  async function generateAIDraft() {
    setMessage("");
    if (!selectedRecord) {
      setMessage("Select a worklist item first.");
      return;
    }

    setAiLoading(true);
    try {
      const te = selectedRecord.technicianEntry || {};
      const payload = {
        system: "You are a radiologist assistant. Return JSON only with keys findings, impression, recommendation. Keep text concise and clinically appropriate.",
        messages: [
          {
            role: "user",
            content:
              "Create structured report draft for this case.\\n" +
              "Patient: " + (selectedRecord.patientName || "") + " | Age: " + (selectedRecord.patientAge || "") + " | Gender: " + (selectedRecord.patientGender || "") + "\\n" +
              "Modality: " + (selectedRecord.modality || "") + "\\n" +
              "Clinical notes: " + (te.clinicalNotes || "") + "\\n" +
              "Lab values: " + JSON.stringify(te.labValues || []) + "\\n" +
              "Attached files metadata: " + JSON.stringify(te.files || []) + "\\n" +
              "Template hint: " + JSON.stringify(templates[templateKey] || {})
          }
        ]
      };

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) throw new Error((data && data.error && data.error.message) || "AI draft failed");

      const parsed = parseAIDraft(String(data.text || ""));
      if (!parsed) throw new Error("AI returned empty draft");

      setFindings(parsed.findings || findings);
      if (parsed.impression) setImpression(parsed.impression);
      if (parsed.recommendation) setRecommendation(parsed.recommendation);
      setMessage("AI draft generated. Please review before signing.");
    } catch (err) {
      setMessage(err && err.message ? err.message : "AI draft failed");
    } finally {
      setAiLoading(false);
    }
  }

  function openPortal(printMode) {
    if (!selectedReport || String(selectedReport.status) !== "Finalized") {
      setMessage("Finalize report first to open patient portal view.");
      return;
    }
    const url = buildPortalUrl(selectedReport, printMode ? { print: true } : {});
    if (!url) {
      setMessage("Unable to build portal URL.");
      return;
    }
    window.open(url, "_blank");
  }

  async function copyPortalLink() {
    if (!selectedReport || String(selectedReport.status) !== "Finalized") {
      setMessage("Finalize report first to copy portal link.");
      return;
    }
    if (!portalUrl) {
      setMessage("Unable to build portal URL.");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(portalUrl);
        setMessage("Portal link copied.");
      } else {
        setMessage("Clipboard unavailable. Link: " + portalUrl);
      }
    } catch (e) {
      setMessage("Copy failed. Link: " + portalUrl);
    }
  }

  async function persist(action) {
    setMessage("");
    if (!selectedRecord) {
      setMessage("Select a worklist item first.");
      return;
    }

    const payload = {
      action: action,
      queueId: selectedRecord.queueId,
      templateKey: templateKey,
      findings: findings,
      impression: impression,
      recommendation: recommendation,
      radiologistName: radiologistName
    };

    setSaving(true);
    try {
      if (storageMode === "cloud") {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error((data && data.error && data.error.message) || "Report action failed");

        if (action === "finalize_report" && data && data.report) {
          const rid = data.report.publicReportId || data.report.reportId || "-";
          const pin = data.report.accessPin || "-";
          setMessage("Report finalized. Portal ID: " + rid + " | PIN: " + pin);
        } else {
          setMessage(
            action === "sign_report"
              ? "Report signed."
              : "Report saved."
          );
        }
        await refresh();
      } else {
        const queue = localRead("rrp_local_queue_v1", []);
        const reports = localRead("rrp_local_reports_v1", []);
        const seq = Number(localStorage.getItem("rrp_local_reports_seq_v1") || "0") + 1;
        localStorage.setItem("rrp_local_reports_seq_v1", String(seq));

        const qIdx = queue.findIndex(function(item) { return item.queueId === selectedRecord.queueId; });
        if (qIdx < 0) throw new Error("Queue item not found in local storage");

        let rptIdx = reports.findIndex(function(r) { return r.queueId === selectedRecord.queueId; });
        let report = rptIdx >= 0 ? reports[rptIdx] : null;

        const now = new Date().toISOString();
        if (!report) {
          report = {
            reportId: "LOCAL-RPT-" + String(seq).padStart(5, "0"),
            queueId: selectedRecord.queueId,
            visitId: selectedRecord.visitId || "",
            patientId: selectedRecord.patientId || "",
            modality: selectedRecord.modality || "",
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
          throw new Error("Report already finalized and cannot be edited");
        }

        report.templateKey = templateKey;
        report.findings = findings;
        report.impression = impression;
        report.recommendation = recommendation;
        report.updatedAt = now;

        if (action === "save_report") {
          report.status = "Draft";
          if (queue[qIdx].status === "Waiting") queue[qIdx].status = "In Progress";
        }

        if (action === "sign_report") {
          if (!String(radiologistName || "").trim()) throw new Error("Radiologist name is required for signing");
          report.status = "Signed";
          report.signedBy = String(radiologistName || "").trim();
          report.signedAt = now;
          if (queue[qIdx].status === "Waiting") queue[qIdx].status = "In Progress";
        }

        if (action === "finalize_report") {
          if (!String(radiologistName || report.signedBy || "").trim()) throw new Error("Radiologist name is required to finalize");
          if (!String(findings || "").trim() && !String(impression || "").trim()) {
            throw new Error("Findings or impression required before finalize");
          }
          if (!report.signedBy) {
            report.signedBy = String(radiologistName || "").trim();
            report.signedAt = now;
          }
          report.status = "Finalized";
          report.finalizedAt = now;
          report.publicReportId = report.publicReportId || ("P-" + String(seq).padStart(6, "0"));
          report.accessPin = report.accessPin || String(Math.floor(1000 + Math.random() * 9000));
          report.digitalSignature = makeLocalSignature(report);
          queue[qIdx].status = "Completed";
          queue[qIdx].completedAt = now;
        }

        if (rptIdx >= 0) reports[rptIdx] = report;
        else reports.unshift(report);

        localWrite("rrp_local_queue_v1", queue);
        localWrite("rrp_local_reports_v1", reports);

        if (action === "finalize_report") {
          setMessage("Report finalized (local mode). Portal ID: " + (report.publicReportId || "-") + " | PIN: " + (report.accessPin || "-"));
        } else {
          setMessage(
            action === "sign_report"
              ? "Report signed (local mode)."
              : "Report saved (local mode)."
          );
        }
        await refresh();
      }
    } catch (err) {
      setMessage(err && err.message ? err.message : "Report action failed");
    } finally {
      setSaving(false);
    }
  }

  const templateKeys = Object.keys(templates || {});

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1420, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Radiologist Panel</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 4 + 5: Reporting, Finalize, Patient Portal Link, PDF, QR Verification</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/reception.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Reception</a>
            <a href="/billing.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Billing</a>
            <a href="/technician.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Technician</a>
            <a href="/portal" style={{ color: "#1D4ED8", fontWeight: 700 }}>Patient Portal</a>
            <a href="/records" style={{ color: "#1D4ED8", fontWeight: 700 }}>Records</a>
            <a href="/admin" style={{ color: "#1D4ED8", fontWeight: 700 }}>Admin</a>
            <a href="/report.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Report Portal</a>
            <span style={{
              fontSize: 12,
              color: storageMode === "cloud" ? "#166534" : "#92400E",
              background: storageMode === "cloud" ? "#DCFCE7" : "#FEF3C7",
              borderRadius: 999,
              padding: "4px 10px",
              fontWeight: 700
            }}>
              {storageMode === "cloud" ? "Cloud Storage" : "Local Storage"}
            </span>
          </div>
        </div>

        <div style={{ ...boxStyle(), marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by patient, ID, queue, report/public ID" style={inputStyle()} />
            <select value={modality} onChange={(e) => setModality(e.target.value)} style={inputStyle()}>
              {modalities.map(function(m) { return <option key={m}>{m}</option>; })}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle()} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle()} />
            <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} style={inputStyle()}>
              <option>All</option>
              <option>No Report</option>
              <option>Draft</option>
              <option>Signed</option>
              <option>Finalized</option>
            </select>
            <button onClick={refresh} style={btnStyle(false)} disabled={loading}>{loading ? "Loading..." : "Search"}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 16 }}>
          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Patient Worklist</h2>
            <div style={{ maxHeight: 720, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              {worklist.length ? worklist.map(function(row) {
                const active = row.queueId === selectedQueueId;
                const repStatus = row.report && row.report.status ? row.report.status : "No Report";
                return (
                  <button
                    key={row.queueId}
                    onClick={() => onPick(row)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      borderBottom: "1px solid #F1F5F9",
                      background: active ? "#EFF6FF" : "#fff",
                      padding: "10px 11px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.patientName || "Unnamed"}</div>
                      <div style={{ fontSize: 11, color: "#1E40AF", fontWeight: 700 }}>{repStatus}</div>
                    </div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{row.patientId} | {row.modality}</div>
                    <div style={{ color: "#64748B", fontSize: 11 }}>Queue: {row.queueStatus} | {formatTime(row.createdAt)}</div>
                  </button>
                );
              }) : <div style={{ padding: 12, color: "#64748B" }}>No worklist items.</div>}
            </div>
          </div>

          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Structured Reporting</h2>
            {!selectedRecord ? (
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                Select a worklist item to start reporting.
              </div>
            ) : (
              <>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 10, padding: "9px 11px", fontSize: 13, marginBottom: 12 }}>
                  <strong>{selectedRecord.patientName}</strong> ({selectedRecord.patientId}) | {selectedRecord.modality}
                  <div style={{ marginTop: 4, color: "#1E3A8A" }}>
                    Queue: {selectedRecord.queueStatus} | Report: {(selectedRecord.report && selectedRecord.report.status) || "No Report"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input value={radiologistName} onChange={(e) => setRadiologistName(e.target.value)} placeholder="Radiologist name" style={inputStyle()} />
                  <input value={selectedRecord.referringDoctor || ""} readOnly placeholder="Referring doctor" style={inputStyle({ background: "#F8FAFC" })} />
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13 }}>
                  <div><strong>Clinical Notes:</strong> {(selectedRecord.technicianEntry && selectedRecord.technicianEntry.clinicalNotes) || "-"}</div>
                  <div style={{ marginTop: 5 }}><strong>Files:</strong> {((selectedRecord.technicianEntry && selectedRecord.technicianEntry.files) || []).length}</div>
                  <div style={{ marginTop: 5 }}><strong>Lab Values:</strong> {((selectedRecord.technicianEntry && selectedRecord.technicianEntry.labValues) || []).length}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginBottom: 10 }}>
                  <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} style={inputStyle()}>
                    {templateKeys.map(function(k) {
                      const t = templates[k] || {};
                      return <option key={k} value={k}>{t.label || k}</option>;
                    })}
                  </select>
                  <button onClick={applyTemplateToEditor} style={btnStyle(false)}>Generate Report</button>
                  <button onClick={generateAIDraft} disabled={aiLoading} style={btnStyle(false)}>{aiLoading ? "AI..." : "AI Draft"}</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <textarea value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Findings" style={{ ...inputStyle(), minHeight: 180, resize: "vertical" }} />
                  <textarea value={impression} onChange={(e) => setImpression(e.target.value)} placeholder="Impression" style={{ ...inputStyle(), minHeight: 110, resize: "vertical" }} />
                  <textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="Recommendation" style={{ ...inputStyle(), minHeight: 90, resize: "vertical" }} />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => persist("save_report")} disabled={saving} style={btnStyle(false)}>{saving ? "Saving..." : "Save Draft"}</button>
                  <button onClick={() => persist("sign_report")} disabled={saving} style={btnStyle(true, "#1E40AF")}>{saving ? "Saving..." : "Sign Report"}</button>
                  <button onClick={() => persist("finalize_report")} disabled={saving} style={btnStyle(true, "#15803D")}>{saving ? "Saving..." : "Finalize"}</button>
                  <button onClick={() => openPortal(false)} style={btnStyle(false)} disabled={!selectedReport || selectedReport.status !== "Finalized"}>Patient View</button>
                  <button onClick={() => openPortal(true)} style={btnStyle(false)} disabled={!selectedReport || selectedReport.status !== "Finalized"}>PDF</button>
                  <button onClick={copyPortalLink} style={btnStyle(false)} disabled={!selectedReport || selectedReport.status !== "Finalized"}>Copy Link</button>
                </div>

                {(selectedRecord.report && selectedRecord.report.reportId) ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
                    Report ID: {selectedRecord.report.reportId}
                    {selectedRecord.report.publicReportId ? " | Portal ID: " + selectedRecord.report.publicReportId : ""}
                    {selectedRecord.report.accessPin ? " | PIN: " + selectedRecord.report.accessPin : ""}
                    {selectedRecord.report.digitalSignature ? " | Signature: " + selectedRecord.report.digitalSignature : ""}
                    {" | Signed By: " + (selectedRecord.report.signedBy || "-")}
                    {" | Signed At: " + formatTime(selectedRecord.report.signedAt)}
                    {" | Finalized At: " + formatTime(selectedRecord.report.finalizedAt)}
                  </div>
                ) : null}

                {selectedReport && selectedReport.status === "Finalized" ? (
                  <div style={{ marginTop: 12, border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>Portal URL</div>
                      <div style={{ fontSize: 12, color: "#1D4ED8", wordBreak: "break-all" }}>{portalUrl || "-"}</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#334155", fontWeight: 700 }}>Verification URL</div>
                      <div style={{ fontSize: 12, color: "#1D4ED8", wordBreak: "break-all" }}>{verifyUrl || "-"}</div>
                    </div>
                    {qrSrc ? <img src={qrSrc} alt="QR verify" style={{ width: 136, height: 136, border: "1px solid #E2E8F0", borderRadius: 8 }} /> : null}
                  </div>
                ) : null}
              </>
            )}

            {message ? <div style={{ marginTop: 10, color: "#0F766E", fontSize: 13 }}>{message}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
