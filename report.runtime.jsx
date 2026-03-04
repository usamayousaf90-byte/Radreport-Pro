const { useEffect, useMemo, useState } = React;

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

function cardStyle() {
  return {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #DDE6F1",
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)",
    padding: 18
  };
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function getReportTokenFromUrl() {
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("reportId") || u.searchParams.get("id");
    if (q) return q;
    const m = u.pathname.match(/\/report\/([^/?#]+)/i);
    return m && m[1] ? decodeURIComponent(m[1]) : "";
  } catch (e) {
    return "";
  }
}

function getPinFromUrl() {
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

function localSign(report) {
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

function App() {
  const [storageMode, setStorageMode] = useState("cloud");
  const [loading, setLoading] = useState(true);
  const [reportToken, setReportToken] = useState(getReportTokenFromUrl());
  const [pin, setPin] = useState(getPinFromUrl());
  const [needPin, setNeedPin] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const verifyMode = useMemo(function() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get("verify") === "1";
    } catch (e) {
      return false;
    }
  }, []);

  const printMode = useMemo(function() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get("print") === "1";
    } catch (e) {
      return false;
    }
  }, []);

  async function loadCloud() {
    const params = new URLSearchParams({ id: reportToken || "" });
    if (pin) params.set("pin", pin);

    const res = await fetch("/api/report-public?" + params.toString());
    const body = await res.json().catch(function() { return {}; });

    if (res.status === 401) {
      setNeedPin(true);
      throw new Error((body && body.error && body.error.message) || "PIN required");
    }

    if (!res.ok) throw new Error((body && body.error && body.error.message) || ("HTTP " + res.status));

    setData(body);
    setNeedPin(false);
    setStorageMode("cloud");
  }

  function loadLocal() {
    const reports = localRead("rrp_local_reports_v1", []);
    const patients = localRead("rrp_local_patients_v1", []);

    const rpt = (reports || []).find(function(r) {
      return String(r.reportId) === String(reportToken) || String(r.publicReportId) === String(reportToken);
    });

    if (!rpt) throw new Error("Report not found in local storage");
    if (String(rpt.status) !== "Finalized") throw new Error("Report not finalized yet");

    const requiredPin = String(rpt.accessPin || "");
    if (requiredPin && String(pin || "") !== requiredPin) {
      setNeedPin(true);
      throw new Error("PIN required or invalid PIN");
    }

    const patient = (patients || []).find(function(p) { return String(p.id) === String(rpt.patientId); }) || null;
    const sig = String(rpt.digitalSignature || "");
    const expected = localSign(rpt);

    setData({
      report: rpt,
      patient: patient,
      verification: {
        valid: !!sig && sig === expected,
        signature: sig,
        algorithm: "local-base64",
        verifiedAt: new Date().toISOString()
      }
    });

    setStorageMode("local");
  }

  async function fetchData() {
    setLoading(true);
    setError("");

    if (!reportToken) {
      setError("Missing report ID in URL.");
      setLoading(false);
      return;
    }

    try {
      await loadCloud();
    } catch (err) {
      try {
        loadLocal();
      } catch (localErr) {
        setError(localErr && localErr.message ? localErr.message : (err && err.message ? err.message : "Failed to load report"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    fetchData();
  }, [reportToken, pin]);

  useEffect(function() {
    if (!printMode || !data || !data.report) return;
    const t = setTimeout(function() {
      window.print();
    }, 600);
    return function() { clearTimeout(t); };
  }, [printMode, data]);

  function onApplyPin() {
    if (!pin.trim()) {
      setError("Enter PIN first.");
      return;
    }
    setError("");
    fetchData();
  }

  function onDownloadPdf() {
    window.print();
  }

  const report = data && data.report ? data.report : null;
  const patient = data && data.patient ? data.patient : null;
  const verification = data && data.verification ? data.verification : null;

  const canonicalUrl = useMemo(function() {
    if (!report) return "";
    const id = report.publicReportId || report.reportId;
    if (!id) return "";
    return window.location.origin + "/report/" + encodeURIComponent(id);
  }, [report]);

  const verifyUrl = useMemo(function() {
    if (!report) return "";
    let url = canonicalUrl + "?verify=1";
    if (report.accessPin) url += "&pin=" + encodeURIComponent(report.accessPin);
    return url;
  }, [report, canonicalUrl]);

  const qrSrc = useMemo(function() {
    if (!verifyUrl) return "";
    return "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(verifyUrl);
  }, [verifyUrl]);

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Report Portal</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 5: PDF Report, Portal View, QR Verification, Digital Signature</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/portal" style={{ color: "#1D4ED8", fontWeight: 700 }}>Patient Portal</a>
            <a href="/records" style={{ color: "#1D4ED8", fontWeight: 700 }}>Records</a>
            <a href="/admin" style={{ color: "#1D4ED8", fontWeight: 700 }}>Admin</a>
            <a href="/radiologist.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Radiologist</a>
            <div style={{
              fontSize: 12,
              color: storageMode === "cloud" ? "#166534" : "#92400E",
              background: storageMode === "cloud" ? "#DCFCE7" : "#FEF3C7",
              borderRadius: 999,
              padding: "4px 10px",
              fontWeight: 700
            }}>
              {storageMode === "cloud" ? "Cloud Storage" : "Local Storage"}
            </div>
          </div>
        </div>

        {!reportToken ? (
          <div style={cardStyle()}>
            <div style={{ color: "#B91C1C", fontWeight: 700 }}>Missing report ID.</div>
            <div style={{ marginTop: 8, color: "#475569" }}>
              Open using `/report/&lt;public-id&gt;` or `/report.html?reportId=&lt;id&gt;`.
            </div>
          </div>
        ) : null}

        {needPin ? (
          <div className="no-print" style={{ ...cardStyle(), marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>PIN Required</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter 4-digit PIN" style={inputStyle()} />
              <button onClick={onApplyPin} style={{ border: 0, borderRadius: 10, background: "#1D4ED8", color: "#fff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
                Verify PIN
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div style={cardStyle()}>Loading report...</div>
        ) : null}

        {!loading && error ? (
          <div style={cardStyle()}>
            <div style={{ color: "#B91C1C", fontWeight: 700 }}>{error}</div>
          </div>
        ) : null}

        {!loading && report ? (
          <>
            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>RadReportPro Diagnostic Center</div>
                  <div style={{ color: "#475569", fontSize: 13 }}>Official Diagnostic Report</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12 }}>
                  <div><strong>Report ID:</strong> {report.reportId}</div>
                  <div><strong>Portal ID:</strong> {report.publicReportId || "-"}</div>
                  <div><strong>Date:</strong> {formatTime(report.finalizedAt || report.updatedAt)}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                <div><strong>Patient:</strong> {(patient && patient.name) || report.patientId}</div>
                <div><strong>Patient ID:</strong> {report.patientId}</div>
                <div><strong>Age/Gender:</strong> {(patient && patient.age) || "-"} / {(patient && patient.gender) || "-"}</div>
                <div><strong>Phone:</strong> {(patient && patient.phone) || "-"}</div>
                <div><strong>Modality:</strong> {report.modality || "-"}</div>
                <div><strong>Referring Doctor:</strong> {(patient && patient.referringDoctor) || "-"}</div>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid #E2E8F0", margin: "14px 0" }} />

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 5 }}>Findings</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#1F2937", fontSize: 14 }}>{report.findings || "-"}</div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 5 }}>Impression</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#1F2937", fontSize: 14 }}>{report.impression || "-"}</div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 5 }}>Recommendation</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#1F2937", fontSize: 14 }}>{report.recommendation || "-"}</div>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid #E2E8F0", margin: "14px 0" }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
                <div>
                  <div><strong>Signed By:</strong> {report.signedBy || "-"}</div>
                  <div><strong>Signed At:</strong> {formatTime(report.signedAt)}</div>
                  <div><strong>Finalized At:</strong> {formatTime(report.finalizedAt)}</div>
                  <div><strong>Digital Signature:</strong> {report.digitalSignature || "-"}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: (verification && verification.valid) ? "#166534" : "#B91C1C", fontWeight: 700 }}>
                    {(verification && verification.valid) ? "Verified Report" : "Verification Failed"}
                    {verifyMode ? " (QR/Portal Check)" : ""}
                  </div>
                </div>

                {qrSrc ? (
                  <div style={{ textAlign: "center" }}>
                    <img src={qrSrc} alt="QR verification" style={{ width: 150, height: 150, border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff" }} />
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Scan to verify</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="no-print" style={{ ...cardStyle(), marginTop: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={onDownloadPdf} style={{ border: 0, borderRadius: 10, background: "#1D4ED8", color: "#fff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
                  Download PDF
                </button>
                {canonicalUrl ? <a href={canonicalUrl} style={{ color: "#1D4ED8", fontWeight: 700, alignSelf: "center" }}>{canonicalUrl}</a> : null}
              </div>
              {report.accessPin ? <div style={{ marginTop: 8, color: "#92400E", fontSize: 12 }}>Access PIN: <strong>{report.accessPin}</strong></div> : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
