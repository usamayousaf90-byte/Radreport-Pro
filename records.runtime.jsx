const { useEffect, useMemo, useState } = React;

const TEST_TYPES = ["All", "Ultrasound", "X-ray", "CT", "MRI", "Lab test"];

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

function formatAmount(v) {
  return "PKR " + Number(v || 0).toLocaleString();
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

function buildLocalDataset(filters) {
  const patients = localRead("rrp_local_patients_v1", []);
  const queue = localRead("rrp_local_queue_v1", []);
  const reports = localRead("rrp_local_reports_v1", []);
  const receipts = localRead("rrp_local_receipts_v1", []);
  const entries = localRead("rrp_local_tech_entries_v1", []);

  const reportMap = {};
  reports.forEach(function(r) {
    if (r && r.queueId != null) reportMap[String(r.queueId)] = r;
  });

  const entryMap = {};
  entries.forEach(function(e) {
    if (e && e.queueId != null) entryMap[String(e.queueId)] = e;
  });

  const timelineMap = {};
  function push(pid, event) {
    const id = String(pid || "");
    if (!id) return;
    if (!timelineMap[id]) timelineMap[id] = [];
    timelineMap[id].push(event);
  }

  queue.forEach(function(q) {
    const rpt = reportMap[String(q.queueId)] || null;
    const ent = entryMap[String(q.queueId)] || null;
    push(q.patientId, {
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
  });

  receipts.forEach(function(rc) {
    const tests = Array.isArray(rc.tests) ? rc.tests : [];
    tests.forEach(function(t) {
      push(rc.patientId, {
        eventType: "Billing",
        date: rc.createdAt || "",
        testType: t.name || "",
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
        amount: Number(t.unitPrice || 0) * Number(t.qty || 0),
        paymentMethod: rc.paymentMethod || "",
        quantity: Number(t.qty || 0)
      });
    });
  });

  patients.forEach(function(p) {
    const history = Array.isArray(p.history) ? p.history : [];
    history.forEach(function(h) {
      const tests = Array.isArray(h.tests) ? h.tests : [];
      tests.forEach(function(test) {
        push(p.id, {
          eventType: "Registration",
          date: h.date || "",
          testType: test || "",
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
      });
    });
  });

  const outPatients = [];
  let eventsTotal = 0;
  let revenueTotal = 0;

  patients.forEach(function(p) {
    const fullTimeline = (timelineMap[String(p.id)] || []).slice().sort(function(a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });

    let rows = fullTimeline;
    if (filters.testType && filters.testType !== "All") {
      rows = rows.filter(function(e) { return String(e.testType || "") === filters.testType; });
    }

    if (filters.dateFrom || filters.dateTo) {
      rows = rows.filter(function(e) {
        const t = toDateMs(e.date);
        if (!t) return false;
        if (filters.dateFrom) {
          const from = toDateMs(filters.dateFrom + "T00:00:00");
          if (from && t < from) return false;
        }
        if (filters.dateTo) {
          const to = toDateMs(filters.dateTo + "T23:59:59");
          if (to && t > to) return false;
        }
        return true;
      });
    }

    const hay = [
      p.id,
      p.name,
      p.phone,
      p.cnic,
      p.referringDoctor,
      rows.map(function(e) {
        return [e.testType, e.eventType, e.queueStatus, e.reportStatus, e.reportId, e.publicReportId, e.receiptId].join(" ");
      }).join(" ")
    ].join(" ").toLowerCase();

    if (filters.query && hay.indexOf(filters.query.toLowerCase()) === -1) return;

    eventsTotal += rows.length;
    revenueTotal += rows.reduce(function(sum, e) { return sum + Number(e.amount || 0); }, 0);

    const last = rows[0] || fullTimeline[0] || null;
    const finalizedCount = rows.filter(function(e) { return String(e.reportStatus) === "Finalized"; }).length;

    outPatients.push({
      id: p.id || "",
      mrn: p.id || "",
      name: p.name || "",
      age: p.age || "",
      gender: p.gender || "",
      phone: p.phone || "",
      cnic: p.cnic || "",
      address: p.address || "",
      referringDoctor: p.referringDoctor || "",
      totalTimelineEvents: rows.length,
      totalReportsFinalized: finalizedCount,
      totalRevenue: rows.reduce(function(sum, e) { return sum + Number(e.amount || 0); }, 0),
      lastVisitAt: last ? (last.date || "") : "",
      lastTestType: last ? (last.testType || "") : "",
      timeline: rows.slice(0, 800)
    });
  });

  outPatients.sort(function(a, b) {
    return String(b.lastVisitAt || "").localeCompare(String(a.lastVisitAt || ""));
  });

  return {
    patients: outPatients,
    stats: {
      totalPatients: outPatients.length,
      totalTimelineEvents: eventsTotal,
      totalRevenue: Math.round(revenueTotal),
      generatedAt: new Date().toISOString()
    }
  };
}

function App() {
  const [storageMode, setStorageMode] = useState("cloud");
  const [query, setQuery] = useState("");
  const [testType, setTestType] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ totalPatients: 0, totalTimelineEvents: 0, totalRevenue: 0, generatedAt: "" });
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPatient = useMemo(function() {
    return patients.find(function(p) { return p.id === selectedPatientId; }) || null;
  }, [patients, selectedPatientId]);

  const totalFinalized = useMemo(function() {
    return patients.reduce(function(sum, p) { return sum + Number(p.totalReportsFinalized || 0); }, 0);
  }, [patients]);

  async function refresh() {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        query: query,
        testType: testType,
        dateFrom: dateFrom,
        dateTo: dateTo
      });

      const res = await fetch("/api/records?" + params.toString());
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) throw new Error((data && data.error && data.error.message) || "Records load failed");

      const list = Array.isArray(data.patients) ? data.patients : [];
      setPatients(list);
      setStats(data.stats || { totalPatients: list.length, totalTimelineEvents: 0, totalRevenue: 0, generatedAt: "" });
      setStorageMode("cloud");
      if (selectedPatientId && !list.some(function(p) { return p.id === selectedPatientId; })) setSelectedPatientId("");
    } catch (err) {
      const local = buildLocalDataset({ query: query, testType: testType, dateFrom: dateFrom, dateTo: dateTo });
      setPatients(Array.isArray(local.patients) ? local.patients : []);
      setStats(local.stats || { totalPatients: 0, totalTimelineEvents: 0, totalRevenue: 0, generatedAt: "" });
      setStorageMode("local");
      setMessage("Cloud unavailable, using local records.");
      if (selectedPatientId && !(local.patients || []).some(function(p) { return p.id === selectedPatientId; })) setSelectedPatientId("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    refresh();
  }, []);

  function exportSelected() {
    if (!selectedPatient) {
      setMessage("Select a patient first.");
      return;
    }

    const blob = new Blob([JSON.stringify(selectedPatient, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "records-" + (selectedPatient.mrn || selectedPatient.id || "patient") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Record Management</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 7: Name/Phone/MRN/Test/Date search with complete patient timeline</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/reception.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Reception + Billing</a>
            <a href="/radiologist.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Radiologist</a>
            <a href="/portal" style={{ color: "#1D4ED8", fontWeight: 700 }}>Patient Portal</a>
            <a href="/admin" style={{ color: "#1D4ED8", fontWeight: 700 }}>Admin</a>
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
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto auto", gap: 10, alignItems: "center" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Name, Phone, MRN, CNIC, Doctor, Report ID" style={inputStyle()} />
            <select value={testType} onChange={(e) => setTestType(e.target.value)} style={inputStyle()}>
              {TEST_TYPES.map(function(t) { return <option key={t}>{t}</option>; })}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle()} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle()} />
            <button onClick={refresh} style={btnStyle(true)} disabled={loading}>{loading ? "Loading..." : "Search"}</button>
            <button onClick={exportSelected} style={btnStyle(false)}>Export Patient JSON</button>
          </div>
          {message ? <div style={{ marginTop: 8, color: "#0F766E", fontSize: 13 }}>{message}</div> : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={boxStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Total Patients</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.totalPatients || 0}</div>
          </div>
          <div style={boxStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Timeline Events</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.totalTimelineEvents || 0}</div>
          </div>
          <div style={boxStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Finalized Reports</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{totalFinalized || 0}</div>
          </div>
          <div style={boxStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Revenue</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{formatAmount(stats.totalRevenue || 0)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "0.78fr 1.22fr", gap: 16 }}>
          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Patient Database</h2>
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, maxHeight: 640, overflow: "auto" }}>
              {patients.length ? patients.map(function(p) {
                const active = selectedPatientId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
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
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>{p.name || "Unnamed"}</div>
                      <div style={{ fontSize: 11, color: "#1E40AF", fontWeight: 700 }}>{p.mrn}</div>
                    </div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{p.phone || "No phone"} | {p.gender || "-"}</div>
                    <div style={{ color: "#64748B", fontSize: 11 }}>Last: {p.lastTestType || "-"} | {formatTime(p.lastVisitAt)}</div>
                  </button>
                );
              }) : <div style={{ padding: 12, color: "#64748B" }}>No patients found.</div>}
            </div>
          </div>

          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Patient History Timeline</h2>
            {!selectedPatient ? (
              <div style={{ color: "#64748B", fontSize: 13 }}>Select patient to see detailed history.</div>
            ) : (
              <>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13 }}>
                  <div><strong>{selectedPatient.name}</strong> ({selectedPatient.mrn})</div>
                  <div>Age/Gender: {selectedPatient.age || "-"} / {selectedPatient.gender || "-"}</div>
                  <div>Phone: {selectedPatient.phone || "-"} | CNIC: {selectedPatient.cnic || "-"}</div>
                  <div>Referring Doctor: {selectedPatient.referringDoctor || "-"}</div>
                  <div>Total Events: {selectedPatient.totalTimelineEvents || 0} | Finalized Reports: {selectedPatient.totalReportsFinalized || 0} | Revenue: {formatAmount(selectedPatient.totalRevenue || 0)}</div>
                </div>

                <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #E2E8F0" }}>
                        <th style={{ padding: "10px 8px" }}>Date</th>
                        <th style={{ padding: "10px 8px" }}>Event</th>
                        <th style={{ padding: "10px 8px" }}>Test</th>
                        <th style={{ padding: "10px 8px" }}>Queue</th>
                        <th style={{ padding: "10px 8px" }}>Report</th>
                        <th style={{ padding: "10px 8px" }}>Billing</th>
                        <th style={{ padding: "10px 8px" }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPatient.timeline || []).length ? (selectedPatient.timeline || []).map(function(e, idx) {
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "8px" }}>{formatTime(e.date)}</td>
                            <td style={{ padding: "8px", fontWeight: 700 }}>{e.eventType || "-"}</td>
                            <td style={{ padding: "8px" }}>{e.testType || "-"}</td>
                            <td style={{ padding: "8px" }}>{e.queueStatus || "-"}</td>
                            <td style={{ padding: "8px" }}>
                              {e.reportStatus || "-"}
                              {e.publicReportId ? <div style={{ color: "#1E40AF" }}>#{e.publicReportId}</div> : null}
                            </td>
                            <td style={{ padding: "8px" }}>{e.receiptId ? (e.receiptId + " | " + formatAmount(e.amount || 0)) : "-"}</td>
                            <td style={{ padding: "8px", maxWidth: 260 }}>{e.notePreview || "-"}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={7} style={{ padding: "12px", color: "#64748B" }}>No timeline records in selected filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
