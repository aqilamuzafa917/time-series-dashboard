import React, { useState, useEffect } from "react";
import { apiGet, apiPost, BASE_URL } from "../api";
import { SourceItem, IngestResult } from "../types";
// MANUAL INGEST
export default function IngestPage() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Ingest State
  const [manualSourceId, setManualSourceId] = useState("");
  const [manualTimestamp, setManualTimestamp] = useState("");
  const [manualMetrics, setManualMetrics] = useState([{ metric: "", value: "", unit: "" }]);
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
        const active = data.filter(s => s.active);
        setSources(active);
        if (active.length > 0) {
          setManualSourceId(active[0].source_id);
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
    if (validMetrics.length < 1) {
      setManualError("At least 1 metric value is required per submission.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const selectedSource = sources.find(s => s.source_id === manualSourceId);
      const payload = {
        source_id: manualSourceId,
        source_type: selectedSource?.source_type || "unknown",
        timestamp: manualTimestamp ? new Date(manualTimestamp).toISOString() : undefined,
        metrics: validMetrics.map(m => ({
          metric: m.metric.trim(),
          value: parseFloat(m.value),
          unit: m.unit.trim()
        }))
      };

      const result = await apiPost<IngestResult>("/api/ingest/manual", payload);
      setManualResult(result);
      setManualMetrics([{ metric: "", value: "", unit: "" }]);
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
      const res = await fetch(`${BASE_URL}/api/ingest/batch`, {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        let errorMsg = `Batch ingestion failed: ${res.status} ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch {}
        throw new Error(errorMsg);
      }
      
      const data = await res.json();

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
    <div className="ingest-page">
      <style>{`
        .ingest-page .ingest-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 2rem;
          align-items: start;
        }
        .ingest-page .card {
          min-width: 0; /* prevents grid children from overflowing their track */
        }
        .ingest-page .field-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .ingest-page .field-row > div {
          flex: 1 1 180px;
          min-width: 0;
        }
        .ingest-page .metric-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        .ingest-page .metric-row input {
          min-width: 0;
        }
        .ingest-page .metric-name {
          flex: 2 1 160px;
        }
        .ingest-page .metric-value {
          flex: 1 1 90px;
        }
        .ingest-page .metric-unit {
          flex: 1 1 90px;
        }
        .ingest-page .metric-row .btn-icon {
          flex: 0 0 auto;
        }
        .ingest-page .dropzone {
          border: 2px dashed hsl(var(--border-glass));
          border-radius: 12px;
          padding: clamp(1.5rem, 5vw, 3rem);
          text-align: center;
          margin-bottom: 1.5rem;
          background-color: hsl(var(--bg-main));
        }
        .ingest-page .dropzone input[type="file"] {
          width: 100%;
          max-width: 100%;
        }
        .ingest-page .batch-summary {
          margin-bottom: 1.5rem;
          padding: 1rem;
          border-radius: 8px;
        }
        .ingest-page .batch-errors {
          margin-top: 1rem;
          font-size: 0.85rem;
          max-height: 150px;
          overflow-y: auto;
          background: hsl(var(--bg-card));
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid hsl(var(--border-glass));
          word-break: break-word;
        }
      `}</style>

      <div style={{ marginBottom: "2rem" }}>
        <h2 className="page-title">Data Ingestion</h2>
        <p className="page-subtitle">Push data directly into InfluxDB via manual entry or bulk CSV upload.</p>
      </div>

      <div className="ingest-grid">

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
            <div className="field-row">
              <div>
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
              <div>
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
              <label className="filter-label">Metrics (Min 1 required)</label>
              {manualMetrics.map((m, idx) => (
                <div key={idx} className="metric-row">
                  <input type="text" className="input-control metric-name" placeholder="Metric Name (e.g. cpu_usage)" value={m.metric} onChange={(e) => { const newM = [...manualMetrics]; newM[idx].metric = e.target.value; setManualMetrics(newM); }} />
                  <input type="number" step="any" className="input-control metric-value" placeholder="Value" value={m.value} onChange={(e) => { const newM = [...manualMetrics]; newM[idx].value = e.target.value; setManualMetrics(newM); }} />
                  <input type="text" className="input-control metric-unit" placeholder="Unit" value={m.unit} onChange={(e) => { const newM = [...manualMetrics]; newM[idx].unit = e.target.value; setManualMetrics(newM); }} />
                  <button type="button" className="btn btn-icon btn-danger" onClick={() => removeMetricRow(idx)} disabled={manualMetrics.length <= 1}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: "0.5rem", borderStyle: "dashed" }} onClick={addMetricRow}>
                <i className="ri-add-line"></i> Add Metric Row
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.65rem" }} disabled={isSubmittingManual}>
              {isSubmittingManual ? <><i className="ri-loader-4-line ri-spin"></i> Submitting...</> : <><i className="ri-send-plane-line"></i> Submit to InfluxDB</>}
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
            <div className="batch-summary" style={{ border: `1px solid ${batchResult.records_rejected ? 'hsl(var(--color-warning))' : 'hsl(var(--color-ok))'}`, backgroundColor: batchResult.records_rejected ? 'hsl(var(--color-warning) / 0.1)' : 'hsl(var(--color-ok) / 0.1)' }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Upload Complete</h4>
              <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                <li><strong>{batchResult.records_ingested}</strong> records ingested successfully.</li>
                {batchResult.records_rejected !== undefined && batchResult.records_rejected > 0 && (
                  <li style={{ color: "hsl(var(--color-critical))" }}><strong>{batchResult.records_rejected}</strong> records rejected.</li>
                )}
              </ul>

              {batchResult.errors && batchResult.errors.length > 0 && (
                <div className="batch-errors">
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
            <div className="dropzone">
              <i className="ri-file-upload-line" style={{ fontSize: "3rem", color: "hsl(var(--text-muted))" }}></i>
              <h4 style={{ margin: "1rem 0 0.5rem" }}>Upload CSV File</h4>
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Expected columns: <code>timestamp, source_id, source_type, metric, value, unit</code>
              </p>
              <input
                type="file"
                id="csvUpload"
                accept=".csv"
                onChange={handleFileChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.65rem" }} disabled={isSubmittingBatch || !csvFile}>
              {isSubmittingBatch ? <><i className="ri-loader-4-line ri-spin"></i> Uploading...</> : <><i className="ri-upload-cloud-line"></i> Upload &amp; Process</>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}