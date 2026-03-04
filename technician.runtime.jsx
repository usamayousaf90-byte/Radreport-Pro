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

function statusPill(status) {
  if (status === "Ready for Reporting") return { color: "#166534", bg: "#DCFCE7" };
  if (status === "In Progress") return { color: "#1E40AF", bg: "#DBEAFE" };
  if (status === "Completed") return { color: "#065F46", bg: "#D1FAE5" };
  return { color: "#92400E", bg: "#FEF3C7" };
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function localLoadQueue() {
  try {
    const raw = localStorage.getItem("rrp_local_queue_v1");
    const out = raw ? JSON.parse(raw) : [];
    return Array.isArray(out) ? out : [];
  } catch (e) {
    return [];
  }
}

function localSaveQueue(v) {
  localStorage.setItem("rrp_local_queue_v1", JSON.stringify(v));
}

function localLoadEntries() {
  try {
    const raw = localStorage.getItem("rrp_local_tech_entries_v1");
    const out = raw ? JSON.parse(raw) : [];
    return Array.isArray(out) ? out : [];
  } catch (e) {
    return [];
  }
}

function localSaveEntries(v) {
  localStorage.setItem("rrp_local_tech_entries_v1", JSON.stringify(v));
}

function fileMeta(f) {
  return {
    id: "F-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
    name: f && f.name ? String(f.name) : "unknown",
    type: f && f.type ? String(f.type) : "",
    size: f && f.size ? Number(f.size) : 0,
    lastModified: f && f.lastModified ? Number(f.lastModified) : 0
  };
}

function App() {
  const [storageMode, setStorageMode] = useState("cloud");
  const [queue, setQueue] = useState([]);
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [technicianName, setTechnicianName] = useState("Technician");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [labValues, setLabValues] = useState([{ id: "L-1", name: "", value: "", unit: "", reference: "" }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedQueue = useMemo(function() {
    return queue.find(function(q) { return q.queueId === selectedQueueId; }) || null;
  }, [queue, selectedQueueId]);

  const selectedEntry = useMemo(function() {
    return entries.find(function(e) { return e.queueId === selectedQueueId; }) || null;
  }, [entries, selectedQueueId]);

  const filteredQueue = useMemo(function() {
    const q = search.trim().toLowerCase();
    const ordered = queue.slice().sort(function(a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    if (!q) return ordered;

    return ordered.filter(function(item) {
      const linked = entries.find(function(e) { return e.queueId === item.queueId; }) || {};
      const hay = [
        item.queueId,
        item.patientId,
        item.patientName,
        item.modality,
        item.status,
        linked.technicianName
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [queue, entries, search]);

  function resetEditor() {
    setTechnicianName("Technician");
    setClinicalNotes("");
    setFiles([]);
    setLabValues([{ id: "L-1", name: "", value: "", unit: "", reference: "" }]);
  }

  function loadFromEntry(entry) {
    if (!entry) {
      resetEditor();
      return;
    }

    setTechnicianName(entry.technicianName || "Technician");
    setClinicalNotes(entry.clinicalNotes || "");
    setFiles(Array.isArray(entry.files) ? entry.files : []);
    const labs = Array.isArray(entry.labValues) && entry.labValues.length
      ? entry.labValues.map(function(l, idx) {
          return {
            id: "L-" + idx + "-" + Date.now(),
            name: l.name || "",
            value: l.value || "",
            unit: l.unit || "",
            reference: l.reference || ""
          };
        })
      : [{ id: "L-1", name: "", value: "", unit: "", reference: "" }];
    setLabValues(labs);
  }

  async function loadCloudData() {
    const res = await fetch("/api/technician");
    if (!res.ok) {
      const data = await res.json().catch(function() { return {}; });
      throw new Error((data && data.error && data.error.message) || ("HTTP " + res.status));
    }

    const data = await res.json().catch(function() { return {}; });
    setQueue(Array.isArray(data.queue) ? data.queue : []);
    setEntries(Array.isArray(data.entries) ? data.entries : []);
    setStorageMode("cloud");
  }

  function loadLocalData() {
    setQueue(localLoadQueue());
    setEntries(localLoadEntries());
    setStorageMode("local");
    setMessage("Cloud unavailable, using local storage.");
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
    loadFromEntry(selectedEntry);
  }, [selectedEntry]);

  function onPickQueue(row) {
    setSelectedQueueId(row.queueId);
    const linked = entries.find(function(e) { return e.queueId === row.queueId; }) || null;
    loadFromEntry(linked);
  }

  function handleFilesPicked(evt) {
    const list = Array.from(evt.target.files || []);
    if (!list.length) return;
    const meta = list.map(fileMeta);
    setFiles(function(prev) { return prev.concat(meta).slice(0, 100); });
    evt.target.value = "";
  }

  function removeFile(fid) {
    setFiles(function(prev) { return prev.filter(function(f) { return f.id !== fid; }); });
  }

  function addLabRow() {
    setLabValues(function(prev) {
      return prev.concat({ id: "L-" + Date.now() + "-" + Math.floor(Math.random() * 100000), name: "", value: "", unit: "", reference: "" });
    });
  }

  function removeLabRow(id) {
    setLabValues(function(prev) {
      if (prev.length <= 1) return prev;
      return prev.filter(function(x) { return x.id !== id; });
    });
  }

  function updateLabRow(id, patch) {
    setLabValues(function(prev) {
      return prev.map(function(row) {
        if (row.id !== id) return row;
        return { ...row, ...patch };
      });
    });
  }

  async function saveEntry(action) {
    setMessage("");

    if (!selectedQueue || !selectedQueue.queueId) {
      setMessage("Select a queue item first.");
      return;
    }

    const payload = {
      action: action,
      queueId: selectedQueue.queueId,
      technicianName: technicianName,
      clinicalNotes: clinicalNotes,
      files: files,
      labValues: labValues
        .map(function(l) {
          return {
            name: String(l.name || "").trim(),
            value: String(l.value || "").trim(),
            unit: String(l.unit || "").trim(),
            reference: String(l.reference || "").trim()
          };
        })
        .filter(function(l) {
          return l.name || l.value || l.unit || l.reference;
        })
    };

    setSaving(true);
    try {
      if (storageMode === "cloud") {
        const res = await fetch("/api/technician", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error((data && data.error && data.error.message) || "Save failed");

        setMessage(action === "mark_ready" ? "Marked Ready for Reporting." : "Technician entry saved.");
        await refresh();
      } else {
        const q = localLoadQueue();
        const e = localLoadEntries();

        const qIdx = q.findIndex(function(item) { return item.queueId === selectedQueue.queueId; });
        if (qIdx === -1) throw new Error("Queue item not found in local storage");

        const queueRow = q[qIdx];
        if (action === "mark_ready") queueRow.status = "Ready for Reporting";
        else if (queueRow.status === "Waiting") queueRow.status = "In Progress";

        const now = new Date().toISOString();
        const eIdx = e.findIndex(function(item) { return item.queueId === selectedQueue.queueId; });
        const next = {
          queueId: queueRow.queueId,
          visitId: queueRow.visitId || "",
          patientId: queueRow.patientId || "",
          patientName: queueRow.patientName || "",
          modality: queueRow.modality || "",
          createdAt: eIdx >= 0 && e[eIdx] ? (e[eIdx].createdAt || now) : now,
          updatedAt: now,
          status: action === "mark_ready" ? "Ready for Reporting" : "Draft",
          readyAt: action === "mark_ready" ? now : "",
          technicianName: technicianName,
          clinicalNotes: clinicalNotes,
          files: files,
          labValues: payload.labValues
        };

        if (eIdx >= 0) e[eIdx] = next;
        else e.unshift(next);

        localSaveQueue(q);
        localSaveEntries(e);
        setQueue(q);
        setEntries(e);
        setMessage(action === "mark_ready" ? "Marked Ready for Reporting (local mode)." : "Technician entry saved (local mode).");
      }
    } catch (err) {
      setMessage(err && err.message ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", fontFamily: "Arial, sans-serif", background: "#F5F8FC", color: "#1E293B" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>RadReportPro Technician Panel</h1>
            <div style={{ color: "#475569", marginTop: 4 }}>Module 3: Upload Data, Clinical Notes, Lab Values, Ready for Reporting</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/" style={{ color: "#1D4ED8", fontWeight: 700 }}>Suite</a>
            <a href="/templates" style={{ color: "#1D4ED8", fontWeight: 700 }}>Templates</a>
            <a href="/reception.html" style={{ color: "#1D4ED8", fontWeight: 700 }}>Reception + Billing</a>
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

        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 16 }}>
          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Queue List</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient, ID, modality, status"
              style={inputStyle()}
            />

            <div style={{ marginTop: 10, maxHeight: 620, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              {filteredQueue.length ? filteredQueue.map(function(row) {
                const active = selectedQueueId === row.queueId;
                const pill = statusPill(row.status);
                return (
                  <button
                    key={row.queueId}
                    onClick={() => onPickQueue(row)}
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
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.patientName || "Unnamed"}</div>
                      <span style={{ fontSize: 11, color: pill.color, background: pill.bg, borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>{row.status || "Waiting"}</span>
                    </div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{row.patientId} | {row.modality}</div>
                    <div style={{ color: "#64748B", fontSize: 11 }}>{formatTime(row.createdAt)}</div>
                  </button>
                );
              }) : <div style={{ padding: 12, color: "#64748B" }}>No queue items.</div>}
            </div>
          </div>

          <div style={boxStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>Data Entry</h2>
            {!selectedQueue ? (
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                Select a queue item to attach DICOM/images/lab values and notes.
              </div>
            ) : (
              <>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 10, padding: "9px 11px", fontSize: 13, marginBottom: 12 }}>
                  <strong>{selectedQueue.patientName}</strong> ({selectedQueue.patientId}) | {selectedQueue.modality} | Queue: {selectedQueue.queueId}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="Technician name" style={inputStyle()} />

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 700, fontSize: 14 }}>Attach DICOM/Images/Lab Files</div>
                    <input type="file" multiple onChange={handleFilesPicked} style={inputStyle({ padding: "7px" })} />
                    <div style={{ marginTop: 8, border: "1px solid #E2E8F0", borderRadius: 10, maxHeight: 160, overflow: "auto" }}>
                      {files.length ? files.map(function(f) {
                        return (
                          <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, borderBottom: "1px solid #F1F5F9", padding: "8px 10px", fontSize: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{f.name}</div>
                              <div style={{ color: "#64748B" }}>{f.type || "unknown"} | {Math.round((Number(f.size || 0) / 1024) * 10) / 10} KB</div>
                            </div>
                            <button onClick={() => removeFile(f.id)} style={{ border: 0, background: "transparent", color: "#B91C1C", cursor: "pointer", fontWeight: 700 }}>Remove</button>
                          </div>
                        );
                      }) : <div style={{ padding: 10, color: "#64748B", fontSize: 12 }}>No files attached yet.</div>}
                    </div>
                    <div style={{ marginTop: 5, color: "#64748B", fontSize: 11 }}>
                      Note: file metadata is stored here; full PACS storage will be part of advanced module.
                    </div>
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 700, fontSize: 14 }}>Clinical Notes</div>
                    <textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Add clinical notes, acquisition remarks, contrast details, patient preparation info..." style={{ ...inputStyle(), minHeight: 130, resize: "vertical" }} />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Lab Values</div>
                      <button onClick={addLabRow} style={btnStyle(false)}>+ Add Row</button>
                    </div>

                    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10 }}>
                      {labValues.map(function(row) {
                        return (
                          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 0.8fr 1fr 36px", gap: 8, padding: 8, borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                            <input value={row.name} onChange={(e) => updateLabRow(row.id, { name: e.target.value })} placeholder="Test" style={inputStyle({ padding: "8px" })} />
                            <input value={row.value} onChange={(e) => updateLabRow(row.id, { value: e.target.value })} placeholder="Value" style={inputStyle({ padding: "8px" })} />
                            <input value={row.unit} onChange={(e) => updateLabRow(row.id, { unit: e.target.value })} placeholder="Unit" style={inputStyle({ padding: "8px" })} />
                            <input value={row.reference} onChange={(e) => updateLabRow(row.id, { reference: e.target.value })} placeholder="Reference" style={inputStyle({ padding: "8px" })} />
                            <button onClick={() => removeLabRow(row.id)} style={{ border: 0, background: "transparent", color: "#B91C1C", cursor: "pointer", fontWeight: 700 }}>x</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => saveEntry("save_entry")} disabled={saving} style={btnStyle(false)}>{saving ? "Saving..." : "Save Entry"}</button>
                    <button onClick={() => saveEntry("mark_ready")} disabled={saving} style={btnStyle(true)}>{saving ? "Saving..." : "Mark Ready for Reporting"}</button>
                  </div>

                  {message ? <div style={{ color: "#0F766E", fontSize: 13 }}>{message}</div> : null}
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
