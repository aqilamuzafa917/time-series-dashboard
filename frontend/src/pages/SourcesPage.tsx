import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import { SourceItem } from "../types";

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newSource, setNewSource] = useState({ source_id: "", display_name: "", source_type: "", description: "", active: true });
  const [modalError, setModalError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SourceItem>>({});

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

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (!newSource.source_id || !newSource.source_type) {
      setModalError("Source ID and Type are required");
      return;
    }
    
    try {
      await apiPost("/api/sources", newSource);
      setShowModal(false);
      setNewSource({ source_id: "", display_name: "", source_type: "", description: "", active: true });
      fetchSources();
    } catch (err: any) {
      setModalError(err.message || "Failed to add source");
    }
  };

  const startEdit = (src: SourceItem) => {
    setEditingId(src.source_id);
    setEditForm({
      display_name: src.display_name,
      source_type: src.source_type,
      description: src.description,
      active: src.active
    });
  };

  const saveEdit = async (source_id: string) => {
    try {
      await apiPut(`/api/sources/${source_id}`, editForm);
      setEditingId(null);
      fetchSources();
    } catch (err: any) {
      alert(err.message || "Failed to update source");
    }
  };

  const filteredSources = sources.filter(s => 
    s.source_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.source_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 className="page-title">Sources</h2>
          <p className="page-subtitle">Manage your telemetry devices and sources.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="ri-add-line"></i> Add Source
        </button>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ marginBottom: "1.5rem", position: "relative" }}>
          <i className="ri-search-line" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }}></i>
          <input 
            type="text" 
            className="input-control" 
            placeholder="Search sources by ID, name, or type..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", paddingLeft: "2.5rem", maxWidth: "400px" }}
          />
        </div>

        <div className="table-wrapper" style={{ border: "1px solid hsl(var(--border-glass))", borderRadius: "8px" }}>
          <table className="metric-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Source ID</th>
                <th>Display Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Latest Data</th>
                <th>Records</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>Loading...</td>
                </tr>
              ) : filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>No sources found.</td>
                </tr>
              ) : (
                filteredSources.map(src => (
                  <tr key={src.source_id} style={{ opacity: src.active ? 1 : 0.6 }}>
                    <td>
                      {editingId === src.source_id ? (
                        <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({...editForm, active: e.target.checked})} />
                      ) : (
                        <span className={src.active ? "badge-ok" : "badge-critical"} style={{ padding: "0.25rem 0.5rem", borderRadius: "100px", fontSize: "0.75rem" }}>
                          {src.active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{src.source_id}</td>
                    <td>
                      {editingId === src.source_id ? (
                        <input type="text" className="input-control" style={{ padding: "0.25rem" }} value={editForm.display_name} onChange={(e) => setEditForm({...editForm, display_name: e.target.value})} />
                      ) : (
                        src.display_name
                      )}
                    </td>
                    <td>
                      {editingId === src.source_id ? (
                        <input type="text" className="input-control" style={{ padding: "0.25rem" }} value={editForm.source_type} onChange={(e) => setEditForm({...editForm, source_type: e.target.value})} />
                      ) : (
                        <span style={{ textTransform: "capitalize" }}>{src.source_type}</span>
                      )}
                    </td>
                    <td>
                      {editingId === src.source_id ? (
                        <input type="text" className="input-control" style={{ padding: "0.25rem" }} value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                      ) : (
                        <span className="text-muted-col" style={{ maxWidth: "200px", display: "inline-block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {src.description || "-"}
                        </span>
                      )}
                    </td>
                    <td className="text-muted-col">{src.latest_at ? new Date(src.latest_at).toLocaleString() : "-"}</td>
                    <td>{src.record_count.toLocaleString()}</td>
                    <td>
                      {editingId === src.source_id ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-primary" style={{ padding: "0.25rem 0.5rem" }} onClick={() => saveEdit(src.source_id)}>Save</button>
                          <button className="btn" style={{ padding: "0.25rem 0.5rem", background: "transparent", border: "1px solid hsl(var(--border-glass))" }} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn" style={{ padding: "0.25rem 0.5rem", background: "transparent", color: "hsl(var(--color-primary))" }} onClick={() => startEdit(src)}>
                          <i className="ri-pencil-line"></i> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", background: "hsl(var(--bg-main))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h3>Add New Source</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "hsl(var(--text-muted))" }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            
            {modalError && <div className="error-alert" style={{ marginBottom: "1rem" }}>{modalError}</div>}
            
            <form onSubmit={handleAddSource}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>Source ID *</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={newSource.source_id} onChange={e => setNewSource({...newSource, source_id: e.target.value})} placeholder="e.g. sensor-01" required />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>Display Name</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={newSource.display_name} onChange={e => setNewSource({...newSource, display_name: e.target.value})} placeholder="e.g. Main Factory Sensor" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>Source Type *</label>
                  <input type="text" className="input-control" style={{ width: "100%" }} value={newSource.source_type} onChange={e => setNewSource({...newSource, source_type: e.target.value})} placeholder="e.g. temperature_sensor" required />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>Description</label>
                  <textarea className="input-control" style={{ width: "100%", minHeight: "80px" }} value={newSource.description} onChange={e => setNewSource({...newSource, description: e.target.value})} placeholder="Optional notes..."></textarea>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" checked={newSource.active} onChange={e => setNewSource({...newSource, active: e.target.checked})} id="activeCheck" />
                  <label htmlFor="activeCheck">Active (collects telemetry)</label>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <button type="button" className="btn" style={{ background: "transparent", border: "1px solid hsl(var(--border-glass))" }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Source</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
