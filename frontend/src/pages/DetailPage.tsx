import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { DetailResponse, TimeseriesItem } from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import TimeRangeSelector from "../components/TimeRangeSelector";

export default function DetailPage() {
  const { source_id, metric } = useParams<{ source_id: string; metric: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time controls
  const [preset, setPreset] = useState<"1h" | "6h" | "24h" | "7d" | "custom">("24h");
  const [interval, setInterval] = useState("5m");
  const [timeRange, setTimeRange] = useState(() => {
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
  });

  const applyPreset = (p: "1h" | "6h" | "24h" | "7d") => {
    setPreset(p);
    const now = new Date();
    let ms = 24 * 60 * 60 * 1000;
    if (p === "1h") ms = 60 * 60 * 1000;
    if (p === "6h") ms = 6 * 60 * 60 * 1000;
    if (p === "7d") ms = 7 * 24 * 60 * 60 * 1000;
    
    const start = new Date(now.getTime() - ms);
    const formatLocal = (date: Date) => {
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    };
    
    setTimeRange({
      start: formatLocal(start),
      end: formatLocal(now),
    });
    
    // Auto adjust interval
    if (p === "1h") setInterval("1m");
    if (p === "6h") setInterval("5m");
    if (p === "24h") setInterval("1h");
    if (p === "7d") setInterval("6h");
  };

  useEffect(() => {
    if (!source_id || !metric) return;
    
    setLoading(true);
    setError(null);

    const startISO = new Date(timeRange.start).toISOString();
    const endISO = new Date(timeRange.end).toISOString();

    apiGet<DetailResponse>("/api/metrics/detail", {
      source_id,
      metric,
      start: startISO,
      end: endISO,
      interval
    })
      .then(setData)
      .catch(err => setError(err.message || "Failed to load metric details."))
      .finally(() => setLoading(false));
  }, [source_id, metric, timeRange, interval]);

  const getStatusBadgeClass = (status?: string) => {
    if (status === "critical") return "badge-critical";
    if (status === "warning") return "badge-warning";
    return "badge-ok";
  };

  const chartData = data?.timeseries.map(d => ({
    ...d,
    displayTime: new Date(d.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    value: parseFloat(d.avg?.toFixed(2) || "0")
  })) || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button 
          className="btn" 
          style={{ background: "transparent", border: "1px solid hsl(var(--border-glass))", padding: "0.5rem" }}
          onClick={() => navigate(-1)}
        >
          <i className="ri-arrow-left-line"></i> Back
        </button>
        <div>
          <h2 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "capitalize" }}>
            {metric?.replace("_", " ")}
            {data?.summary && (
              <span className={getStatusBadgeClass(data.summary.status)} style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", borderRadius: "100px", verticalAlign: "middle" }}>
                {data.summary.status.toUpperCase()}
              </span>
            )}
          </h2>
          <p className="page-subtitle">Source: {source_id}</p>
        </div>
      </div>

      <div className="controls-card">
        <div className="filter-group">
          <label className="filter-label">Quick Ranges</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["1h", "6h", "24h", "7d"].map(p => (
              <button 
                key={p} 
                className={`btn ${preset === p ? 'btn-primary' : ''}`}
                style={preset !== p ? { background: "transparent", border: "1px solid hsl(var(--border-glass))", color: "hsl(var(--text-primary))" } : {}}
                onClick={() => applyPreset(p as any)}
              >
                {p}
              </button>
            ))}
            <button 
                className={`btn ${preset === "custom" ? 'btn-primary' : ''}`}
                style={preset !== "custom" ? { background: "transparent", border: "1px solid hsl(var(--border-glass))", color: "hsl(var(--text-primary))" } : {}}
                onClick={() => setPreset("custom")}
              >
                Custom
              </button>
          </div>
        </div>

        {preset === "custom" && (
          <div className="filter-group">
            <TimeRangeSelector 
              start={timeRange.start}
              end={timeRange.end}
              onChange={(start, end) => setTimeRange({ start, end })}
            />
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">Interval</label>
          <select
            className="input-control"
            value={interval}
            onChange={(e) => { setInterval(e.target.value); setPreset("custom"); }}
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
          </select>
        </div>
      </div>

      {error && <div className="error-alert" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        
        {/* Main Chart */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
            <h3 style={{ color: "hsl(var(--text-primary))" }}>Metric Analysis</h3>
            {data?.summary && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.9rem", color: "hsl(var(--text-muted))", marginBottom: "0.25rem" }}>Current Value</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", lineHeight: 1, color: "hsl(var(--text-primary))" }}>
                  {data.summary.current.toFixed(2)} <span style={{ fontSize: "1rem", color: "hsl(var(--text-muted))" }}>{data.timeseries[0]?.unit || ""}</span>
                </div>
              </div>
            )}
          </div>
          
          {loading && !data ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "hsl(var(--text-muted))" }}>Loading detailed data...</div>
          ) : chartData.length > 0 ? (
            <div style={{ height: "400px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A8FE3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1A8FE3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--text-muted))" opacity={0.3} />
                  <XAxis dataKey="displayTime" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--bg-card))", borderColor: "hsl(var(--border-glass))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--text-primary))", fontWeight: "bold" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1A8FE3" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    name={metric?.replace("_", " ") || "Value"}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: "2rem" }}>
              <h4>No data available for this timeframe</h4>
              <p>Try selecting a larger time range or a different interval.</p>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {data?.summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="card">
              <div className="stat-label">Minimum Value</div>
              <div className="stat-val" style={{ fontSize: "1.5rem" }}>{data.summary.min?.toFixed(2) || "N/A"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Average Value</div>
              <div className="stat-val" style={{ fontSize: "1.5rem" }}>{data.summary.avg?.toFixed(2) || "N/A"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Maximum Value</div>
              <div className="stat-val" style={{ fontSize: "1.5rem" }}>{data.summary.max?.toFixed(2) || "N/A"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Data Points Count</div>
              <div className="stat-val" style={{ fontSize: "1.5rem" }}>{data.summary.count || 0}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
