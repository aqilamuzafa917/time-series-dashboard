import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import { ThresholdItem } from "../types";

export default function ThresholdsPage() {
  const [thresholds, setThresholds] = useState<ThresholdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add new threshold state
  const [isAdding, setIsAdding] = useState(false);
  const [newThreshold, setNewThreshold] = useState<ThresholdItem>({ metric: "", warning_high: 0, critical_high: 0, active: true });
  const [addError, setAddError] = useState("");

  // Edit state
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ThresholdItem>>({});
  const [editError, setEditError] = useState("");

  const fetchThresholds = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<ThresholdItem[]>("/api/thresholds");
      setThresholds(data);
    } catch (err: any) {
      setError(err.message || "Failed to load thresholds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const handleAdd = async () => {
    setAddError("");
    if (!newThreshold.metric) {
      setAddError("Metric name is required");
      return;
    }
    if (newThreshold.warning_high >= newThreshold.critical_high) {
      setAddError("Warning threshold must be strictly less than Critical threshold");
      return;
    }

    try {
      await apiPost("/api/thresholds", newThreshold);
      setIsAdding(false);
      setNewThreshold({ metric: "", warning_high: 0, critical_high: 0, active: true });
      fetchThresholds();
    } catch (err: any) {
      setAddError(err.message || "Failed to add threshold");
    }
  };

  const startEdit = (item: ThresholdItem) => {
    setEditingMetric(item.metric);
    setEditForm({
      warning_high: item.warning_high,
      critical_high: item.critical_high,
      active: item.active
    });
    setEditError("");
  };

  const saveEdit = async (metric: string) => {
    setEditError("");
    if (editForm.warning_high !== undefined && editForm.critical_high !== undefined) {
      if (editForm.warning_high >= editForm.critical_high) {
        setEditError("Warning threshold must be less than Critical");
        return;
      }
    }

    try {
      await apiPut(`/api/thresholds/${metric}`, editForm);
      setEditingMetric(null);
      fetchThresholds();
    } catch (err: any) {
      setEditError(err.message || "Failed to update threshold");
    }
  };

  const toggleActive = async (item: ThresholdItem) => {
    try {
      await apiPut(`/api/thresholds/${item.metric}`, { active: !item.active });
      fetchThresholds();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 className="page-title">Thresholds</h2>
          <p className="page-subtitle">Configure warning and critical limits for your metrics.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)} disabled={isAdding}>
          <i className="ri-add-line"></i> Add Threshold
        </button>
      </div>

      {error && <div className="error-alert" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      <div className="table-container" style={{ marginTop: 0 }}>
        <div className="table-header-box">
          <h3 className="table-title">Metric Threshold Rules</h3>
        </div>
        <div className="table-wrapper">
          <table className="metric-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Metric Name</th>
                <th>Warning Limit (High)</th>
                <th>Critical Limit (High)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add New Row */}
              {isAdding && (
                <tr style={{ backgroundColor: "hsl(var(--bg-card-hover))" }}>
                  <td>
                    <input type="checkbox" checked={newThreshold.active} onChange={(e) => setNewThreshold({...newThreshold, active: e.target.checked})} />
                  </td>
                  <td>
                    <input type="text" className="input-control" style={{ padding: "0.25rem", width: "100%" }} placeholder="e.g. cpu_usage" value={newThreshold.metric} onChange={(e) => setNewThreshold({...newThreshold, metric: e.target.value})} />
                  </td>
                  <td>
                    <input type="number" className="input-control" style={{ padding: "0.25rem", width: "100px" }} value={newThreshold.warning_high} onChange={(e) => setNewThreshold({...newThreshold, warning_high: parseFloat(e.target.value)})} />
                  </td>
                  <td>
                    <input type="number" className="input-control" style={{ padding: "0.25rem", width: "100px" }} value={newThreshold.critical_high} onChange={(e) => setNewThreshold({...newThreshold, critical_high: parseFloat(e.target.value)})} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button className="btn btn-primary" style={{ padding: "0.25rem 0.5rem" }} onClick={handleAdd}>Save</button>
                      <button className="btn" style={{ padding: "0.25rem 0.5rem", background: "transparent", border: "1px solid hsl(var(--border-glass))" }} onClick={() => setIsAdding(false)}>Cancel</button>
                    </div>
                    {addError && <div style={{ color: "hsl(var(--color-critical))", fontSize: "0.8rem", marginTop: "0.25rem" }}>{addError}</div>}
                  </td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>Loading thresholds...</td>
                </tr>
              ) : thresholds.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-muted))" }}>No thresholds configured yet.</td>
                </tr>
              ) : (
                thresholds.map(t => (
                  <tr key={t.metric} style={{ opacity: t.active ? 1 : 0.6 }}>
                    <td>
                      {editingMetric === t.metric ? (
                        <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({...editForm, active: e.target.checked})} />
                      ) : (
                        <button 
                          onClick={() => toggleActive(t)}
                          style={{ 
                            background: "transparent", border: "none", cursor: "pointer",
                            color: t.active ? "hsl(var(--color-ok))" : "hsl(var(--color-critical))"
                          }}
                          title="Toggle Status"
                        >
                          <i className={`ri-toggle-${t.active ? 'fill' : 'line'}`} style={{ fontSize: "1.5rem" }}></i>
                        </button>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, textTransform: "capitalize" }}>{t.metric.replace("_", " ")}</td>
                    <td>
                      {editingMetric === t.metric ? (
                        <input type="number" className="input-control" style={{ padding: "0.25rem", width: "100px" }} value={editForm.warning_high} onChange={(e) => setEditForm({...editForm, warning_high: parseFloat(e.target.value)})} />
                      ) : (
                        <span style={{ color: "hsl(var(--color-warning))", fontWeight: "bold" }}>{t.warning_high}</span>
                      )}
                    </td>
                    <td>
                      {editingMetric === t.metric ? (
                        <input type="number" className="input-control" style={{ padding: "0.25rem", width: "100px" }} value={editForm.critical_high} onChange={(e) => setEditForm({...editForm, critical_high: parseFloat(e.target.value)})} />
                      ) : (
                        <span style={{ color: "hsl(var(--color-critical))", fontWeight: "bold" }}>{t.critical_high}</span>
                      )}
                    </td>
                    <td>
                      {editingMetric === t.metric ? (
                        <div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-primary" style={{ padding: "0.25rem 0.5rem" }} onClick={() => saveEdit(t.metric)}>Save</button>
                            <button className="btn" style={{ padding: "0.25rem 0.5rem", background: "transparent", border: "1px solid hsl(var(--border-glass))" }} onClick={() => setEditingMetric(null)}>Cancel</button>
                          </div>
                          {editError && <div style={{ color: "hsl(var(--color-critical))", fontSize: "0.8rem", marginTop: "0.25rem" }}>{editError}</div>}
                        </div>
                      ) : (
                        <button className="btn" style={{ padding: "0.25rem 0.5rem", background: "transparent", color: "hsl(var(--color-primary))" }} onClick={() => startEdit(t)}>
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
    </div>
  );
}
