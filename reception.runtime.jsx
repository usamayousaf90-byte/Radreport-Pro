const { useEffect, useMemo, useRef, useState } = React;

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
const PAYMENT_OPTIONS = ["Cash", "Card", "Online"];

const DEFAULT_PRICE = {
  "Ultrasound": 3500,
  "X-ray": 1800,
  "CT": 12000,
  "MRI": 20000,
  "Lab test": 1500
};

function uid() {
  return "L-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function newLineItem(name) {
  return { id: uid(), name: name || "", qty: 1 };
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

function loadLocalReceipts() {
  try {
    const raw = localStorage.getItem("rrp_local_receipts_v1");
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

function saveLocalReceipts(data) {
  localStorage.setItem("rrp_local_receipts_v1", JSON.stringify(data));
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
  const [receipts, setReceipts] = useState([]);
  const [priceList, setPriceList] = useState(DEFAULT_PRICE);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [lineItems, setLineItems] = useState([newLineItem("Ultrasound")]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);

  const [saving, setSaving] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [storageMode, setStorageMode] = useState("cloud");

  const patientSearchReqRef = useRef(0);

  const filteredPatients = useMemo(function() {
    const q = search.trim().toLowerCase();
    const base = patients.slice().sort(function(a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });

    if (!q) return base.slice(0, 60);

    return base.filter(function(p) {
      const hay = [p.id, p.name, p.phone, p.cnic, p.referringDoctor].join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 60);
  }, [patients, search]);

  const filteredReceipts = useMemo(function() {
    const q = receiptSearch.trim().toLowerCase();
    const base = receipts.slice().sort(function(a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    if (!q) return base.slice(0, 80);

    return base.filter(function(r) {
      const hay = [
        r.receiptId,
        r.patientId,
        r.patientName,
        r.phone,
        r.paymentMethod,
        (r.tests || []).map(function(t) { return t.name; }).join(" ")
      ].join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 80);
  }, [receipts, receiptSearch]);

  const subtotal = useMemo(function() {
    return lineItems.reduce(function(sum, it) {
      const unit = Number(priceList[it.name] || 0);
      let qty = Number(it.qty || 1);
      if (!Number.isFinite(qty) || qty < 1) qty = 1;
      return sum + unit * Math.floor(qty);
    }, 0);
  }, [lineItems, priceList]);

  const discountSafe = useMemo(function() {
    const d = Number(discount || 0);
    if (!Number.isFinite(d) || d < 0) return 0;
    if (d > subtotal) return subtotal;
    return Math.round(d);
  }, [discount, subtotal]);

  const totalAmount = subtotal - discountSafe;

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
    const [patientsRes, billingRes] = await Promise.all([
      fetch("/api/patients"),
      fetch("/api/billing")
    ]);

    if (!patientsRes.ok || !billingRes.ok) {
      let msg = "Cloud data unavailable";

      try {
        const pData = await patientsRes.json();
        if (pData && pData.error && pData.error.message) msg = pData.error.message;
      } catch (e) {}

      try {
        const bData = await billingRes.json();
        if (bData && bData.error && bData.error.message) msg = bData.error.message;
      } catch (e) {}

      throw new Error(msg);
    }

    const pData = await patientsRes.json().catch(function() { return {}; });
    const bData = await billingRes.json().catch(function() { return {}; });

    setPatients(Array.isArray(pData.patients) ? pData.patients : []);
    setQueue(Array.isArray(pData.queue) ? pData.queue : []);
    setReceipts(Array.isArray(bData.receipts) ? bData.receipts : []);
    setPriceList(bData.priceList || DEFAULT_PRICE);
  }

  async function loadCloudPatients(queryText, requestId) {
    const q = String(queryText || "").trim();
    const url = q ? ("/api/patients?query=" + encodeURIComponent(q)) : "/api/patients";

    const res = await fetch(url);
    const data = await res.json().catch(function() { return {}; });

    if (!res.ok) {
      throw new Error((data && data.error && data.error.message) || ("HTTP " + res.status));
    }

    if (requestId !== patientSearchReqRef.current) return;
    setPatients(Array.isArray(data.patients) ? data.patients : []);
  }

  function loadLocal() {
    setPatients(loadLocalPatients());
    setQueue(loadLocalQueue());
    setReceipts(loadLocalReceipts());
    setPriceList(DEFAULT_PRICE);
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

  useEffect(function() {
    if (storageMode !== "cloud") return;

    const handle = setTimeout(async function() {
      const requestId = patientSearchReqRef.current + 1;
      patientSearchReqRef.current = requestId;
      setPatientSearchLoading(true);

      try {
        await loadCloudPatients(search, requestId);
      } catch (e) {
      } finally {
        if (requestId === patientSearchReqRef.current) setPatientSearchLoading(false);
      }
    }, 220);

    return function() {
      clearTimeout(handle);
    };
  }, [search, storageMode]);

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
        if (data.patient && data.patient.id) {
          setSelectedPatient(data.patient);
          setSearch(data.patient.id);
        }

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
        setSelectedPatient(activePatient);
        setSearch(activePatient.id);
        setMessage("Registered in local mode. Patient ID: " + activePatient.id);
      }

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
    setMessage("Selected patient: " + row.id + " (ready for registration or billing)");
  }

  function toggleTest(testName) {
    setSelectedTests(function(prev) {
      if (prev.includes(testName)) return prev.filter(function(x) { return x !== testName; });
      return prev.concat(testName);
    });
  }

  function addLine() {
    setLineItems(function(prev) {
      return prev.concat(newLineItem(""));
    });
  }

  function removeLine(id) {
    setLineItems(function(prev) {
      if (prev.length <= 1) return prev;
      return prev.filter(function(x) { return x.id !== id; });
    });
  }

  function updateLine(id, patch) {
    setLineItems(function(prev) {
      return prev.map(function(item) {
        if (item.id !== id) return item;
        return { ...item, ...patch };
      });
    });
  }

  function applyLatestPatientVisit() {
    if (!selectedPatient || !Array.isArray(selectedPatient.history) || !selectedPatient.history.length) {
      setMessage("No visit history found for this patient.");
      return;
    }

    const latest = selectedPatient.history[0];
    const tests = Array.isArray(latest.tests) ? latest.tests : [];

    if (!tests.length) {
      setMessage("Latest visit has no tests.");
      return;
    }

    const next = tests.map(function(t) {
      return newLineItem(TEST_OPTIONS.includes(t) ? t : "");
    });

    setLineItems(next.length ? next : [newLineItem("")]);
    setMessage("Applied latest visit tests to billing.");
  }

  async function generateReceipt() {
    setMessage("");

    let activePatient = selectedPatient;
    if (!activePatient || !activePatient.id) {
      const q = String(search || "").trim().toLowerCase();
      if (q) {
        const exact = filteredPatients.filter(function(p) {
          return String(p.id || "").toLowerCase() === q ||
            String(p.name || "").toLowerCase() === q ||
            String(p.phone || "").toLowerCase() === q;
        });

        if (exact.length === 1) {
          activePatient = exact[0];
          setSelectedPatient(exact[0]);
        } else if (filteredPatients.length === 1) {
          activePatient = filteredPatients[0];
          setSelectedPatient(filteredPatients[0]);
        }
      }
    }

    if (!activePatient || !activePatient.id) {
      setMessage("Select patient from list first.");
      return;
    }

    const payloadTests = lineItems
      .filter(function(it) { return it.name && TEST_OPTIONS.includes(it.name); })
      .map(function(it) {
        let qty = Number(it.qty || 1);
        if (!Number.isFinite(qty) || qty < 1) qty = 1;
        return { name: it.name, qty: Math.floor(qty) };
      });

    if (!payloadTests.length) {
      setMessage("Add at least one valid test.");
      return;
    }

    setBillingSaving(true);

    try {
      if (storageMode === "cloud") {
        const res = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: activePatient.id,
            tests: payloadTests,
            discount: discountSafe,
            paymentMethod: paymentMethod,
            operatorName: operatorName
          })
        });

        const data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error((data && data.error && data.error.message) || "Billing failed");

        setLastReceipt(data.receipt || null);
        setMessage("Receipt created: " + (data.receipt ? data.receipt.receiptId : "-"));
        await refreshData();
      } else {
        const ts = new Date().toISOString();
        const local = loadLocalReceipts();

        const normalized = payloadTests.map(function(t) {
          return {
            name: t.name,
            qty: t.qty,
            unitPrice: Number(priceList[t.name] || 0)
          };
        });

        const sub = normalized.reduce(function(s, t) { return s + t.qty * t.unitPrice; }, 0);
        const disc = Math.min(discountSafe, sub);

        const rec = {
          receiptId: "LOCAL-RCP-" + String(local.length + 1).padStart(5, "0"),
          createdAt: ts,
          patientId: activePatient.id,
          patientName: activePatient.name || "",
          age: activePatient.age || "",
          gender: activePatient.gender || "",
          phone: activePatient.phone || "",
          referringDoctor: activePatient.referringDoctor || "",
          operatorName: operatorName || "Reception",
          paymentMethod: paymentMethod,
          tests: normalized,
          subtotal: sub,
          discount: disc,
          totalAmount: sub - disc,
          status: "Paid"
        };

        local.unshift(rec);
        saveLocalReceipts(local);
        setReceipts(local);
        setLastReceipt(rec);
        setMessage("Receipt created in local mode: " + rec.receiptId);
      }
    } catch (err) {
      setMessage(err && err.message ? err.message : "Billing failed");
    } finally {
      setBillingSaving(false);
    }
  }

  function printLastReceipt() {
    if (!lastReceipt) return;
    window.print();
  }

  const queueOrdered = queue.slice().sort(function(a, b) {
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Reception + Billing</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 1: Patient Registration, Search, Queue and Cash Receipt</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href="/ris" style={{ color: "#1D4ED8", fontWeight: 700 }}>RIS Home</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Template Suite</a>
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
                {saving ? "Saving..." : "Register and Add To Queue"}
              </button>
            </div>

            {message ? <div style={{ marginTop: 10, fontSize: 13, color: "#0F766E" }}>{message}</div> : null}
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE6F1", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)", padding: 18 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Search Existing Patient</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name, phone, CNIC" style={inputStyle} />
            {patientSearchLoading ? <div style={{ marginTop: 6, fontSize: 12, color: "#64748B" }}>Searching in cloud...</div> : null}

            <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              {filteredPatients.length ? filteredPatients.map(function(row) {
                const active = selectedPatient && selectedPatient.id === row.id;
                return (
                  <button
                    key={row.id}
                    onClick={() => onPickPatient(row)}
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
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.name || "Unnamed"}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{row.id} | {row.phone || "No phone"}</div>
                  </button>
                );
              }) : <div style={{ padding: 12, color: "#64748B" }}>No patient found.</div>}
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 17 }}>Patient History</h3>
              {!selectedPatient ? <div style={{ color: "#64748B", fontSize: 13 }}>Select a patient to view history and bill.</div> : (
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

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE6F1", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)", padding: 18, marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Billing and Cash Receipt</h2>

          {selectedPatient ? (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 10, padding: "8px 10px", marginBottom: 12, fontSize: 13 }}>
              Selected for billing: <strong>{selectedPatient.name || "Unnamed"}</strong> ({selectedPatient.id})
            </div>
          ) : (
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "8px 10px", marginBottom: 12, fontSize: 13 }}>
              Select patient from Search Existing Patient panel above.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>Tests</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={applyLatestPatientVisit} style={secondaryBtn}>Use Latest Visit</button>
              <button onClick={addLine} style={secondaryBtn}>+ Add Test</button>
            </div>
          </div>

          <div style={{ border: "1px solid #E2E8F0", borderRadius: 10 }}>
            {lineItems.map(function(it) {
              return (
                <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 30px", gap: 8, padding: 10, borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                  <select value={it.name} onChange={(e) => updateLine(it.id, { name: e.target.value })} style={inputStyleSmall}>
                    <option value="">Select test</option>
                    {TEST_OPTIONS.map(function(t) { return <option key={t}>{t}</option>; })}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={it.qty}
                    onChange={(e) => updateLine(it.id, { qty: e.target.value })}
                    style={inputStyleSmall}
                  />
                  <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>
                    {formatAmount((priceList[it.name] || 0) * Number(it.qty || 1))}
                  </div>
                  <button onClick={() => removeLine(it.id)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#B91C1C", fontWeight: 700 }}>x</button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
              {PAYMENT_OPTIONS.map(function(p) { return <option key={p}>{p}</option>; })}
            </select>
            <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="Operator name" style={inputStyle} />
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount PKR" style={inputStyle} />
          </div>

          <div style={{ marginTop: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Subtotal</span><strong>{formatAmount(subtotal)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Discount</span><strong>{formatAmount(discountSafe)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>{formatAmount(totalAmount)}</strong></div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={generateReceipt} disabled={billingSaving} style={primaryBtn}>{billingSaving ? "Saving..." : "Generate Receipt"}</button>
            <button onClick={printLastReceipt} style={secondaryBtn} disabled={!lastReceipt}>Print Last Receipt</button>
          </div>

          <div style={{ marginTop: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Receipts</h3>
            <input
              value={receiptSearch}
              onChange={(e) => setReceiptSearch(e.target.value)}
              placeholder="Search by receipt ID, patient, phone, test"
              style={inputStyle}
            />
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #E2E8F0" }}>
                    <th style={thStyle}>Date/Time</th>
                    <th style={thStyle}>Receipt ID</th>
                    <th style={thStyle}>Patient ID</th>
                    <th style={thStyle}>Patient Name</th>
                    <th style={thStyle}>Tests</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Payment</th>
                    <th style={thStyle}>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.length ? filteredReceipts.map(function(r) {
                    return (
                      <tr key={r.receiptId + r.createdAt} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={tdStyle}>{formatTime(r.createdAt)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{r.receiptId}</td>
                        <td style={tdStyle}>{r.patientId}</td>
                        <td style={tdStyle}>{r.patientName}</td>
                        <td style={tdStyle}>{(r.tests || []).map(function(t) { return t.name + " x" + t.qty; }).join(", ")}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{formatAmount(r.totalAmount)}</td>
                        <td style={tdStyle}>{r.paymentMethod}</td>
                        <td style={tdStyle}>{r.operatorName}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} style={{ padding: "12px", color: "#64748B" }}>No receipts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {lastReceipt ? (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE6F1", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.07)", padding: 18, marginTop: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Last Generated Receipt</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
              <div><strong>Receipt ID:</strong> {lastReceipt.receiptId}</div>
              <div><strong>Date:</strong> {formatTime(lastReceipt.createdAt)}</div>
              <div><strong>Patient ID:</strong> {lastReceipt.patientId}</div>
              <div><strong>Patient Name:</strong> {lastReceipt.patientName}</div>
              <div><strong>Payment:</strong> {lastReceipt.paymentMethod}</div>
              <div><strong>Operator:</strong> {lastReceipt.operatorName}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              {(lastReceipt.tests || []).map(function(t, idx) {
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px dashed #E2E8F0", fontSize: 13 }}>
                    <span>{t.name} x{t.qty}</span>
                    <strong>{formatAmount(Number(t.qty || 0) * Number(t.unitPrice || 0))}</strong>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>{formatAmount(lastReceipt.subtotal)}</strong></div>
            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}><span>Discount</span><strong>{formatAmount(lastReceipt.discount)}</strong></div>
            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>{formatAmount(lastReceipt.totalAmount)}</strong></div>
          </div>
        ) : null}
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

const inputStyleSmall = {
  width: "100%",
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  padding: "8px",
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

const secondaryBtn = {
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  background: "#fff",
  color: "#334155",
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
