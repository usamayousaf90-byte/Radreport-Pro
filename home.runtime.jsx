const { useEffect, useState } = React;

function cardStyle() {
  return {
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #DDE6F1",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.1)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  };
}

function barStyle(gradient) {
  return {
    height: 8,
    background: gradient
  };
}

function buttonStyle(color) {
  return {
    display: "inline-block",
    textDecoration: "none",
    background: color,
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 14
  };
}

function formatAmount(v) {
  return "PKR " + Number(v || 0).toLocaleString();
}

function App() {
  const [summary, setSummary] = useState(null);

  useEffect(function() {
    fetch("/api/admin?window=7d")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.summary) setSummary(data.summary);
      })
      .catch(function() {});
  }, []);

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "radial-gradient(circle at 10% 10%, #E0F2FE 0%, #F8FAFC 45%, #EEF2FF 100%)", color: "#0F172A" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, color: "#334155", fontWeight: 700, letterSpacing: 0.5 }}>RADREPORTPRO</div>
            <h1 style={{ margin: "4px 0 6px", fontSize: 36, lineHeight: 1.1 }}>Choose Workspace</h1>
            <div style={{ color: "#475569", maxWidth: 660 }}>
              Template authoring and RIS operations are now separated into two independent workspaces.
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #DDE6F1", borderRadius: 12, padding: "10px 12px", minWidth: 280 }}>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6, fontWeight: 700 }}>RIS 7-Day Snapshot</div>
            {summary ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                <div><strong>Patients:</strong> {summary.totalPatients || 0}</div>
                <div><strong>Revenue:</strong> {formatAmount(summary.totalRevenue || 0)}</div>
                <div><strong>Pending:</strong> {summary.pendingReports || 0}</div>
                <div><strong>Completed:</strong> {summary.completedReports || 0}</div>
              </div>
            ) : <div style={{ color: "#64748B", fontSize: 12 }}>Load RIS dashboard to view metrics.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
          <div style={cardStyle()}>
            <div style={barStyle("linear-gradient(90deg,#1D4ED8,#0EA5E9)")} />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>RIS System</div>
              <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.45, minHeight: 66 }}>
                Reception and billing, technician workflow, radiologist reporting, report portal, patient portal, records and admin analytics.
              </div>
              <div style={{ marginTop: "auto" }}>
                <a href="/ris" style={buttonStyle("#1D4ED8")}>Open RIS Dashboard</a>
              </div>
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={barStyle("linear-gradient(90deg,#0F766E,#14B8A6)")} />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Template Suite</div>
              <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.45, minHeight: 66 }}>
                Legacy RadReport template engine, shortcut manager and AI-assisted draft composer for rapid structured report writing.
              </div>
              <div style={{ marginTop: "auto" }}>
                <a href="/templates" style={buttonStyle("#0F766E")}>Open Template Suite</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
