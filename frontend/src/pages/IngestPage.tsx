import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "../api";
import { SourceItem, IngestResult } from "../types";

export default function IngestPage() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Ingest State
  const [manualSourceId, setManualSourceId] = useState("");
  const [manualTimestamp, setManualTimestamp] = useState("");
  const [manualMetrics, setManualMetrics] = useState([{ metric: "", value: "", unit: "" }, { metric: "", value: "", unit: "" }]);
  const [manualResult, setManualResult] = useState<IngestResult | null>(null);
  const [manualError, setManualError] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Batch Ingest State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchResult, setBatchResult] = useState<IngestResult | null>(null);
  const [batchError, setBatchError] = useState("");
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  useEffect(() => {
    apiGet<SourceItem[]>("/api/sources")
      .then(data => {
        setSources(data.filter(s => s.active));
        if (data.length > 0) {
          setManualSourceId(data[0].source_id);
        }
      })
      .catch(err => console.error("Failed to load sources", err))
      .finally(() => setLoading(false));
  }, []);

  const addMetricRow = () => {
    setManualMetrics([...manualMetrics, { metric: "", value: "", unit: "" }]);
  };

  const removeMetricRow = (index: number) => {
    setManualMetrics(manualMetrics.filter((_, i) => i !== index));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");
    setManualResult(null);

    const validMetrics = manualMetrics.filter(m => m.metric.trim() !== "" && m.value !== "");
    if (validMetrics.length < 2) {
      setManualError("At least 2 metric values are required per submission.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const payload = {
        source_id: manualSourceId,
        timestamp: manualTimestamp ? new Date(manualTimestamp).toISOString() : undefined,
        metrics: validMetrics.map(m => ({
          metric: m.metric.trim(),
          value: parseFloat(m.value),
          unit: m.unit.trim()
        }))
      };

      const result = await apiPost<IngestResult>("/api/ingest/manual", payload);
      setManualResult(result);
      setManualMetrics([{ metric: "", value: "", unit: "" }, { metric: "", value: "", unit: "" }]);
      setManualTimestamp("");
    } catch (err: any) {
      setManualError(err.message || "Failed to ingest data");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setBatchError("");
    setBatchResult(null);
    setIsSubmittingBatch(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      // We cannot use standard apiPost because it serializes to JSON. We need fetch directly.
      const res = await fetch("/api/ingest/batch", {
        method: "POST",
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Batch ingestion failed");
      
      setBatchResult(data);
      setCsvFile(null);
      // Reset input file
      const fileInput = document.getElementById("csvUpload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setBatchError(err.message || "Failed to upload CSV");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 className="page-title">Data Ingestion</h2>
        <p className="page-subtitle">Push data directly into InfluxDB via manual entry or bulk CSV upload.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        
        {/* Manual Entry Form */}
        <div className="card">
          <h3 style={{ marginBottom: "1.5rem" }}>Manual Entry</h3>
          
          {manualResult && (
            <div className="error-alert" style={{ backgroundColor: "hsl(var(--color-ok) / 0.1)", color: "hsl(var(--color-ok))", borderColor: "hsl(var(--color-ok) / 0.3)", marginBottom: "1.5rem" }}>
              <i className="ri-check-line"></i> Successfully ingested {manualResult.records_ingested} records.
            </div>
          )}
          {manualError && (
            <div className="error-alert" style={{ marginBottom: "1.5rem" }}>
              <i className="ri-error-warning-line"></i> {manualError}
            </div>
          )}

          <form onSubmit={handleManualSubmit}>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ flex: 1 }}>
                <label className="filter-label">Source ID *</label>
                <select 
                  className="input-control" 
                  style={{ width: "100%" }}
                  value={manualSourceId}
                  onChange={(e) => setManualSourceId(e.target.value)}
                  required
                >
                  {loading ? <option>Loading...</option> : sources.map(s => (
                    <option key={s.source_id} value={s.source_id}>{s.display_name} ({s.source_id})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="filter-label">Timestamp (Optional)</label>
                <input 
                  type="datetime-local" 
                  className="input-control" 
                  style={{ width: "100%" }}
                  value={manualTimestamp}
                  onChange={(e) => setManualTimestamp(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label className="filter-label">Metrics (Min 2 required)</label>
              {manualMetrics.map((m, idx) => (
                <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                  <input type="text" className="input-control" placeholder="Metric Name (e.g. cpu_usage)" value={m.metric} onChange={(e) => { const newM = [...manualMetrics]; newM[idx].metric = e.target.value; setManualMetrics(newM); }} style={{ flex: 2 }} />
                  <input type="number" step="any" className="input-control" placeholder="Value" value={m.value} onChange={(e) => { const newM = [...manualMetrics]; newM[idx].value = e.target.value; setManualMetrics(newM); }} style={{ flex: 1 }} />
                  <input type="text" className="input-control" placeholder="Unit" value={m.unit} onChange={(e) => { const newM = [...manualMetrics]; newM[idx].unit = e.target.value; setManualMetrics(newM); }} style={{ flex: 1 }} />
                  <button type="button" className="btn" style={{ padding: "0.5rem", background: "transparent", color: "hsl(var(--color-critical))" }} onClick={() => removeMetricRow(idx)} disabled={manualMetrics.length <= 2}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              ))}
              <button type="button" className="btn" style={{ padding: "0.5rem 1rem", background: "transparent", border: "1px dashed hsl(var(--border-glass))", width: "100%", marginTop: "0.5rem" }} onClick={addMetricRow}>
                <i className="ri-add-line"></i> Add Metric Row
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmittingManual}>
              {isSubmittingManual ? "Submitting..." : "Submit to InfluxDB"}
            </button>
          </form>
        </div>

        {/* CSV Batch Upload */}
        <div className="card">
          <h3 style={{ marginBottom: "1.5rem" }}>CSV Batch Upload</h3>
          
          {batchError && (
            <div className="error-alert" style={{ marginBottom: "1.5rem" }}>
              <i className="ri-error-warning-line"></i> {batchError}
            </div>
          )}

          {batchResult && (
            <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "8px", border: `1px solid ${batchResult.records_rejected ? 'hsl(var(--color-warning))' : 'hsl(var(--color-ok))'}`, backgroundColor: batchResult.records_rejected ? 'hsl(var(--color-warning) / 0.1)' : 'hsl(var(--color-ok) / 0.1)' }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Upload Complete</h4>
              <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                <li><strong>{batchResult.records_ingested}</strong> records ingested successfully.</li>
                {batchResult.records_rejected !== undefined && batchResult.records_rejected > 0 && (
                  <li style={{ color: "hsl(var(--color-critical))" }}><strong>{batchResult.records_rejected}</strong> records rejected.</li>
                )}
              </ul>
              
              {batchResult.errors && batchResult.errors.length > 0 && (
                <div style={{ marginTop: "1rem", fontSize: "0.85rem", maxHeight: "150px", overflowY: "auto", background: "hsl(var(--bg-card))", padding: "0.5rem", borderRadius: "4px", border: "1px solid hsl(var(--border-glass))" }}>
                  {batchResult.errors.map((e, i) => (
                    <div key={i} style={{ color: "hsl(var(--color-critical))", marginBottom: "0.25rem" }}>
                      <strong>Row {e.row}:</strong> {e.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleBatchSubmit}>
            <div style={{ 
              border: "2px dashed hsl(var(--border-glass))", 
              borderRadius: "12px", 
              padding: "3rem", 
              textAlign: "center",
              marginBottom: "1.5rem",
              backgroundColor: "hsl(var(--bg-main))"
            }}>
              <i className="ri-file-upload-line" style={{ fontSize: "3rem", color: "hsl(var(--text-muted))" }}></i>
              <h4 style={{ margin: "1rem 0 0.5rem" }}>Upload CSV File</h4>
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Expected columns: <code>timestamp, source_id, metric, value, unit</code>
              </p>
              <input 
                type="file" 
                id="csvUpload" 
                accept=".csv"
                onChange={handleFileChange}
                style={{ width: "100%" }}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmittingBatch || !csvFile}>
              {isSubmittingBatch ? "Uploading..." : "Upload & Process"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
