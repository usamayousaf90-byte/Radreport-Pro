const { useEffect, useMemo, useState } = React;

function pill(color, bg) {
  return {
    fontSize: 12,
    color: color,
    background: bg,
    borderRadius: 999,
    padding: "4px 10px",
    fontWeight: 700,
    display: "inline-block"
  };
}

const TEST_OPTIONS = ["Ultrasound", "X-ray", "CT", "MRI", "Lab test"];
const QUEUE_STATUS = ["Waiting", "In Progress", "Ready for Reporting", "Completed"];

function uid() {
  return "L-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function loadLocalPatients() {
  try {
    const raw = localStorage.getItem("rrp_local_patients_v1");
    const out = raw ? JSON.parse(raw) : [];
    return Array.isArray(out) ? out : [];
  } catch (e) {
    return [];
  }
}

function loadLocalQueue() {
  try {
    const raw = localStorage.getItem("rrp_local_queue_v1");
    const out = raw ? JSON.parse(raw) : [];
    return Array.isArray(out) ? out : [];
  } catch (e) {
    return [];
  }
}

function saveLocalPatients(data) {
  localStorage.setItem("rrp_local_patients_v1", JSON.stringify(data));
}

function saveLocalQueue(data) {
  localStorage.setItem("rrp_local_queue_v1", JSON.stringify(data));
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function App() {
  const [patient, setPatient] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    referringDoctor: "",
    address: "",
    cnic: ""
  });
  const [selectedTests, setSelectedTests] = useState(["Ultrasound"]);
  const [operatorName, setOperatorName] = useState("Reception");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [storageMode, setStorageMode] = useState("cloud");

  const filteredPatients = useMemo(function() {
    const q = search.trim().toLowerCase();
    const base = patients.slice().sort(function(a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });

    if (!q) return base.slice(0, 40);

    return base.filter(function(p) {
      const hay = [p.id, p.name, p.phone, p.cnic, p.referringDoctor].join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 40);
  }, [patients, search]);

  function setField(key, value) {
    setPatient(function(prev) {
      return { ...prev, [key]: value };
    });
  }

  function resetForm() {
    setPatient({
      name: "",
      age: "",
      gender: "",
      phone: "",
      referringDoctor: "",
      address: "",
      cnic: ""
    });
    setSelectedTests(["Ultrasound"]);
    setSelectedPatient(null);
  }

  async function loadCloud() {
    const res = await fetch("/api/patients");
    if (!res.ok) {
      const data = await res.json().catch(function() { return {}; });
      throw new Error((data && data.error && data.error.message) || ("HTTP " + res.status));
    }
    const data = await res.json().catch(function() { return {}; });
    setPatients(Array.isArray(data.patients) ? data.patients : []);
    setQueue(Array.isArray(data.queue) ? data.queue : []);
  }

  function loadLocal() {
    setPatients(loadLocalPatients());
    setQueue(loadLocalQueue());
  }

  async function refreshData() {
    try {
      await loadCloud();
      setStorageMode("cloud");
    } catch (err) {
      loadLocal();
      setStorageMode("local");
      setMessage("Cloud unavailable, using local storage.");
    }
  }

  useEffect(function() {
    refreshData();
  }, []);

  async function submitRegistration() {
    setMessage("");

    if (!selectedTests.length) {
      setMessage("Select at least one test.");
      return;
    }

    if (!selectedPatient && !patient.name.trim()) {
      setMessage("Patient name is required.");
      return;
    }

    setSaving(true);

    const payload = {
      action: "register",
      existingPatientId: selectedPatient ? selectedPatient.id : "",
      patient: patient,
      tests: selectedTests,
      operatorName: operatorName
    };

    try {
      if (storageMode === "cloud") {
        const res = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error((data && data.error && data.error.message) || "Registration failed");

        setMessage("Registered successfully. Patient ID: " + (data.patient ? data.patient.id : "-"));
        await refreshData();
      } else {
        const list = loadLocalPatients();
        const q = loadLocalQueue();
        const ts = new Date().toISOString();
        let activePatient = null;

        if (selectedPatient) {
          activePatient = list.find(function(p) { return p.id === selectedPatient.id; }) || null;
        }

        if (!activePatient) {
          activePatient = {
            id: "LOCAL-" + String(list.length + 1).padStart(4, "0"),
            name: patient.name.trim(),
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone,
            referringDoctor: patient.referringDoctor,
            address: patient.address,
            cnic: patient.cnic,
            createdAt: ts,
            updatedAt: ts,
            history: []
          };
          list.unshift(activePatient);
        } else {
          activePatient.name = patient.name || activePatient.name;
          activePatient.age = patient.age || activePatient.age;
          activePatient.gender = patient.gender || activePatient.gender;
          activePatient.phone = patient.phone || activePatient.phone;
          activePatient.referringDoctor = patient.referringDoctor || activePatient.referringDoctor;
          activePatient.address = patient.address || activePatient.address;
          activePatient.cnic = patient.cnic || activePatient.cnic;
          activePatient.updatedAt = ts;
        }

        const visitId = uid();
        const visit = {
          visitId: visitId,
          date: ts,
          tests: selectedTests,
          status: "Registered",
          operatorName: operatorName || "Reception"
        };

        if (!Array.isArray(activePatient.history)) activePatient.history = [];
        activePatient.history.unshift(visit);
        selectedTests.forEach(function(test) {
          q.push({
            queueId: uid(),
            visitId: visitId,
            patientId: activePatient.id,
            patientName: activePatient.name,
            modality: test,
            status: "Waiting",
            createdAt: ts
          });
        });

        saveLocalPatients(list);
        saveLocalQueue(q);
        setPatients(list);
        setQueue(q);
        setMessage("Registered in local mode. Patient ID: " + activePatient.id);
      }

      resetForm();
    } catch (err) {
      setMessage(err && err.message ? err.message : "Registration failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateQueueStatus(item, status) {
    if (!item || !item.queueId || !status) return;

    if (storageMode === "cloud") {
      try {
        const res = await fetch("/api/patients", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "queue_status", queueId: item.queueId, status: status })
        });
        const data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error((data && data.error && data.error.message) || "Status update failed");
        await refreshData();
      } catch (err) {
        setMessage(err && err.message ? err.message : "Status update failed");
      }
      return;
    }

    const q = loadLocalQueue().map(function(row) {
      if (row.queueId === item.queueId) return { ...row, status: status };
      return row;
    });
    saveLocalQueue(q);
    setQueue(q);
  }

  function onPickPatient(row) {
    setSelectedPatient(row);
    setPatient({
      name: row.name || "",
      age: row.age || "",
      gender: row.gender || "",
      phone: row.phone || "",
      referringDoctor: row.referringDoctor || "",
      address: row.address || "",
      cnic: row.cnic || ""
    });
    setMessage("Selected existing patient: " + row.id);
  }

  function toggleTest(testName) {
    setSelectedTests(function(prev) {
      if (prev.includes(testName)) return prev.filter(function(x) { return x !== testName; });
      return prev.concat(testName);
    });
  }

  const queueOrdered = queue.slice().sort(function(a, b) {
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Reception</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 1: Patient Registration, Search, History, Queue</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/billing.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Billing</a>
            <a href="/technician.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Technician</a>
            <a href="/radiologist.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Radiologist</a>
            <a href="/portal" style={{ color: "#1D4ED8", fontWeight: 700 }}>Patient Portal</a>
            <a href="/records" style={{ color: "#1D4ED8", fontWeight: 700 }}>Records</a>
            <a href="/admin" style={{ color: "#1D4ED8", fontWeight: 700 }}>Admin</a>
            <div style={storageMode === "cloud" ? pill("#166534", "#DCFCE7") : pill("#92400E", "#FEF3C7")}>
              {storageMode === "cloud" ? "Cloud Storage" : "Local Storage"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE6F1", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)", padding: 18 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Register Patient</h2>

            {selectedPatient ? (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 10, padding: "8px 10px", marginBottom: 12, fontSize: 13 }}>
                Existing patient selected: <strong>{selectedPatient.id}</strong>
                <button onClick={resetForm} style={{ marginLeft: 10, border: 0, background: "transparent", color: "#1D4ED8", textDecoration: "underline", cursor: "pointer" }}>
                  Clear selection
                </button>
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Patient name" value={patient.name} onChange={(e) => setField("name", e.target.value)} style={inputStyle} />
              <input placeholder="Age" value={patient.age} onChange={(e) => setField("age", e.target.value)} style={inputStyle} />
              <select value={patient.gender} onChange={(e) => setField("gender", e.target.value)} style={inputStyle}>
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <input placeholder="Phone" value={patient.phone} onChange={(e) => setField("phone", e.target.value)} style={inputStyle} />
              <input placeholder="Referring doctor" value={patient.referringDoctor} onChange={(e) => setField("referringDoctor", e.target.value)} style={inputStyle} />
              <input placeholder="CNIC / ID" value={patient.cnic} onChange={(e) => setField("cnic", e.target.value)} style={inputStyle} />
              <input placeholder="Address" value={patient.address} onChange={(e) => setField("address", e.target.value)} style={{ ...inputStyle, gridColumn: "1 / span 2" }} />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 7 }}>Select tests</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TEST_OPTIONS.map(function(t) {
                  const active = selectedTests.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTest(t)}
                      style={{
                        border: active ? "1px solid #1D4ED8" : "1px solid #CBD5E1",
                        background: active ? "#DBEAFE" : "#fff",
                        color: active ? "#1D4ED8" : "#334155",
                        borderRadius: 999,
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontWeight: 700
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input placeholder="Operator name" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} style={inputStyle} />
              <button onClick={submitRegistration} disabled={saving} style={primaryBtn}>
                {saving ? "Saving..." : "Register & Add To Queue"}
              </button>
            </div>

            {message ? <div style={{ marginTop: 10, fontSize: 13, color: "#0F766E" }}>{message}</div> : null}
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE6F1", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)", padding: 18 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Search Existing Patient</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name, phone, CNIC" style={inputStyle} />

            <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              {filteredPatients.length ? filteredPatients.map(function(row) {
                return (
                  <button
                    key={row.id}
                    onClick={() => onPickPatient(row)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      borderBottom: "1px solid #F1F5F9",
                      background: "#fff",
                      padding: "10px 11px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.name || "Unnamed"}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{row.id} | {row.phone || "No phone"}</div>
                  </button>
                );
              }) : <div style={{ padding: 12, color: "#64748B" }}>No patient found.</div>}
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 17 }}>Patient History</h3>
              {!selectedPatient ? <div style={{ color: "#64748B", fontSize: 13 }}>Select a patient to view history.</div> : (
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, maxHeight: 210, overflow: "auto" }}>
                  {(selectedPatient.history || []).length ? (selectedPatient.history || []).map(function(h) {
                    return (
                      <div key={h.visitId} style={{ padding: "9px 10px", borderBottom: "1px solid #F1F5F9", fontSize: 13 }}>
                        <div style={{ fontWeight: 700 }}>{(h.tests || []).join(", ")}</div>
                        <div style={{ color: "#64748B" }}>{formatTime(h.date)} | {h.status || "Registered"}</div>
                      </div>
                    );
                  }) : <div style={{ padding: 10, color: "#64748B", fontSize: 13 }}>No previous history.</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE6F1", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)", padding: 18, marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Queue Management</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Patient ID</th>
                  <th style={thStyle}>Patient Name</th>
                  <th style={thStyle}>Test</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {queueOrdered.length ? queueOrdered.map(function(item) {
                  return (
                    <tr key={item.queueId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={tdStyle}>{formatTime(item.createdAt)}</td>
                      <td style={tdStyle}>{item.patientId}</td>
                      <td style={tdStyle}>{item.patientName}</td>
                      <td style={tdStyle}>{item.modality}</td>
                      <td style={tdStyle}>
                        <span style={
                          item.status === "Completed"
                            ? pill("#166534", "#DCFCE7")
                            : item.status === "Ready for Reporting"
                            ? pill("#15803D", "#DCFCE7")
                            : item.status === "In Progress"
                            ? pill("#1E40AF", "#DBEAFE")
                            : pill("#92400E", "#FEF3C7")
                        }>{item.status}</span>
                      </td>
                      <td style={tdStyle}>
                        <select value={item.status || "Waiting"} onChange={(e) => updateQueueStatus(item, e.target.value)} style={smallSelect}>
                          {QUEUE_STATUS.map(function(s) { return <option key={s}>{s}</option>; })}
                        </select>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={{ padding: "12px", color: "#64748B" }}>Queue is empty.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  padding: "10px 11px",
  outline: "none",
  boxSizing: "border-box",
  fontSize: 14
};

const primaryBtn = {
  border: 0,
  borderRadius: 10,
  background: "#1D4ED8",
  color: "#fff",
  padding: "10px 13px",
  fontWeight: 700,
  cursor: "pointer"
};

const thStyle = { padding: "10px 8px" };
const tdStyle = { padding: "8px" };

const smallSelect = {
  width: "100%",
  minWidth: 120,
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 12,
  background: "#fff"
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
