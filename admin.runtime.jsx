const { useEffect, useMemo, useState } = React;

const WINDOW_OPTIONS = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" }
];

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
    padding: 16
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

function formatAmount(v) {
  return "PKR " + Number(v || 0).toLocaleString();
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function toDateMs(input) {
  if (!input) return 0;
  const d = new Date(input);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function startOfDayMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDayMs(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function dayKey(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
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

function parseWindow(windowName, dateFrom, dateTo) {
  const now = Date.now();
  if (dateFrom || dateTo) {
    let start = dateFrom ? toDateMs(dateFrom + "T00:00:00") : 0;
    let end = dateTo ? toDateMs(dateTo + "T23:59:59") : now;
    if (!end) end = now;
    if (start && end && start > end) {
      const t = start;
      start = end;
      end = t;
    }
    return { start: start, end: end, label: "custom", dateFrom: dateFrom, dateTo: dateTo };
  }

  if (windowName === "1d") return { start: startOfDayMs(now), end: now, label: "1d", dateFrom: "", dateTo: "" };
  if (windowName === "7d") return { start: startOfDayMs(now - 6 * 86400000), end: now, label: "7d", dateFrom: "", dateTo: "" };
  if (windowName === "30d") return { start: startOfDayMs(now - 29 * 86400000), end: now, label: "30d", dateFrom: "", dateTo: "" };
  return { start: 0, end: now, label: "all", dateFrom: "", dateTo: "" };
}

function inRange(ts, range) {
  const t = toDateMs(ts);
  if (!t) return false;
  if (range.start && t < range.start) return false;
  if (range.end && t > range.end) return false;
  return true;
}

function buildLocalDashboard(windowName, dateFrom, dateTo) {
  const patients = localRead("rrp_local_patients_v1", []);
  const queue = localRead("rrp_local_queue_v1", []);
  const reports = localRead("rrp_local_reports_v1", []);
  const receipts = localRead("rrp_local_receipts_v1", []);

  const range = parseWindow(windowName, dateFrom, dateTo);
  const todayRange = { start: startOfDayMs(Date.now()), end: endOfDayMs(Date.now()) };

  function summary(rangeUse) {
    const pset = {};
    let revenue = 0;
    let pending = 0;
    let completed = 0;
    const byStatus = {};

    queue.forEach(function(q) {
      if (!inRange(q.createdAt, rangeUse)) return;
      if (q.patientId) pset[String(q.patientId)] = true;
      const s = String(q.status || "Waiting");
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (s === "Completed") completed += 1;
      else pending += 1;
    });

    receipts.forEach(function(r) {
      if (!inRange(r.createdAt, rangeUse)) return;
      if (r.patientId) pset[String(r.patientId)] = true;
      revenue += Number(r.totalAmount || 0);
    });

    patients.forEach(function(p) {
      if (inRange(p.createdAt, rangeUse) && p.id) pset[String(p.id)] = true;
    });

    return {
      totalPatients: Object.keys(pset).length,
      totalRevenue: Math.round(revenue),
      pendingReports: pending,
      completedReports: completed,
      queueStatus: byStatus
    };
  }

  const modeUsageMap = {};
  queue.forEach(function(q) {
    if (!inRange(q.createdAt, range)) return;
    const m = String(q.modality || "Unknown");
    modeUsageMap[m] = (modeUsageMap[m] || 0) + 1;
  });

  const modalityUsage = Object.keys(modeUsageMap)
    .map(function(m) { return { modality: m, count: modeUsageMap[m] }; })
    .sort(function(a, b) { return b.count - a.count; });

  const refMap = {};
  receipts.forEach(function(r) {
    if (!inRange(r.createdAt, range)) return;
    const d = String(r.referringDoctor || "").trim() || "Unknown";
    refMap[d] = (refMap[d] || 0) + 1;
  });

  if (!Object.keys(refMap).length) {
    patients.forEach(function(p) {
      if (!inRange(p.createdAt, range)) return;
      const d = String(p.referringDoctor || "").trim() || "Unknown";
      refMap[d] = (refMap[d] || 0) + 1;
    });
  }

  const doctorReferrals = Object.keys(refMap)
    .map(function(d) { return { doctor: d, count: refMap[d] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 12);

  const trendMap = {};
  const trendStart = range.start || startOfDayMs(Date.now() - 6 * 86400000);
  const trendEnd = range.end || Date.now();
  for (let t = startOfDayMs(trendStart); t <= endOfDayMs(trendEnd); t += 86400000) {
    trendMap[dayKey(t)] = 0;
  }

  receipts.forEach(function(r) {
    if (!inRange(r.createdAt, { start: startOfDayMs(trendStart), end: endOfDayMs(trendEnd) })) return;
    const k = dayKey(toDateMs(r.createdAt));
    trendMap[k] = (trendMap[k] || 0) + Number(r.totalAmount || 0);
  });

  const revenueTrend = Object.keys(trendMap).sort().map(function(day) {
    return { day: day, revenue: Math.round(trendMap[day] || 0) };
  });

  const finalizedReports = reports.filter(function(r) {
    return String((r && r.status) || "") === "Finalized" && inRange(r.finalizedAt || r.updatedAt || r.createdAt, range);
  }).length;

  const draftOrSignedReports = reports.filter(function(r) {
    const s = String((r && r.status) || "");
    return (s === "Draft" || s === "Signed") && inRange(r.updatedAt || r.createdAt, range);
  }).length;

  return {
    range: range,
    today: summary(todayRange),
    summary: {
      ...summary(range),
      finalizedReports: finalizedReports,
      draftOrSignedReports: draftOrSignedReports
    },
    charts: {
      modalityUsage: modalityUsage,
      revenueTrend: revenueTrend,
      doctorReferrals: doctorReferrals
    },
    generatedAt: new Date().toISOString()
  };
}

function App() {
  const [storageMode, setStorageMode] = useState("cloud");
  const [windowName, setWindowName] = useState("7d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({ window: windowName, dateFrom: dateFrom, dateTo: dateTo });
      const res = await fetch("/api/admin?" + params.toString());
      const out = await res.json().catch(function() { return {}; });
      if (!res.ok) throw new Error((out && out.error && out.error.message) || "Admin data load failed");
      setData(out);
      setStorageMode("cloud");
    } catch (err) {
      const local = buildLocalDashboard(windowName, dateFrom, dateTo);
      setData(local);
      setStorageMode("local");
      setMessage("Cloud unavailable, using local dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    refresh();
  }, []);

  const summary = data && data.summary ? data.summary : {};
  const today = data && data.today ? data.today : {};
  const charts = data && data.charts ? data.charts : { modalityUsage: [], revenueTrend: [], doctorReferrals: [] };

  const maxModality = useMemo(function() {
    return Math.max(1, ...(charts.modalityUsage || []).map(function(x) { return Number(x.count || 0); }));
  }, [charts]);

  const maxRevenue = useMemo(function() {
    return Math.max(1, ...(charts.revenueTrend || []).map(function(x) { return Number(x.revenue || 0); }));
  }, [charts]);

  const maxRef = useMemo(function() {
    return Math.max(1, ...(charts.doctorReferrals || []).map(function(x) { return Number(x.count || 0); }));
  }, [charts]);

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Admin Dashboard</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 8: Daily KPIs, Modality Usage, Revenue Trend, Referral Analytics</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/reception.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Reception</a>
            <a href="/billing.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Billing</a>
            <a href="/technician.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Technician</a>
            <a href="/records" style={{ color: "#1D4ED8", fontWeight: 700 }}>Records</a>
            <a href="/radiologist.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Radiologist</a>
            <a href="/portal" style={{ color: "#1D4ED8", fontWeight: 700 }}>Patient Portal</a>
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

        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
            <select value={windowName} onChange={(e) => setWindowName(e.target.value)} style={inputStyle()}>
              {WINDOW_OPTIONS.map(function(w) { return <option key={w.value} value={w.value}>{w.label}</option>; })}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle()} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle()} />
            <button onClick={refresh} disabled={loading} style={btnStyle(true)}>{loading ? "Loading..." : "Refresh"}</button>
          </div>
          {message ? <div style={{ marginTop: 8, color: "#0F766E", fontSize: 13 }}>{message}</div> : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Total Patients (Range)</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{summary.totalPatients || 0}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Total Revenue (Range)</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{formatAmount(summary.totalRevenue || 0)}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Pending Reports</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{summary.pendingReports || 0}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Completed Reports</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{summary.completedReports || 0}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Today Patients</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{today.totalPatients || 0}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Today Revenue</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{formatAmount(today.totalRevenue || 0)}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ color: "#64748B", fontSize: 12 }}>Draft/Signed Reports</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{summary.draftOrSignedReports || 0}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Modality Usage</h2>
            {(charts.modalityUsage || []).length ? (charts.modalityUsage || []).map(function(item) {
              const width = Math.max(6, Math.round((Number(item.count || 0) / maxModality) * 100));
              return (
                <div key={item.modality} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>{item.modality}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div style={{ height: 10, background: "#E2E8F0", borderRadius: 999 }}>
                    <div style={{ height: 10, width: width + "%", background: "#1D4ED8", borderRadius: 999 }} />
                  </div>
                </div>
              );
            }) : <div style={{ color: "#64748B", fontSize: 13 }}>No data.</div>}
          </div>

          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Doctor Referrals</h2>
            {(charts.doctorReferrals || []).length ? (charts.doctorReferrals || []).map(function(item) {
              const width = Math.max(6, Math.round((Number(item.count || 0) / maxRef) * 100));
              return (
                <div key={item.doctor} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>{item.doctor}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div style={{ height: 10, background: "#E2E8F0", borderRadius: 999 }}>
                    <div style={{ height: 10, width: width + "%", background: "#0F766E", borderRadius: 999 }} />
                  </div>
                </div>
              );
            }) : <div style={{ color: "#64748B", fontSize: 13 }}>No data.</div>}
          </div>
        </div>

        <div style={cardStyle()}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Revenue Trend</h2>
          {(charts.revenueTrend || []).length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))", gap: 8, alignItems: "end", minHeight: 230 }}>
              {(charts.revenueTrend || []).map(function(point) {
                const h = Math.max(6, Math.round((Number(point.revenue || 0) / maxRevenue) * 180));
                return (
                  <div key={point.day} style={{ textAlign: "center" }}>
                    <div style={{ height: 190, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <div title={point.day + " | " + formatAmount(point.revenue)} style={{ width: 22, height: h, borderRadius: 8, background: "#2563EB" }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{point.day.slice(5)}</div>
                    <div style={{ fontSize: 10, color: "#0F172A", fontWeight: 700 }}>{Math.round(Number(point.revenue || 0) / 1000)}k</div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: "#64748B", fontSize: 13 }}>No trend data.</div>}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>
          Generated: {formatTime(data && data.generatedAt)}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
