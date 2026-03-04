const { useEffect, useState } = React;

function cardStyle(color) {
  return {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #DDE6F1",
    boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  };
}

function colorBar(color) {
  return {
    height: 6,
    width: "100%",
    background: color
  };
}

function btnStyle(bg) {
  return {
    display: "inline-block",
    textDecoration: "none",
    background: bg || "#1D4ED8",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 13px",
    fontWeight: 700,
    fontSize: 13
  };
}

function formatAmount(v) {
  return "PKR " + Number(v || 0).toLocaleString();
}

function App() {
  const [adminSummary, setAdminSummary] = useState(null);

  useEffect(function() {
    fetch("/api/admin?window=7d")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.summary) setAdminSummary(data.summary);
      })
      .catch(function() {});
  }, []);

  const modules = [
    {
      title: "Template Studio (Legacy Engine)",
      desc: "Your original RadReport codebase with full template system, shortcut manager, and prior data flow.",
      href: "/templates",
      color: "linear-gradient(90deg,#0F766E,#14B8A6)",
      button: "#0F766E",
      badge: "Previous Codebase + Templates"
    },
    {
      title: "1. Reception",
      desc: "Patient registration, auto patient ID, queue creation, search and history.",
      href: "/reception.html",
      color: "linear-gradient(90deg,#1D4ED8,#3B82F6)",
      button: "#1D4ED8"
    },
    {
      title: "2. Billing",
      desc: "Cash receipt generation, auto pricing, discount, payment methods, print.",
      href: "/billing.html",
      color: "linear-gradient(90deg,#7C3AED,#A855F7)",
      button: "#7C3AED"
    },
    {
      title: "3. Technician",
      desc: "Attach file metadata, lab values, notes and mark ready for reporting.",
      href: "/technician.html",
      color: "linear-gradient(90deg,#0EA5E9,#22D3EE)",
      button: "#0284C7"
    },
    {
      title: "4. Radiologist",
      desc: "Worklist filters, template reporting, save/sign/finalize and AI draft.",
      href: "/radiologist.html",
      color: "linear-gradient(90deg,#16A34A,#22C55E)",
      button: "#15803D"
    },
    {
      title: "5. Report & Verification",
      desc: "Final report page with QR verification, digital signature and PDF print.",
      href: "/report.html",
      color: "linear-gradient(90deg,#EA580C,#F97316)",
      button: "#C2410C"
    },
    {
      title: "6. Patient Portal",
      desc: "Login by phone/report ID + PIN, view/download/share reports.",
      href: "/portal",
      color: "linear-gradient(90deg,#BE123C,#E11D48)",
      button: "#BE123C"
    },
    {
      title: "7. Records",
      desc: "Full patient database search with complete timeline and export.",
      href: "/records",
      color: "linear-gradient(90deg,#374151,#4B5563)",
      button: "#374151"
    },
    {
      title: "8. Admin Dashboard",
      desc: "KPI overview, revenue trend, modality usage and referral analytics.",
      href: "/admin",
      color: "linear-gradient(90deg,#0F172A,#334155)",
      button: "#0F172A"
    }
  ];

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "radial-gradient(circle at 10% 10%, #DBEAFE 0%, #F8FAFC 42%, #EEF2FF 100%)", color: "#0F172A" }}>
      <div style={{ maxWidth: 1460, margin: "0 auto", padding: "24px 18px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, color: "#334155", fontWeight: 700, letterSpacing: 0.5 }}>RADREPORTPRO</div>
            <h1 style={{ margin: "4px 0 6px", fontSize: 34, lineHeight: 1.1 }}>Unified RIS + LIS + Templates Suite</h1>
            <div style={{ color: "#475569", maxWidth: 830 }}>
              Combined build: your previous template-heavy RadReport engine + all 8 completed modules in one integrated suite.
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #DDE6F1", borderRadius: 12, padding: "10px 12px", minWidth: 300 }}>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6, fontWeight: 700 }}>Quick 7-day Snapshot</div>
            {adminSummary ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                <div><strong>Patients:</strong> {adminSummary.totalPatients || 0}</div>
                <div><strong>Revenue:</strong> {formatAmount(adminSummary.totalRevenue || 0)}</div>
                <div><strong>Pending:</strong> {adminSummary.pendingReports || 0}</div>
                <div><strong>Completed:</strong> {adminSummary.completedReports || 0}</div>
              </div>
            ) : <div style={{ color: "#64748B", fontSize: 12 }}>Load modules to start live metrics.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {modules.map(function(m) {
            return (
              <div key={m.title} style={cardStyle(m.color)}>
                <div style={colorBar(m.color)} />
                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{m.title}</div>
                    {m.badge ? <span style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", borderRadius: 99, padding: "4px 8px", fontSize: 10, fontWeight: 700 }}>{m.badge}</span> : null}
                  </div>
                  <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, minHeight: 58 }}>{m.desc}</div>
                  <div style={{ marginTop: "auto" }}>
                    <a href={m.href} style={btnStyle(m.button)}>Open Module</a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
