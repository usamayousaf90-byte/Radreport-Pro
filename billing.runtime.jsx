const { useEffect, useMemo, useRef, useState } = React;

const TEST_OPTIONS = ["Ultrasound", "X-ray", "CT", "MRI", "Lab test"];
const PAYMENT_OPTIONS = ["Cash", "Card", "Online"];

const DEFAULT_PRICE = {
  "Ultrasound": 3500,
  "X-ray": 1800,
  "CT": 12000,
  "MRI": 20000,
  "Lab test": 1500
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

function newLineItem(name) {
  return { id: "L-" + Date.now() + "-" + Math.floor(Math.random() * 100000), name: name || "", qty: 1 };
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

function loadLocalReceipts() {
  try {
    const raw = localStorage.getItem("rrp_local_receipts_v1");
    const out = raw ? JSON.parse(raw) : [];
    return Array.isArray(out) ? out : [];
  } catch (e) {
    return [];
  }
}

function saveLocalReceipts(v) {
  localStorage.setItem("rrp_local_receipts_v1", JSON.stringify(v));
}

function App() {
  const [storageMode, setStorageMode] = useState("cloud");
  const [priceList, setPriceList] = useState(DEFAULT_PRICE);
  const [patients, setPatients] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [lineItems, setLineItems] = useState([newLineItem("Ultrasound")]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [operatorName, setOperatorName] = useState("Reception");
  const [lastReceipt, setLastReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const patientSearchReqRef = useRef(0);

  const subtotal = useMemo(function() {
    return lineItems.reduce(function(sum, it) {
      const unit = Number(priceList[it.name] || 0);
      const qty = Number(it.qty || 1);
      return sum + unit * (Number.isFinite(qty) && qty > 0 ? qty : 1);
    }, 0);
  }, [lineItems, priceList]);

  const discountSafe = useMemo(function() {
    const d = Number(discount || 0);
    if (!Number.isFinite(d) || d < 0) return 0;
    if (d > subtotal) return subtotal;
    return Math.round(d);
  }, [discount, subtotal]);

  const totalAmount = subtotal - discountSafe;

  const filteredPatients = useMemo(function() {
    const q = patientSearch.trim().toLowerCase();
    const base = patients.slice().sort(function(a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
    if (!q) return base.slice(0, 40);
    return base.filter(function(p) {
      const hay = [p.id, p.name, p.phone, p.cnic, p.referringDoctor].join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 40);
  }, [patients, patientSearch]);

  const filteredReceipts = useMemo(function() {
    const q = receiptSearch.trim().toLowerCase();
    const base = receipts.slice().sort(function(a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    if (!q) return base.slice(0, 60);

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
    }).slice(0, 60);
  }, [receipts, receiptSearch]);

  function loadLocalData() {
    setPatients(loadLocalPatients());
    setReceipts(loadLocalReceipts());
    setStorageMode("local");
    setMessage("Cloud unavailable, using local storage.");
  }

  async function loadCloudData() {
    const [patientsRes, billingRes] = await Promise.all([
      fetch("/api/patients"),
      fetch("/api/billing")
    ]);

    if (!patientsRes.ok || !billingRes.ok) {
      let err = "Cloud data unavailable";
      try {
        const p = await patientsRes.json();
        if (p && p.error && p.error.message) err = p.error.message;
      } catch (e) {}
      try {
        const b = await billingRes.json();
        if (b && b.error && b.error.message) err = b.error.message;
      } catch (e) {}
      throw new Error(err);
    }

    const pData = await patientsRes.json().catch(function() { return {}; });
    const bData = await billingRes.json().catch(function() { return {}; });

    setPatients(Array.isArray(pData.patients) ? pData.patients : []);
    setReceipts(Array.isArray(bData.receipts) ? bData.receipts : []);
    setPriceList(bData.priceList || DEFAULT_PRICE);
    setStorageMode("cloud");
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

  async function refresh() {
    try {
      await loadCloudData();
    } catch (err) {
      loadLocalData();
    }
  }

  useEffect(function() {
    refresh();
  }, []);

  useEffect(function() {
    if (storageMode !== "cloud") return;

    const handle = setTimeout(async function() {
      const requestId = patientSearchReqRef.current + 1;
      patientSearchReqRef.current = requestId;
      setPatientSearchLoading(true);
      try {
        await loadCloudPatients(patientSearch, requestId);
      } catch (e) {
      } finally {
        if (requestId === patientSearchReqRef.current) setPatientSearchLoading(false);
      }
    }, 220);

    return function() {
      clearTimeout(handle);
    };
  }, [patientSearch, storageMode]);

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
      const q = String(patientSearch || "").trim().toLowerCase();
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
      setMessage("Select patient from list first. Tip: type at least 2 letters of name.");
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

    setSaving(true);
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
        await refresh();
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
      setSaving(false);
    }
  }

  function printLastReceipt() {
    if (!lastReceipt) return;
    window.print();
  }

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Billing</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 2: Cash Receipt, Pricing, Payment, Print</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/reception.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Reception</a>
            <a href="/technician.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Technician</a>
            <a href="/radiologist.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Radiologist</a>
            <a href="/portal" style={{ color: "#1D4ED8", fontWeight: 700 }}>Patient Portal</a>
            <a href="/records" style={{ color: "#1D4ED8", fontWeight: 700 }}>Records</a>
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

        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 16 }}>
          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Select Patient</h2>
            <input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by ID, name, phone, CNIC"
              style={inputStyle()}
            />
            {patientSearchLoading ? <div style={{ marginTop: 6, fontSize: 12, color: "#64748B" }}>Searching patients...</div> : null}
            <div style={{ marginTop: 10, maxHeight: 390, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              {filteredPatients.length ? filteredPatients.map(function(row) {
                const active = selectedPatient && selectedPatient.id === row.id;
                return (
                  <button
                    key={row.id}
                    onClick={() => setSelectedPatient(row)}
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
          </div>

          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Create Cash Receipt</h2>
            {selectedPatient ? (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 10, padding: "8px 10px", marginBottom: 12, fontSize: 13 }}>
                Patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.id})
              </div>
            ) : (
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "8px 10px", marginBottom: 12, fontSize: 13 }}>
                Select patient from left panel first.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Tests</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={applyLatestPatientVisit} style={btnStyle(false)}>Use Latest Visit</button>
                <button onClick={addLine} style={btnStyle(false)}>+ Add Test</button>
              </div>
            </div>

            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10 }}>
              {lineItems.map(function(it) {
                return (
                  <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 30px", gap: 8, padding: 10, borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                    <select value={it.name} onChange={(e) => updateLine(it.id, { name: e.target.value })} style={inputStyle({ padding: "8px" })}>
                      <option value="">Select test</option>
                      {TEST_OPTIONS.map(function(t) { return <option key={t}>{t}</option>; })}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={it.qty}
                      onChange={(e) => updateLine(it.id, { qty: e.target.value })}
                      style={inputStyle({ padding: "8px" })}
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
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle()}>
                {PAYMENT_OPTIONS.map(function(p) { return <option key={p}>{p}</option>; })}
              </select>
              <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="Operator name" style={inputStyle()} />
              <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount PKR" style={inputStyle()} />
            </div>

            <div style={{ marginTop: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Subtotal</span><strong>{formatAmount(subtotal)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Discount</span><strong>{formatAmount(discountSafe)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>{formatAmount(totalAmount)}</strong></div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={generateReceipt} disabled={saving} style={btnStyle(true)}>{saving ? "Saving..." : "Generate Receipt"}</button>
              <button onClick={printLastReceipt} style={btnStyle(false)} disabled={!lastReceipt}>Print Last Receipt</button>
            </div>

            {message ? <div style={{ marginTop: 10, color: "#0F766E", fontSize: 13 }}>{message}</div> : null}
          </div>
        </div>

        <div style={{ ...boxStyle(), marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Receipts</h2>
          <input
            value={receiptSearch}
            onChange={(e) => setReceiptSearch(e.target.value)}
            placeholder="Search by receipt ID, patient, phone, test"
            style={inputStyle()}
          />
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ padding: "10px 8px" }}>Date/Time</th>
                  <th style={{ padding: "10px 8px" }}>Receipt ID</th>
                  <th style={{ padding: "10px 8px" }}>Patient ID</th>
                  <th style={{ padding: "10px 8px" }}>Patient Name</th>
                  <th style={{ padding: "10px 8px" }}>Tests</th>
                  <th style={{ padding: "10px 8px" }}>Amount</th>
                  <th style={{ padding: "10px 8px" }}>Payment</th>
                  <th style={{ padding: "10px 8px" }}>Operator</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length ? filteredReceipts.map(function(r) {
                  return (
                    <tr key={r.receiptId + r.createdAt} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px" }}>{formatTime(r.createdAt)}</td>
                      <td style={{ padding: "8px", fontWeight: 700 }}>{r.receiptId}</td>
                      <td style={{ padding: "8px" }}>{r.patientId}</td>
                      <td style={{ padding: "8px" }}>{r.patientName}</td>
                      <td style={{ padding: "8px" }}>{(r.tests || []).map(function(t) { return t.name + " x" + t.qty; }).join(", ")}</td>
                      <td style={{ padding: "8px", fontWeight: 700 }}>{formatAmount(r.totalAmount)}</td>
                      <td style={{ padding: "8px" }}>{r.paymentMethod}</td>
                      <td style={{ padding: "8px" }}>{r.operatorName}</td>
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

        {lastReceipt ? (
          <div style={{ ...boxStyle(), marginTop: 16 }}>
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
