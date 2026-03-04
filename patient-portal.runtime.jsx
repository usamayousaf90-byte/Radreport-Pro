const { useMemo, useState } = React;

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

function btnStyle(primary) {
  if (primary) {
    return {
      border: 0,
      borderRadius: 10,
      background: "#1D4ED8",
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

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function getInitialReportId() {
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("reportId") || u.searchParams.get("id");
    if (q) return q;
    const m = u.pathname.match(/\/portal\/([^/?#]+)/i);
    return m && m[1] ? decodeURIComponent(m[1]) : "";
  } catch (e) {
    return "";
  }
}

function getInitialPhone() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get("phone") || "";
  } catch (e) {
    return "";
  }
}

function getInitialPin() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get("pin") || "";
  } catch (e) {
    return "";
  }
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

function normalizePhone(v) {
  return String(v || "").replace(/[^0-9+]/g, "");
}

function looksLikeImage(type, name) {
  const t = String(type || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  return t.indexOf("image/") === 0 || /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|dcm)$/i.test(n);
}

function asPortalReport(report, patient, entry) {
  const files = entry && Array.isArray(entry.files) ? entry.files : [];
  const imageFiles = files.filter(function(f) {
    return looksLikeImage(f && f.type, f && f.name);
  });

  const findings = String(report.findings || "");
  let preview = findings.slice(0, 220);
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

function localPortalLogin(payload) {
  const phone = String(payload.phone || "").trim();
  const reportId = String(payload.reportId || "").trim();
  const pin = String(payload.pin || "").trim();

  if (!pin) throw new Error("PIN/Password is required.");
  if (!phone && !reportId) throw new Error("Enter phone or report ID.");

  const reports = localRead("rrp_local_reports_v1", []).filter(function(r) {
    return String(r && r.status || "") === "Finalized";
  });
  const patients = localRead("rrp_local_patients_v1", []);
  const entries = localRead("rrp_local_tech_entries_v1", []);

  const patientMap = {};
  patients.forEach(function(p) {
    if (p && p.id != null) patientMap[String(p.id)] = p;
  });

  const entryMap = {};
  entries.forEach(function(e) {
    if (e && e.queueId != null) entryMap[String(e.queueId)] = e;
  });

  let matched = [];

  if (reportId) {
    const one = reports.find(function(r) {
      return String(r.reportId) === reportId || String(r.publicReportId) === reportId;
    });
    if (!one) throw new Error("Report not found");
    if (String(one.accessPin || "") !== pin) throw new Error("Invalid PIN/Password");

    if (phone) {
      const p0 = patientMap[String(one.patientId)] || {};
      if (normalizePhone(p0.phone || "") !== normalizePhone(phone)) {
        throw new Error("Phone does not match this report");
      }
    }

    matched = [one];
  } else {
    const np = normalizePhone(phone);
    const ids = {};
    patients.forEach(function(p) {
      if (normalizePhone(p && p.phone || "") === np) ids[String(p.id)] = true;
    });
    if (!Object.keys(ids).length) throw new Error("No patient found with this phone");

    matched = reports.filter(function(r) {
      return ids[String(r.patientId)] && String(r.accessPin || "") === pin;
    });
    if (!matched.length) throw new Error("No reports found for this phone with entered PIN");
  }

  matched.sort(function(a, b) {
    return String(b.finalizedAt || b.updatedAt || "").localeCompare(String(a.finalizedAt || a.updatedAt || ""));
  });

  const portalReports = matched.map(function(r) {
    return asPortalReport(r, patientMap[String(r.patientId)] || null, entryMap[String(r.queueId)] || null);
  });

  return {
    patient: patientMap[String(matched[0].patientId)] || null,
    reports: portalReports
  };
}

function buildReportUrl(report, options) {
  const id = report && (report.publicReportId || report.reportId);
  if (!id) return "";
  const origin = window.location.origin || "";
  let url = origin + "/report/" + encodeURIComponent(id);

  const parts = [];
  if (options && options.print) parts.push("print=1");
  if (options && options.verify) parts.push("verify=1");
  if (options && options.pin) parts.push("pin=" + encodeURIComponent(options.pin));

  if (parts.length) url += "?" + parts.join("&");
  return url;
}

function App() {
  const [phone, setPhone] = useState(getInitialPhone());
  const [reportId, setReportId] = useState(getInitialReportId());
  const [pin, setPin] = useState(getInitialPin());

  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedReport = useMemo(function() {
    const currentId = selectedReportId || (reports[0] && (reports[0].publicReportId || reports[0].reportId)) || "";
    return reports.find(function(r) {
      return (r.publicReportId || r.reportId) === currentId;
    }) || null;
  }, [reports, selectedReportId]);

  async function doLogin() {
    setError("");
    setMessage("");

    if (!pin.trim()) {
      setError("PIN/Password is required.");
      return;
    }

    if (!phone.trim() && !reportId.trim()) {
      setError("Enter phone or report ID.");
      return;
    }

    setLoading(true);
    try {
      try {
        const res = await fetch("/api/patient-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login",
            phone: phone,
            reportId: reportId,
            pin: pin
          })
        });

        const data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error((data && data.error && data.error.message) || "Login failed");

        const list = Array.isArray(data.reports) ? data.reports : [];
        setPatient(data.patient || null);
        setReports(list);
        setSelectedReportId(list[0] ? (list[0].publicReportId || list[0].reportId || "") : "");
        setMessage("Login successful. Reports loaded: " + list.length);
      } catch (cloudErr) {
        const local = localPortalLogin({ phone: phone, reportId: reportId, pin: pin });
        const listLocal = Array.isArray(local.reports) ? local.reports : [];
        setPatient(local.patient || null);
        setReports(listLocal);
        setSelectedReportId(listLocal[0] ? (listLocal[0].publicReportId || listLocal[0].reportId || "") : "");
        setMessage("Cloud unavailable, loaded local portal data. Reports: " + listLocal.length);
      }
    } catch (err) {
      setError(err && err.message ? err.message : "Login failed");
      setPatient(null);
      setReports([]);
      setSelectedReportId("");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setPatient(null);
    setReports([]);
    setSelectedReportId("");
    setMessage("Logged out.");
  }

  function openReport(report, print) {
    if (!report) return;
    const url = buildReportUrl(report, { pin: pin, print: !!print });
    if (!url) {
      setError("Unable to build report URL.");
      return;
    }
    window.open(url, "_blank");
  }

  async function shareReport(report) {
    if (!report) return;
    const url = buildReportUrl(report, { pin: pin });
    if (!url) {
      setError("Unable to build share URL.");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Share link copied.");
      } else {
        setMessage("Share URL: " + url);
      }
    } catch (e) {
      setMessage("Share URL: " + url);
    }
  }

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Patient Portal</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 6: Login by Phone / Report ID + PIN, View, Download, Images, Share</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/ris" style={{ color: "#1D4ED8", fontWeight: 700 }}>RIS Home</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Template Suite</a>
            <a href="/report.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Report View</a>
            <a href="/records" style={{ color: "#1D4ED8", fontWeight: 700 }}>Records</a>
            <a href="/admin" style={{ color: "#1D4ED8", fontWeight: 700 }}>Admin</a>
            <a href="/radiologist.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Radiologist</a>
            {reports.length ? <button onClick={logout} style={btnStyle(false)}>Logout</button> : null}
          </div>
        </div>

        <div style={{ ...boxStyle(), marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Patient Login</h2>
          <div style={{ color: "#64748B", fontSize: 13, marginBottom: 8 }}>
            Use either `Phone + PIN` or `Report ID + PIN`, or all three for strict verification.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inputStyle()} />
            <input value={reportId} onChange={(e) => setReportId(e.target.value)} placeholder="Report ID / Portal ID" style={inputStyle()} />
            <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN / Password" style={inputStyle()} />
            <button onClick={doLogin} style={btnStyle(true)} disabled={loading}>{loading ? "Please wait..." : "Login"}</button>
          </div>
          {message ? <div style={{ marginTop: 8, color: "#0F766E", fontSize: 13 }}>{message}</div> : null}
          {error ? <div style={{ marginTop: 8, color: "#B91C1C", fontSize: 13 }}>{error}</div> : null}
        </div>

        {patient || reports.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 16 }}>
            <div style={boxStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Your Reports</h2>
              {patient ? (
                <div style={{ marginBottom: 8, fontSize: 13, color: "#475569" }}>
                  <strong>{patient.name || "Patient"}</strong> | {patient.phone || "-"}
                </div>
              ) : null}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, maxHeight: 560, overflow: "auto" }}>
                {reports.length ? reports.map(function(r) {
                  const id = r.publicReportId || r.reportId;
                  const active = selectedReport && (selectedReport.publicReportId || selectedReport.reportId) === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedReportId(id)}
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
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>{r.modality || "Report"}</div>
                        <div style={{ fontSize: 11, color: "#1E40AF", fontWeight: 700 }}>{r.status || "-"}</div>
                      </div>
                      <div style={{ color: "#475569", fontSize: 12 }}>Portal ID: {r.publicReportId || "-"}</div>
                      <div style={{ color: "#64748B", fontSize: 11 }}>{formatTime(r.finalizedAt)}</div>
                    </button>
                  );
                }) : <div style={{ padding: 12, color: "#64748B" }}>No reports.</div>}
              </div>
            </div>

            <div style={boxStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Report Actions</h2>
              {!selectedReport ? (
                <div style={{ color: "#64748B", fontSize: 13 }}>Select a report from the left panel.</div>
              ) : (
                <>
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13 }}>
                    <div><strong>Report:</strong> {selectedReport.reportId}</div>
                    <div><strong>Portal ID:</strong> {selectedReport.publicReportId || "-"}</div>
                    <div><strong>Finalized:</strong> {formatTime(selectedReport.finalizedAt)}</div>
                    <div><strong>Signed By:</strong> {selectedReport.signedBy || "-"}</div>
                  </div>

                  <div style={{ marginBottom: 12, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                    <strong>Preview:</strong><br />
                    {selectedReport.findingsPreview || "No preview available."}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <button onClick={() => openReport(selectedReport, false)} style={btnStyle(true)}>View Report</button>
                    <button onClick={() => openReport(selectedReport, true)} style={btnStyle(false)}>Download PDF</button>
                    <button onClick={() => shareReport(selectedReport)} style={btnStyle(false)}>Share Report</button>
                  </div>

                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Images / Attachments</div>
                    {selectedReport.imageFiles && selectedReport.imageFiles.length ? (
                      <div style={{ maxHeight: 220, overflow: "auto" }}>
                        {selectedReport.imageFiles.map(function(f, idx) {
                          return (
                            <div key={(f.id || "F") + idx} style={{ borderBottom: "1px solid #F1F5F9", padding: "8px 0", fontSize: 12 }}>
                              <div style={{ fontWeight: 700 }}>{f.name || "Unnamed file"}</div>
                              <div style={{ color: "#64748B" }}>{f.type || "unknown"} | {Math.round((Number(f.size || 0) / 1024) * 10) / 10} KB</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        No image file metadata available in this report. Full image viewer requires PACS/image URL integration.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
