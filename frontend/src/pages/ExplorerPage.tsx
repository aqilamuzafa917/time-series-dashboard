import React, { useState, useEffect } from "react";
import { apiGet } from "../api";
import { SummaryItem, TimeseriesItem, ThresholdItem } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import TimeRangeSelector from "../components/TimeRangeSelector";

const MultiSelectChecklist = ({
  options,
  selected,
  onChange,
  label,
  width = "220px"
}: {
  options: string[];
  selected: string[];
  onChange: (val: string) => void;
  label: string;
  width?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="multi-select-container" ref={containerRef} style={{ position: 'relative', width: width, outline: 'none' }}>
      <div 
        className="input-control" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none', outline: 'none' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length === 0 ? (label === "Status" ? "All" : `All ${label}s`) : `${selected.length} selected`}
        </span>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line`}></i>
      </div>
      
      {isOpen && (
        <div 
          style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, 
            background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-glass))', 
            borderRadius: '4px', marginTop: '4px', maxHeight: '250px', overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', outline: 'none'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '8px', color: 'hsl(var(--text-muted))' }}>No options</div>
          ) : (
            options.map(opt => (
              <label 
                key={opt} 
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '10px 12px', 
                  cursor: 'pointer', borderBottom: '1px solid hsl(var(--border-glass))',
                  margin: 0
                }}
              >
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt)}
                  onChange={() => onChange(opt)}
                  style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer', outline: 'none' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))', textTransform: 'capitalize' }}>
                  {opt.replace("_", " ")}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function ExplorerPage() {
  // Available filter options (loaded on mount from summary API)
  const [sources, setSources] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);

  // Default time range: Last 24 hours
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

  // State filters
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState(getInitialTimeRange());
  const [interval, setInterval] = useState("1h");

  // Query state
  const [rawRows, setRawRows] = useState<TimeseriesItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  // Status filter state (multi select list)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSources, selectedMetrics, timeRange, interval, selectedStatuses]);

  // Thresholds (commented out as logic is now handled in backend)
  // const [thresholds, setThresholds] = useState<ThresholdItem[]>([]);
  // useEffect(() => {
  //   apiGet<ThresholdItem[]>("/api/thresholds").then(setThresholds).catch(() => {});
  // }, []);

  // const thresholdMap = React.useMemo(() => {
  //   const m: Record<string, ThresholdItem> = {};
  //   thresholds.forEach(t => { m[t.metric] = t; });
  //   return m;
  // }, [thresholds]);

  // const computeStatus = (value: number, t?: ThresholdItem): "ok" | "warning" | "critical" => {
  //   if (!t || !t.active) return "ok";
  //   if (t.critical_high !== undefined && value > t.critical_high) return "critical";
  //   if (t.warning_high !== undefined && value > t.warning_high) return "warning";
  //   return "ok";
  // };

  const getStatColor = (status: "ok" | "warning" | "critical") => {
    if (status === "critical") return "hsl(var(--color-critical))";
    if (status === "warning") return "hsl(var(--color-warning))";
    return "hsl(var(--text-primary))";
  };

  // 1. On Mount: Fetch initial sources and metrics from database (active sources only)
  useEffect(() => {
    apiGet<{sources: string[], metrics: string[]}>("/api/metrics/list", { active_only: "true" })
      .then((data) => {
        setSources(data.sources);
        setMetrics(data.metrics);

        // Auto-select first source and metric by default to show initial graph
        if (data.sources.length > 0) setSelectedSources([data.sources[0]]);
        if (data.metrics.length > 0) setSelectedMetrics([data.metrics[0]]);
      })
      .catch((err) => {
        console.error("Failed to load metadata dropdowns:", err);
      });
  }, []);

  // 2. On Filter Change: Re-fetch time-series aggregates
  useEffect(() => {
    // Only query if we have at least one source and metric selected
    if (selectedSources.length === 0 || selectedMetrics.length === 0) {
      setRawRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const startISO = new Date(timeRange.start).toISOString();
    const endISO = new Date(timeRange.end).toISOString();

    apiGet<TimeseriesItem[]>("/api/metrics/timeseries", {
      start: startISO,
      end: endISO,
      interval,
      source_id: selectedSources,
      metric: selectedMetrics,
    })
      .then(setRawRows)
      .catch((err) => {
        setError(err.message || "Failed to load timeseries query results.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedSources, selectedMetrics, timeRange, interval, retryCount]);

  // Reshape InfluxDB rows (grouped by tag combo) into Recharts format (aligned by time coordinate)
  const reshapeData = (rows: TimeseriesItem[]) => {
    const timeMap: Record<string, any> = {};
    const seriesKeys = new Set<string>();

    rows.forEach((row) => {
      const key = `${row.source_id} - ${row.metric}`;
      seriesKeys.add(key);

      if (!timeMap[row.time]) {
        timeMap[row.time] = {
          time: row.time,
          displayTime: new Date(row.time).toLocaleString(),
        };
      }
      timeMap[row.time][key] = parseFloat(row.avg.toFixed(2));
    });

    const chartData = Object.values(timeMap).sort((a: any, b: any) =>
      a.time.localeCompare(b.time)
    );
    return { chartData, seriesKeys: Array.from(seriesKeys) };
  };

  const { chartData, seriesKeys } = rawRows ? reshapeData(rawRows) : { chartData: [], seriesKeys: [] };

  const toggleSource = (src: string) => {
    setSelectedSources(prev => 
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  const toggleMetric = (m: string) => {
    setSelectedMetrics(prev => 
      prev.includes(m) ? prev.filter(s => s !== m) : [...prev, m]
    );
  };



  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleExportCSV = () => {
    if (!rawRows || rawRows.length === 0) return;
    // Columns match the batch ingest CSV format: timestamp, source_id, source_type, metric, value, unit
    const headers = ["timestamp", "source_id", "source_type", "metric", "value", "unit"];
    const csv = [
      headers.join(","),
      ...rawRows.map(r =>
        [
          new Date(r.time).toISOString(),
          r.source_id,
          r.source_type || "unknown",
          r.metric,
          r.avg.toFixed(2),
          r.unit || ""
        ].join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `explorer-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const COLORS = ["#1A8FE3", "#F5A623", "#2FBF9F", "#6FCF97", "#D6249F", "#8884d8", "#FF8042"];

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredRows = React.useMemo(() => {
    if (!rawRows) return [];
    if (selectedStatuses.length === 0) return rawRows;
    
    return rawRows.filter(row => {
      const isCrit = row.status === "critical" || row.status_min === "critical" || row.status_max === "critical";
      const isWarn = row.status === "warning" || row.status_min === "warning" || row.status_max === "warning";
      const isOk = row.status === "ok" && (row.status_min === "ok" || !row.status_min) && (row.status_max === "ok" || !row.status_max);
      
      if (selectedStatuses.includes("critical") && isCrit) return true;
      if (selectedStatuses.includes("warning") && isWarn) return true;
      if (selectedStatuses.includes("ok") && isOk) return true;
      return false;
    });
  }, [rawRows, selectedStatuses]);

  const paginatedRows = React.useMemo(() => {
    return filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 className="page-title">Metric Explorer</h2>
          <p className="page-subtitle">Analyze metrics aggregations and zoom trends using dynamic parameters</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-ghost" onClick={() => window.print()} title="Print PDF">
            <i className="ri-printer-line"></i> Print PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            disabled={!rawRows || rawRows.length === 0}
            title="Export CSV"
          >
            <i className="ri-file-excel-2-line"></i> Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Query Filter Controls */}
      <div className="filter-bar">
        {/* Source selector */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="source-select">Source Devices</label>
          <MultiSelectChecklist 
            options={sources} 
            selected={selectedSources} 
            onChange={toggleSource} 
            label="Source" 
          />
        </div>

        {/* Metric selector */}
        <div className="filter-group">
          <label className="filter-label">Telemetry Metrics</label>
          <MultiSelectChecklist 
            options={metrics} 
            selected={selectedMetrics} 
            onChange={toggleMetric} 
            label="Metric" 
          />
        </div>

        {/* Time filters */}
        <TimeRangeSelector timeRange={timeRange} onChange={setTimeRange} />

        {/* Bin interval */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="interval-select">Interval</label>
          <select
            id="interval-select"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="input-control"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="30m">30 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="12h">12 Hours</option>
            <option value="1d">1 Day</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="text-muted-col">Analyzing bucketed records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button className="btn-action" onClick={handleRetry}>
            Retry Query
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Recharts Graphical Display */}
          {chartData.length > 0 ? (
            <div className="chart-container-card">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--text-muted))" opacity={0.3} />
                  <XAxis
                    dataKey="displayTime"
                    stroke="hsl(var(--text-secondary))"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--text-secondary))"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Legend />
                  {seriesKeys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: "2rem" }}>
              <h4>No chart coordinates loaded</h4>
              <p>Please select at least one source and metric above to display the chart.</p>
            </div>
          )}

          {/* Raw Grid Table */}
          <div className="table-container" style={{ marginTop: 0, overflow: "visible" }}>
            <div className="table-header-box">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <h3 className="table-title">Timeseries Bucket Rows</h3>
                {rawRows && rawRows.length > 0 && (
                  <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>
                    {filteredRows.length} records {filteredRows.length !== rawRows.length && `(filtered from ${rawRows.length})`}
                  </span>
                )}
              </div>

              {rawRows && rawRows.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))", fontWeight: 500 }}>
                    Status:
                  </label>
                  <MultiSelectChecklist
                    options={["ok", "warning", "critical"]}
                    selected={selectedStatuses}
                    onChange={toggleStatusFilter}
                    label="Status"
                    width="150px"
                  />
                </div>
              )}
            </div>
            <div className="table-wrapper">
              {rawRows && rawRows.length > 0 ? (
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th>Time Bucket (Start)</th>
                      <th>Source ID</th>
                      <th>Metric</th>
                      <th>Avg Value</th>
                      <th>Min Value</th>
                      <th>Max Value</th>
                      <th>Data Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Original full mapping:
                    {rawRows.map((row, idx) => (
                      <tr key={`raw-row-${idx}`}>
                        <td className="text-muted-col">{new Date(row.time).toLocaleString()}</td>
                        <td>{row.source_id}</td>
                        <td style={{ textTransform: "capitalize" }}>{row.metric.replace("_", " ")}</td>
                        <td style={{ fontWeight: 600, color: getStatColor(row.status) }}>{row.avg.toFixed(2)}</td>
                        <td style={{ color: getStatColor(row.status_min || "ok") }}>{row.min.toFixed(2)}</td>
                        <td style={{ color: getStatColor(row.status_max || "ok") }}>{row.max.toFixed(2)}</td>
                        <td className="text-muted-col">{row.count} rows</td>
                      </tr>
                    ))}
                    */}
                    {paginatedRows.map((row, idx) => (
                      <tr key={`raw-row-${idx}`}>
                        <td className="text-muted-col">{new Date(row.time).toLocaleString()}</td>
                        <td>{row.source_id}</td>
                        <td style={{ textTransform: "capitalize" }}>{row.metric.replace("_", " ")}</td>
                        {/* Old local threshold logic:
                        <td style={{ fontWeight: 600, color: getStatColor(computeStatus(row.avg, thresholdMap[row.metric])) }}>{row.avg.toFixed(2)}</td>
                        <td style={{ color: getStatColor(computeStatus(row.min, thresholdMap[row.metric])) }}>{row.min.toFixed(2)}</td>
                        <td style={{ color: getStatColor(computeStatus(row.max, thresholdMap[row.metric])) }}>{row.max.toFixed(2)}</td>
                        */}
                        <td style={{ fontWeight: 600, color: getStatColor(row.status) }}>{row.avg.toFixed(2)}</td>
                        <td style={{ color: getStatColor(row.status_min || "ok") }}>{row.min.toFixed(2)}</td>
                        <td style={{ color: getStatColor(row.status_max || "ok") }}>{row.max.toFixed(2)}</td>
                        <td className="text-muted-col">{row.count} rows</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state" style={{ border: "none", borderRadius: 0 }}>
                  <h4>No table records available</h4>
                  <p>Choose filters to populate the data grid.</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div
                className="pagination-container"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.25rem",
                  background: "hsl(var(--bg-card))",
                  borderTop: "1px solid hsl(var(--border-glass))",
                  borderBottomLeftRadius: "6px",
                  borderBottomRightRadius: "6px"
                }}
              >
                <div style={{ color: "hsl(var(--text-secondary))", fontSize: "0.875rem", fontWeight: 500 }}>
                  Showing <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{((currentPage - 1) * rowsPerPage) + 1}</span> to{" "}
                  <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{Math.min(currentPage * rowsPerPage, rawRows ? rawRows.length : 0)}</span> of{" "}
                  <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{rawRows?.length}</span> records
                </div>

                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <button
                    className="btn btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.4rem 0.85rem",
                      border: "1px solid hsl(var(--border-glass))",
                      background: currentPage === 1 ? "transparent" : "hsl(var(--bg-card))",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer"
                    }}
                  >
                    <i className="ri-arrow-left-s-line" style={{ fontSize: "1rem" }}></i> Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) {
                        pageNum = currentPage - 3 + i;
                        if (pageNum + (4 - i) > totalPages) {
                          pageNum = totalPages - 4 + i;
                        }
                      }
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`btn btn-sm ${currentPage === pageNum ? "btn-primary" : ""}`}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          minWidth: "32px",
                          height: "32px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "4px",
                          border: currentPage === pageNum ? "none" : "1px solid hsl(var(--border-glass))",
                          background: currentPage === pageNum ? "hsl(var(--color-primary))" : "hsl(var(--bg-card))",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    className="btn btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.4rem 0.85rem",
                      border: "1px solid hsl(var(--border-glass))",
                      background: currentPage === totalPages ? "transparent" : "hsl(var(--bg-card))",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                    }}
                  >
                    Next <i className="ri-arrow-right-s-line" style={{ fontSize: "1rem" }}></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
