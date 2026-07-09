import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import { SourceItem } from "../types";

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({ source_id: "", display_name: "", source_type: "", description: "", active: true });
  // const [newSource, setNewSource] = useState({ source_id: "", display_name: "", source_type: "unknown", description: "", active: true });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal state (separate from table rows)
  const [editTarget, setEditTarget] = useState<SourceItem | null>(null);
  const [editForm, setEditForm] = useState({ display_name: "", source_type: "", description: "", active: true });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await apiGet<SourceItem[]>("/api/sources");
      setSources(data);
    } catch (err) {
      console.error("Failed to load sources", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSources(); }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!newSource.source_id || !newSource.source_type) {
      setAddError("Source ID and Type are required");
      return;
    }
    // if (!newSource.source_id) {
    //   setAddError("Source ID is required");
    //   return;
    // }
    setAddSaving(true);
    try {
      await apiPost("/api/sources", newSource);
      setShowAddModal(false);
      setNewSource({ source_id: "", display_name: "", source_type: "", description: "", active: true });
      // setNewSource({ source_id: "", display_name: "", source_type: "unknown", description: "", active: true });
      fetchSources();
    } catch (err: any) {
      setAddError(err.message || "Failed to add source");
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (src: SourceItem) => {
    setEditTarget(src);
    setEditForm({
      display_name: src.display_name || "",
      source_type: src.source_type || "",
      description: src.description || "",
      active: src.active,
    });
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditError("");
    try {
      await apiPut(`/api/sources/${editTarget.source_id}`, editForm);
      setEditTarget(null);
      fetchSources();
    } catch (err: any) {
      setEditError(err.message || "Failed to update source");
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async (src: SourceItem) => {
    try {
      await apiPut(`/api/sources/${src.source_id}`, { active: !src.active });
      fetchSources();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const filteredSources = sources.filter(s =>
    s.source_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.source_type || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)", zIndex: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const modalCardStyle: React.CSSProperties = {
    background: "hsl(var(--bg-card))",
    border: "1px solid hsl(var(--border-glass))",
    borderRadius: "12px",
    padding: "2rem",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 className="page-title">Sources</h2>
          <p className="page-subtitle">Manage your telemetry devices and sources.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <i className="ri-add-line"></i> Add Source
        </button>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ marginBottom: "1.5rem", position: "relative", maxWidth: "400px" }}>
          <i className="ri-search-line" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }}></i>
          <input
            type="text"
            className="input-control"
            placeholder="Search sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", paddingLeft: "2.5rem" }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="metric-table" style={{ minWidth: "700px" }}>
            <thead>
              <tr>
                <th style={{ width: "100px" }}>Status</th>
                <th>Source ID</th>
                <th>Display Name</th>
                <th>Type</th>
                {/* <th>Latest Data</th> */}
                {/* <th style={{ textAlign: "right" }}>Records</th> */}
                <th style={{ width: "120px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>Loading sources...</td></tr>
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>Loading sources...</td></tr>
              ) : filteredSources.length === 0 ? (
                // <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>No sources found.</td></tr>
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>No sources found.</td></tr>
              ) : (
                filteredSources.map(src => (
                  <tr key={src.source_id} style={{ opacity: src.active ? 1 : 0.55 }}>
                    <td>
                      <button
                        onClick={() => handleToggleActive(src)}
                        title={src.active ? "Click to deactivate" : "Click to activate"}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        <span className={src.active ? "badge-ok" : "badge-critical"} style={{ padding: "0.2rem 0.5rem", borderRadius: "100px", fontSize: "0.72rem", fontWeight: 600 }}>
                          {src.active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{src.source_id}</td>
                    <td>{src.display_name || <span className="text-muted-col">-</span>}</td>
                    <td><span style={{ textTransform: "capitalize" }}>{src.source_type || "-"}</span></td>
                    {/* <td className="text-muted-col">{src.latest_at ? new Date(src.latest_at).toLocaleString() : "-"}</td> */}
                    {/* <td style={{ textAlign: "right" }}>{(src.record_count || 0).toLocaleString()}</td> */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ color: "hsl(var(--color-primary))" }}
                        onClick={() => openEdit(src)}
                      >
                        <i className="ri-pencil-line"></i> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={modalCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "hsl(var(--text-primary))", fontWeight: 700 }}>Add New Source</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-icon btn-ghost" aria-label="Close">
                <i className="ri-close-line"></i>
              </button>
            </div>

            {addError && <div className="error-alert" style={{ marginBottom: "1rem" }}>{addError}</div>}

            <form onSubmit={handleAddSource}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="filter-label">Source ID *</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={newSource.source_id} onChange={e => setNewSource({ ...newSource, source_id: e.target.value })} placeholder="e.g. sensor-01" required />
                </div>
                <div>
                  <label className="filter-label">Display Name</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={newSource.display_name} onChange={e => setNewSource({ ...newSource, display_name: e.target.value })} placeholder="e.g. Main Factory Sensor" />
                </div>
                <div>
                  <label className="filter-label">Source Type *</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={newSource.source_type} onChange={e => setNewSource({ ...newSource, source_type: e.target.value })} placeholder="e.g. sensor, server" required />
                </div>
                <div>
                  <label className="filter-label">Description</label>
                  <textarea className="input-control" style={{ width: "100%", minHeight: "70px", resize: "vertical" }} value={newSource.description} onChange={e => setNewSource({ ...newSource, description: e.target.value })} placeholder="Optional notes..." />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={newSource.active} onChange={e => setNewSource({ ...newSource, active: e.target.checked })} />
                  <span style={{ fontSize: "0.9rem" }}>Active (collects telemetry)</span>
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "2rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addSaving}><i className="ri-save-line"></i> {addSaving ? "Saving..." : "Save Source"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Source Modal */}
      {editTarget && (
        <div style={modalOverlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}>
          <div style={modalCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ color: "hsl(var(--text-primary))", fontWeight: 700 }}>Edit Source</h3>
                <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem", marginTop: "0.25rem" }}>ID: {editTarget.source_id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="btn btn-icon btn-ghost" aria-label="Close">
                <i className="ri-close-line"></i>
              </button>
            </div>

            {editError && <div className="error-alert" style={{ marginBottom: "1rem" }}>{editError}</div>}

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="filter-label">Display Name</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={editForm.display_name} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })} />
                </div>
                <div>
                  <label className="filter-label">Source Type</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={editForm.source_type} onChange={e => setEditForm({ ...editForm, source_type: e.target.value })} />
                </div>
                <div>
                  <label className="filter-label">Description</label>
                  <textarea className="input-control" style={{ width: "100%", minHeight: "70px", resize: "vertical" }} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={editForm.active} onChange={e => setEditForm({ ...editForm, active: e.target.checked })} />
                  <span style={{ fontSize: "0.9rem" }}>Active (collects telemetry)</span>
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "2rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}><i className="ri-save-line"></i> {editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
