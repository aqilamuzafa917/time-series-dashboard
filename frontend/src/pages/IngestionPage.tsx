import React, { useState, useEffect } from "react";
import { apiGet } from "../api";
import { IngestionSummary, IngestionError, IngestionLogItem } from "../types";
import TimeRangeSelector from "../components/TimeRangeSelector";

export default function IngestionPage() {
  const [summary, setSummary] = useState<IngestionSummary | null>(null);
  const [errors, setErrors] = useState<IngestionError[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Log table has its own independent time range
  const getInitialLogRange = () => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const formatLocal = (d: Date) => {
      const offsetMs = d.getTimezoneOffset() * 60 * 1000;
      return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
    };
    return { start: formatLocal(sixHoursAgo), end: formatLocal(now) };
  };

  const [logTimeRange, setLogTimeRange] = useState(getInitialLogRange);
  const [log, setLog] = useState<IngestionLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  // Fetch summary + errors (not time-range dependent)
  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [sumData, errData] = await Promise.all([
        apiGet<IngestionSummary>("/api/ingestion/summary"),
        apiGet<IngestionError[]>("/api/ingestion/errors"),
      ]);
      setSummary(sumData);
      setErrors(errData);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load ingestion data.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch log whenever time range changes
  const fetchLog = async (range: { start: string; end: string }) => {
    setLogLoading(true);
    try {
      const data = await apiGet<IngestionLogItem[]>("/api/ingestion/log", {
        start: new Date(range.start).toISOString(),
        end: new Date(range.end).toISOString(),
      });
      setLog(data);
    } catch {
      setLog([]);
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchLog(logTimeRange); }, [logTimeRange]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 className="page-title">Ingestion Dashboard</h2>
          <p className="page-subtitle">Monitor data flowing into InfluxDB and track rejected records.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { fetchData(); fetchLog(logTimeRange); }} 
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <i className={`ri-refresh-line ${loading ? "ri-spin" : ""}`}></i>
          Refresh
        </button>
      </div>

      {fetchError && (
        <div className="error-alert">
          <i className="ri-error-warning-line"></i>
          {fetchError}
        </div>
      )}

      {/* Summary Stats */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1.5rem", color: "hsl(var(--text-primary))" }}>Latest Successful Ingestion</h3>
        
        {loading && !summary ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-muted))" }}>Loading summary...</div>
        ) : summary && summary.latest_success_at ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            <div className="stat-box">
              <div className="stat-label">Timestamp</div>
              <div className="stat-val" style={{ fontSize: "1.1rem" }}>
                {new Date(summary.latest_success_at).toLocaleString()}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Records Ingested</div>
              <div className="stat-val" style={{ fontSize: "1.5rem", color: "hsl(var(--color-ok))" }}>
                {summary.last_batch_records}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Source ID</div>
              <div className="stat-val" style={{ fontSize: "1.1rem" }}>
                {summary.last_batch_source || "Multiple/Batch"}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Method</div>
              <div className="stat-val" style={{ fontSize: "1.1rem", textTransform: "capitalize" }}>
                {summary.last_batch_method}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h4>No successful ingestions yet</h4>
            <p>Data will appear here once metrics are successfully loaded.</p>
          </div>
        )}
      </div>

      {/* Errors Table */}
      <div className="table-container" style={{ marginTop: 0 }}>
        <div className="table-header-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="table-title">Recent Ingestion Errors</h3>
          <span className="badge-critical" style={{ padding: "0.25rem 0.5rem", borderRadius: "100px", fontSize: "0.8rem", fontWeight: "bold" }}>
            {errors.length} {errors.length === 1 ? "Error" : "Errors"} logged
          </span>
        </div>
        
        <div className="table-wrapper">
          {loading && errors.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--text-muted))" }}>Loading errors...</div>
          ) : errors.length > 0 ? (
            <table className="metric-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source ID</th>
                  <th>Method</th>
                  <th>Rejected</th>
                  <th>Error Message</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, idx) => (
                  <tr key={`err-${idx}`}>
                    <td className="text-muted-col">{new Date(err.time).toLocaleString()}</td>
                    <td>{err.source_id || "-"}</td>
                    <td style={{ textTransform: "capitalize" }}>{err.method}</td>
                    <td style={{ color: "hsl(var(--color-critical))", fontWeight: "bold" }}>{err.records_rejected}</td>
                    <td style={{ color: "hsl(var(--color-critical))" }}>{err.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ border: "none", borderRadius: 0 }}>
              <div style={{ 
                width: "48px", height: "48px", borderRadius: "50%", 
                backgroundColor: "hsl(var(--color-ok) / 0.1)", color: "hsl(var(--color-ok))",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1rem"
              }}>
                <i className="ri-check-line" style={{ fontSize: "1.5rem" }}></i>
              </div>
              <h4>No ingestion errors found</h4>
              <p>Everything is running smoothly.</p>
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Log Table */}
      <div className="table-container" style={{ marginTop: "2rem" }}>
        <div className="table-header-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h3 className="table-title" style={{ margin: 0 }}>Ingestion Log</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "nowrap" }}>
              <TimeRangeSelector timeRange={logTimeRange} onChange={setLogTimeRange} />
              {/* <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>
                {log.length} {log.length === 1 ? "entry" : "entries"}
              </span> */}
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          {logLoading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--text-muted))" }}>Loading log...</div>
          ) : log.length > 0 ? (
            <table className="metric-table">
              <thead>
                <tr>
                  <th>Time</th> 
                  <th>Source ID</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Ingested</th>
                  <th style={{ textAlign: "right" }}>Rejected</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row, idx) => (
                  <tr key={`log-${idx}`}>
                    <td className="text-muted-col">{new Date(row.time).toLocaleString()}</td>
                    <td>{row.source_id || "-"}</td>
                    <td style={{ textTransform: "capitalize" }}>{row.method}</td>
                    <td style={{ textAlign: "right", color: "hsl(var(--color-ok))", fontWeight: 600 }}>
                      {row.records_ingested ?? "-"}
                    </td>
                    <td style={{ textAlign: "right", color: row.records_rejected ? "hsl(var(--color-critical))" : "hsl(var(--text-muted))", fontWeight: row.records_rejected ? 600 : 400 }}>
                      {row.records_rejected ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ border: "none", borderRadius: 0 }}>
              <h4>No ingestion activity in the selected time range</h4>
              <p>Records will appear here as data is ingested.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
