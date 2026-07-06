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
import TimeRangeSelector from "../components/TimeRangeSelector";

const MultiSelectChecklist = ({
  options,
  selected,
  onChange,
  label
}: {
  options: string[];
  selected: string[];
  onChange: (val: string) => void;
  label: string;
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
    <div className="multi-select-container" ref={containerRef} style={{ position: 'relative', width: '220px' }}>
      <div 
        className="input-control" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length === 0 ? `All ${label}s` : `${selected.length} selected`}
        </span>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line`}></i>
      </div>
      
      {isOpen && (
        <div 
          style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, 
            background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-glass))', 
            borderRadius: '4px', marginTop: '4px', maxHeight: '250px', overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(16,24,40,0.1)'
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
                  style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))' }}>
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

export default function HistoryPage() {
  const [sources, setSources] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);

  // Default time range: Last 7 days for history
  const getInitialTimeRange = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatLocal = (date: Date) => {
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    };
    return {
      start: formatLocal(sevenDaysAgo),
      end: formatLocal(now),
    };
  };

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState(getInitialTimeRange());
  const [interval, setInterval] = useState("1d");

  const [rawRows, setRawRows] = useState<TimeseriesItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{sources: string[], metrics: string[]}>("/api/metrics/list")
      .then((data) => {
        setSources(data.sources);
        setMetrics(data.metrics);
        
        if (data.sources.length > 0) setSelectedSources([data.sources[0]]);
        if (data.metrics.length > 0) setSelectedMetrics([data.metrics[0]]);
      })
      .catch((err) => {
        console.error("Failed to load metadata dropdowns:", err);
      });
  }, []);

  useEffect(() => {
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
        setError(err.message || "Failed to load historical query results.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedSources, selectedMetrics, timeRange, interval]);

  const reshapeData = (rows: TimeseriesItem[]) => {
    const timeMap: Record<string, any> = {};
    const seriesKeys = new Set<string>();

    rows.forEach((row) => {
      const key = `${row.source_id} - ${row.metric}`;
      seriesKeys.add(key);

      if (!timeMap[row.time]) {
        timeMap[row.time] = {
          time: row.time,
          displayTime: new Date(row.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
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
    setSelectedSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
  };

  const toggleMetric = (met: string) => {
    setSelectedMetrics(prev => prev.includes(met) ? prev.filter(m => m !== met) : [...prev, met]);
  };

  const COLORS = ["#1A8FE3", "#F5A623", "#2FBF9F", "#6FCF97", "#D6249F", "#8884d8", "#FF8042"];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 className="page-title">Historical Data Analysis</h2>
        <p className="page-subtitle">Analyze long-term trends across multiple sources.</p>
      </div>

      <div className="controls-card">
        <div className="filter-group">
          <label className="filter-label">Source Devices</label>
          <MultiSelectChecklist options={sources} selected={selectedSources} onChange={toggleSource} label="Source" />
        </div>

        <div className="filter-group">
          <label className="filter-label">Telemetry Metrics</label>
          <MultiSelectChecklist options={metrics} selected={selectedMetrics} onChange={toggleMetric} label="Metric" />
        </div>

        <div className="filter-group" style={{ flexGrow: 1 }}>
          <TimeRangeSelector 
            start={timeRange.start}
            end={timeRange.end}
            onChange={(start, end) => setTimeRange({ start, end })}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Aggregate Interval</label>
          <select
            className="input-control"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          >
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="12h">12 Hours</option>
            <option value="1d">1 Day</option>
            <option value="7d">7 Days</option>
          </select>
        </div>
      </div>

      {error && <div className="error-alert" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1.5rem", color: "hsl(var(--text-primary))" }}>Historical Trend Chart</h3>
        {loading && !rawRows ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "hsl(var(--text-muted))" }}>Loading historical data...</div>
        ) : chartData.length > 0 ? (
          <div style={{ height: "400px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--text-muted))" opacity={0.3} />
                <XAxis dataKey="displayTime" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} />
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
            <h4>No historical data loaded</h4>
            <p>Please select at least one source and metric above to display the chart.</p>
          </div>
        )}
      </div>

      <div className="table-container" style={{ marginTop: 0 }}>
        <div className="table-header-box">
          <h3 className="table-title">Historical Aggregates</h3>
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
                  <tr key={`hist-row-${idx}`}>
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
              <h4>No data to display</h4>
              <p>Adjust your filters or time range above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
