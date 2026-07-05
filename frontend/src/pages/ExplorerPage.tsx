import React, { useState, useEffect } from "react";
import { apiGet } from "../api";
import { SummaryItem, TimeseriesItem } from "../types";
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

  // 1. On Mount: Fetch initial sources and metrics from database
  useEffect(() => {
    apiGet<SummaryItem[]>("/api/metrics/summary")
      .then((data) => {
        const uniqueSources = Array.from(new Set(data.map((d) => d.source_id)));
        const uniqueMetrics = Array.from(new Set(data.map((d) => d.metric)));
        setSources(uniqueSources);
        setMetrics(uniqueMetrics);
        
        // Auto-select first source and metric by default to show initial graph
        if (uniqueSources.length > 0) setSelectedSources([uniqueSources[0]]);
        if (uniqueMetrics.length > 0) setSelectedMetrics([uniqueMetrics[0]]);
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

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setSelectedSources(selected);
  };

  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setSelectedMetrics(selected);
  };

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

  // Curated list of color hexes to give lines a distinct, vibrant look in dark mode
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00c49f", "#ffbb28", "#ff8042"];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Metric Explorer</h2>
        <p className="page-subtitle">Analyze metrics aggregations and zoom trends using dynamic parameters</p>
      </div>

      {/* Advanced Query Filter Controls */}
      <div className="filter-bar">
        {/* Source selector */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="source-select">Source Devices</label>
          <select
            id="source-select"
            multiple
            value={selectedSources}
            onChange={handleSourceChange}
            className="input-control select-multi"
            style={{ width: "180px" }}
          >
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Metric selector */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="metric-select">Telemetry Metrics</label>
          <select
            id="metric-select"
            multiple
            value={selectedMetrics}
            onChange={handleMetricChange}
            className="input-control select-multi"
            style={{ width: "180px" }}
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {m.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Time filters */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="exp-start">Start Time</label>
          <input
            id="exp-start"
            type="datetime-local"
            name="start"
            value={timeRange.start}
            onChange={handleTimeChange}
            className="input-control"
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label" htmlFor="exp-end">End Time</label>
          <input
            id="exp-end"
            type="datetime-local"
            name="end"
            value={timeRange.end}
            onChange={handleTimeChange}
            className="input-control"
          />
        </div>

        {/* Bin interval */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="interval-select">Aggregate Bin</label>
          <select
            id="interval-select"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="input-control"
            style={{ height: "38px" }}
          >
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
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
          <div className="table-container" style={{ marginTop: 0 }}>
            <div className="table-header-box">
              <h3 className="table-title">Timeseries Bucket Rows</h3>
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
                    {rawRows.map((row, idx) => (
                      <tr key={`raw-row-${idx}`}>
                        <td className="text-muted-col">{new Date(row.time).toLocaleString()}</td>
                        <td>{row.source_id}</td>
                        <td style={{ textTransform: "capitalize" }}>{row.metric.replace("_", " ")}</td>
                        <td style={{ fontWeight: 600 }}>{row.avg.toFixed(2)}</td>
                        <td>{row.min.toFixed(2)}</td>
                        <td>{row.max.toFixed(2)}</td>
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
          </div>
        </>
      )}
    </div>
  );
}
