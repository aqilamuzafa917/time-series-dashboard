import React, { useState, useEffect } from "react";
import { apiGet } from "../api";
import { SummaryItem, LatestItem } from "../types";

export default function DashboardPage() {
  // Default time range: Last 24 hours
  const getInitialTimeRange = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Format to YYYY-MM-DDTHH:MM for HTML input datetime-local
    const formatLocal = (date: Date) => {
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      const localISOTime = new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
      return localISOTime;
    };

    return {
      start: formatLocal(oneDayAgo),
      end: formatLocal(now),
    };
  };

  const [timeRange, setTimeRange] = useState(getInitialTimeRange());
  const [summaryData, setSummaryData] = useState<SummaryItem[] | null>(null);
  const [latestData, setLatestData] = useState<LatestItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Convert local datetime-local format back to standard ISO string (UTC)
    const startISO = new Date(timeRange.start).toISOString();
    const endISO = new Date(timeRange.end).toISOString();

    // Fetch summary and latest records in parallel
    Promise.all([
      apiGet<SummaryItem[]>("/api/metrics/summary", { start: startISO, end: endISO }),
      apiGet<LatestItem[]>("/api/metrics/latest", { limit: "20" }),
    ])
      .then(([summary, latest]) => {
        setSummaryData(summary);
        setLatestData(latest);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [timeRange, retryCount]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTimeRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const getStatusCardClass = (status: SummaryItem["status"]) => {
    if (status === "critical") return "card-critical";
    if (status === "warning") return "card-warning";
    return "card-ok";
  };

  const getStatusBadgeClass = (status: SummaryItem["status"]) => {
    if (status === "critical") return "badge-critical";
    if (status === "warning") return "badge-warning";
    return "badge-ok";
  };

  // Convert key names into readable text (e.g. cpu_usage -> CPU Usage)
  const formatMetricLabel = (label: string) => {
    return label.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Metrics Overview</h2>
        <p className="page-subtitle">Historical aggregates and latest live telemetry logs</p>
      </div>

      {/* Time Range Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label" htmlFor="start">Start Time</label>
          <input
            id="start"
            type="datetime-local"
            name="start"
            value={timeRange.start}
            onChange={handleTimeChange}
            className="input-control"
          />
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="end">End Time</label>
          <input
            id="end"
            type="datetime-local"
            name="end"
            value={timeRange.end}
            onChange={handleTimeChange}
            className="input-control"
          />
        </div>
        {error && (
          <button className="btn-action" onClick={handleRetry} style={{ height: "38px" }}>
            Retry Request
          </button>
        )}
      </div>

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="text-muted-col">Querying database records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary Cards Grid */}
          <div className="grid-summary">
            {summaryData && summaryData.length > 0 ? (
              summaryData.map((item, idx) => (
                <div
                  key={`${item.source_id}-${item.metric}-${idx}`}
                  className={`card ${getStatusCardClass(item.status)}`}
                >
                  <div className="card-header-info">
                    <div>
                      <span className="card-source">{item.source_id}</span>
                      <h3 className="card-metric-name">{formatMetricLabel(item.metric)}</h3>
                    </div>
                    <span className={`badge-status ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="card-value-display">
                    <span className="card-current-value">{item.current.toFixed(1)}</span>
                    <span className="card-unit">
                      {item.metric.includes("usage") ? "%" : item.metric.includes("temp") ? "°C" : "MB/s"}
                    </span>
                  </div>

                  <div className="card-stats-row">
                    <div className="stat-box">
                      <div className="stat-label">Min</div>
                      <div className="stat-val">{item.min.toFixed(1)}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-label">Avg</div>
                      <div className="stat-val">{item.avg.toFixed(1)}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-label">Max</div>
                      <div className="stat-val">{item.max.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <h4>No summary metrics found</h4>
                <p>No data recorded within the selected timeframe.</p>
              </div>
            )}
          </div>

          {/* Latest Records Table */}
          <div className="table-container">
            <div className="table-header-box">
              <h3 className="table-title">Latest Ingested Logs</h3>
            </div>
            <div className="table-wrapper">
              {latestData && latestData.length > 0 ? (
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Source ID</th>
                      <th>Source Type</th>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestData.map((row, idx) => (
                      <tr key={`latest-${idx}`}>
                        <td className="text-muted-col">{new Date(row.time).toLocaleString()}</td>
                        <td>{row.source_id}</td>
                        <td style={{ textTransform: "capitalize" }}>{row.source_type}</td>
                        <td>{formatMetricLabel(row.metric)}</td>
                        <td style={{ fontWeight: 600 }}>{row.value.toFixed(1)}</td>
                        <td className="text-muted-col">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state" style={{ border: "none", borderRadius: 0 }}>
                  <h4>No logs available</h4>
                  <p>Check status view or seed data generator.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
