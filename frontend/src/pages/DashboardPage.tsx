import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { apiGet } from "../api";
import { SummaryItem, LatestItem, TimeseriesItem } from "../types";
import TimeRangeSelector from "../components/TimeRangeSelector";

// Single source of truth for status -> visual treatment.
// Previously this was three separate functions (card class, badge class, color)
// that all branched on the same status value and could drift out of sync.
const STATUS_STYLES: Record<
  SummaryItem["status"],
  { card: string; badge: string; color: string }
> = {
  critical: {
    card: "card-critical",
    badge: "badge-critical",
    color: "hsl(var(--color-critical))",
  },
  warning: {
    card: "card-warning",
    badge: "badge-warning",
    color: "hsl(var(--color-warning))",
  },
  ok: {
    card: "card-ok",
    badge: "badge-ok",
    color: "hsl(var(--text-primary))",
  },
};

const CHART_COLORS = ["#1A8FE3", "#F5A623", "#2FBF9F", "#6FCF97", "#D6249F", "#8884d8", "#FF8042"];

// Convert raw unit strings from the DB to display symbols
const unitToSymbol = (unit: string): string => {
  const u = unit.trim().toLowerCase();
  if (u === "percent" || u === "%") return "%";
  if (u === "celsius" || u === "°c" || u === "c") return "°C";
  if (u === "mb/s" || u === "megabytes/s" || u === "mbps") return "MB/s";
  if (u === "watt" || u === "watts" || u === "w") return "W";
  if (u === "gb" || u === "gigabytes") return "GB";
  if (u === "mb" || u === "megabytes") return "MB";
  if (u === "kb" || u === "kilobytes") return "KB";
  if (u === "kb/s" || u === "kilobytes/s" || u === "kbps") return "KB/s";
  if (u === "gb/s" || u === "gigabytes/s" || u === "gbps") return "GB/s";
  if (u === "ms" || u === "milliseconds") return "ms";
  if (u === "s" || u === "seconds") return "s";
  if (u === "rpm") return "RPM";
  return unit;
};

const formatMetricLabel = (label: string) =>
  label.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
  const [activeSources, setActiveSources] = useState<string[] | null>(null); // null = not yet loaded
  const [summaryData, setSummaryData] = useState<SummaryItem[] | null>(null);
  const [latestData, setLatestData] = useState<LatestItem[] | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesItem[] | null>(null);

  // `loading` only drives the *initial* full-page spinner. Refetches after
  // that (time range changes, retries) use `isRefetching` so existing
  // content stays on screen instead of being unmounted and reflowed.
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const hasLoadedOnce = summaryData !== null;

  // Load active sources once on mount
  useEffect(() => {
    apiGet<{ sources: string[]; metrics: string[] }>("/api/metrics/list", { active_only: "true" })
      .then((data) => setActiveSources(data.sources))
      .catch(() => setActiveSources([]));
  }, []);

  useEffect(() => {
    // Wait until active sources have been resolved
    if (activeSources === null) return;

    if (hasLoadedOnce) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const startISO = new Date(timeRange.start).toISOString();
    const endISO = new Date(timeRange.end).toISOString();

    // Pass active source IDs as filter; if list is empty no data will match
    const sourceFilter = activeSources.length > 0 ? { source_id: activeSources } : {};

    Promise.all([
      apiGet<SummaryItem[]>("/api/metrics/summary", { start: startISO, end: endISO, ...sourceFilter }),
      apiGet<LatestItem[]>("/api/metrics/latest", { limit: "20", ...sourceFilter }),
      apiGet<TimeseriesItem[]>("/api/metrics/timeseries", { start: startISO, end: endISO, interval: "1h", ...sourceFilter }),
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
        setIsRefetching(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, activeSources, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  // Group timeseries data for the chart
  const chartData = React.useMemo(() => {
    if (!timeseriesData) return [];
    const grouped: Record<string, any> = {};

    timeseriesData.forEach((item) => {
      const time = new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (!grouped[time]) {
        grouped[time] = { time };
      }
      const key = `${item.source_id}_${item.metric}`;
      grouped[time][key] = item.avg;
    });

    return Object.values(grouped);
  }, [timeseriesData]);

  // Extract unique lines, with a friendlier display name for the legend
  const lineSeries = React.useMemo(() => {
    if (!timeseriesData) return [];
    const keys = new Set<string>();
    timeseriesData.forEach((item) => {
      keys.add(`${item.source_id}_${item.metric}`);
    });
    return Array.from(keys).map((key) => {
      const [sourceId, ...metricParts] = key.split("_");
      const metric = metricParts.join("_");
      return { key, label: `${sourceId} · ${formatMetricLabel(metric)}` };
    });
  }, [timeseriesData]);

  // Group summary metrics by source_id, sorted alphabetically by metric
  const groupedSummary = React.useMemo(() => {
    if (!summaryData) return {};
    const groups: Record<string, SummaryItem[]> = {};
    summaryData.forEach((item) => {
      if (!groups[item.source_id]) {
        groups[item.source_id] = [];
      }
      groups[item.source_id].push(item);
    });

    Object.keys(groups).forEach((sourceId) => {
      groups[sourceId].sort((a, b) => a.metric.localeCompare(b.metric));
    });

    return groups;
  }, [summaryData]);

  return (
    <div>
      {/* Old layout:
      <div className="page-header">
        <h2 className="page-title">Metrics Overview</h2>
        <p className="page-subtitle">Historical aggregates and latest live telemetry logs</p>
      </div>

      <div className="filter-bar">
        <TimeRangeSelector timeRange={timeRange} onChange={setTimeRange} />
      </div>
      */}

      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 className="page-title">Metrics Overview</h2>
          <p className="page-subtitle">Historical aggregates and latest live telemetry logs</p>
        </div>

        <TimeRangeSelector timeRange={timeRange} onChange={setTimeRange} />
      </div>

      {error && (
        <div className="error-alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button className="btn-action" onClick={handleRetry}>
            Retry Request
          </button>
        </div>
      )}

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="text-muted-col">Querying database records...</p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ opacity: isRefetching ? 0.6 : 1, pointerEvents: isRefetching ? "none" : "auto", transition: "opacity 0.15s" }}>

          {summaryData && summaryData.length > 0 ? (
            Object.entries(groupedSummary)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([sourceId, items]) => (
                <div key={sourceId} className="source-group" style={{ marginBottom: "2rem" }}>
                  <h2
                    className="source-group-title"
                    style={{
                      marginBottom: "1rem",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      borderBottom: "1px solid hsl(var(--border-glass))",
                      paddingBottom: "0.5rem",
                      color: "hsl(var(--color-primary))",
                    }}
                  >
                    {sourceId}
                  </h2>
                  <div className="grid-summary">
                    {items.map((item, idx) => {
                      const styles = STATUS_STYLES[item.status];
                      const minStyles = STATUS_STYLES[item.status_min];
                      const avgStyles = STATUS_STYLES[item.status_avg];
                      const maxStyles = STATUS_STYLES[item.status_max];
                      return (
                        <Link
                          key={`${item.source_id}-${item.metric}-${idx}`}
                          to={`/detail/${item.source_id}/${item.metric}`}
                          className={`card ${styles.card}`}
                          style={{ textDecoration: "none", color: "inherit", display: "block", transition: "transform 0.2s" }}
                        >
                          <div className="card-header-info">
                            <div>
                              <span className="card-source">{item.source_id}</span>
                              <h4 className="card-metric-name">{formatMetricLabel(item.metric)}</h4>
                            </div>
                            <span className={`badge-status ${styles.badge}`}>{item.status}</span>
                          </div>

                          <div className="card-value-display">
                            <span className="card-current-value">{item.current.toFixed(1)}</span>
                            <span className="card-unit">{unitToSymbol(item.unit || "")}</span>
                          </div>

                          <div className="card-stats-row">
                            <div className="stat-box">
                              <div className="stat-label" style={{ color: minStyles.color }}>Min</div>
                              <div className="stat-val" style={{ color: minStyles.color }}>{item.min.toFixed(1)}</div>
                            </div>
                            <div className="stat-box">
                              <div className="stat-label" style={{ color: avgStyles.color }}>Avg</div>
                              <div className="stat-val" style={{ color: avgStyles.color }}>{item.avg.toFixed(1)}</div>
                            </div>
                            <div className="stat-box">
                              <div className="stat-label" style={{ color: maxStyles.color }}>Max</div>
                              <div className="stat-val" style={{ color: maxStyles.color }}>{item.max.toFixed(1)}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
          ) : (
            <div className="empty-state">
              <h4>No summary metrics found</h4>
              <p>No data recorded within the selected timeframe.</p>
            </div>
          )}

          {/* Trend Chart */}
          {chartData.length > 0 && (
            <div className="card" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Global Trend Overview</h3>
              <div style={{ height: "320px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--text-muted))" opacity={0.3} />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
                    {lineSeries.map((series, i) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        name={series.label}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
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
        </div>
      )}
    </div>
  );
}