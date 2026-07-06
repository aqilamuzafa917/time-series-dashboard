import React, { useState, useEffect } from "react";
import { apiGet } from "../api";
import { HealthResponse } from "../types";

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);

    apiGet<HealthResponse>("/api/health")
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to fetch backend health status.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">System Status</h2>
        <p className="page-subtitle">Real-time health connection room for FastAPI and InfluxDB</p>
      </div>

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="text-muted-col">Checking services connectivity...</p>
        </div>
      )}

      {error && (
        <div className="error-alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button className="btn-action" onClick={handleRetry}>
            Retry Connection
          </button>
        </div>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Backend Connection Status */}
          <div className="card connection-card">
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                FastAPI Gateway API
              </h3>
              <p className="text-muted-col" style={{ fontSize: "0.85rem" }}>
                State of the FastAPI container backend proxy
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="badge-status badge-ok">Connected</span>
              <div className="pulse-dot pulse-green"></div>
            </div>
          </div>

          {/* InfluxDB Connection Status */}
          <div className="card connection-card">
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                InfluxDB 3 Core Database
              </h3>
              <p className="text-muted-col" style={{ fontSize: "0.85rem" }}>
                Time-series datastore connectivity mapped via host
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {data.influxdb_connected ? (
                <>
                  <span className="badge-status badge-ok">Connected</span>
                  <div className="pulse-dot pulse-green"></div>
                </>
              ) : (
                <>
                  <span className="badge-status badge-critical">Disconnected</span>
                  <div className="pulse-dot pulse-red"></div>
                </>
              )}
            </div>
          </div>
          
          <div className="grid-summary" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <div className="card">
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(var(--text-secondary))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Database (InfluxDB 3 equivalent of Bucket)
              </h4>
              <p style={{ fontFamily: "monospace", fontSize: "1.2rem", fontWeight: 600 }}>
                {data.database || "Unknown"}
              </p>
            </div>
            
            <div className="card">
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(var(--text-secondary))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Latest Ingested
              </h4>
              <p style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>
                {data.latest_ingested_at ? new Date(data.latest_ingested_at).toLocaleString() : "No data"}
              </p>
            </div>
            
            <div className="card">
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(var(--text-secondary))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Last Verified Timestamp
              </h4>
              <p style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>
                {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
