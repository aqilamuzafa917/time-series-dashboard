import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet } from "../api";
import { SummaryItem, LatestItem, TimeseriesItem } from "../types";
import TimeRangeSelector from "../components/TimeRangeSelector";

export default function DashboardPage() {
  const getInitialTimeRange = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const formatLocal = (date: Date) => {
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    };

    return {
      start: formatLocal(oneDayAgo),
      end: formatLocal(now),
    };
  };

  const [timeRange, setTimeRange] = useState(getInitialTimeRange());
  const [summaryData, setSummaryData] = useState<SummaryItem[] | null>(null);
  const [latestData, setLatestData] = useState<LatestItem[] | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const startISO = new Date(timeRange.start).toISOString();
    const endISO = new Date(timeRange.end).toISOString();

    Promise.all([
      apiGet<SummaryItem[]>("/api/metrics/summary", { start: startISO, end: endISO }),
      apiGet<LatestItem[]>("/api/metrics/latest", { limit: "20" }),
      apiGet<TimeseriesItem[]>("/api/metrics/timeseries", { start: startISO, end: endISO, interval: "1h" })
    ])
      .then(([summary, latest, ts]) => {
        setSummaryData(summary);
        setLatestData(latest);
        setTimeseriesData(ts);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [timeRange, retryCount]);



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

  const formatMetricLabel = (label: string) => {
    return label.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Group timeseries data for the chart
  const chartData = React.useMemo(() => {
    if (!timeseriesData) return [];
    const grouped: Record<string, any> = {};
    
    timeseriesData.forEach(item => {
      const time = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!grouped[time]) {
        grouped[time] = { time };
      }
      const key = `${item.source_id}_${item.metric}`;
      grouped[time][key] = item.avg;
    });
    
    return Object.values(grouped);
  }, [timeseriesData]);

  // Extract unique lines
  const lineKeys = React.useMemo(() => {
    if (!timeseriesData) return [];
    const keys = new Set<string>();
    timeseriesData.forEach(item => {
      keys.add(`${item.source_id}_${item.metric}`);
    });
    return Array.from(keys);
  }, [timeseriesData]);

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Metrics Overview</h2>
        <p className="page-subtitle">Historical aggregates and latest live telemetry logs</p>
      </div>

      <div className="filter-bar">
        <TimeRangeSelector timeRange={timeRange} onChange={setTimeRange} />
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
          <div className="grid-summary">
            {summaryData && summaryData.length > 0 ? (
              summaryData.map((item, idx) => (
                <Link
                  key={`${item.source_id}-${item.metric}-${idx}`}
                  to={`/detail/${item.source_id}/${item.metric}`}
                  className={`card ${getStatusCardClass(item.status)}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }}
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
                </Link>
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <h4>No summary metrics found</h4>
                <p>No data recorded within the selected timeframe.</p>
              </div>
            )}
          </div>
          
          {/* Trend Chart */}
          {chartData.length > 0 && (
            <div className="card" style={{ marginTop: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Global Trend Overview</h3>
              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    {lineKeys.map((key, i) => (
                      <Line 
                        key={key}
                        type="monotone" 
                        dataKey={key} 
                        stroke={colors[i % colors.length]} 
                        dot={false}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

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
