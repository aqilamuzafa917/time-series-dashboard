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

export default function ReportPage() {
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

  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [timeRange, setTimeRange] = useState(getInitialTimeRange());
  const [interval, setInterval] = useState("1h");

  const [rawRows, setRawRows] = useState<TimeseriesItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    apiGet<{sources: string[], metrics: string[]}>("/api/metrics/list")
      .then((data) => {
        setSources(data.sources);
        setMetrics(data.metrics);
        
        if (data.sources.length > 0) setSelectedSource(data.sources[0]);
        if (data.metrics.length > 0) setSelectedMetric(data.metrics[0]);
      })
      .catch((err) => console.error("Failed to load metadata dropdowns:", err));
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedSource || !selectedMetric) return;

    setLoading(true);
    setError(null);
    setReportGenerated(false);

    try {
      const startISO = new Date(timeRange.start).toISOString();
      const endISO = new Date(timeRange.end).toISOString();

      const data = await apiGet<TimeseriesItem[]>("/api/metrics/timeseries", {
        start: startISO,
        end: endISO,
        interval,
        source_id: selectedSource,
        metric: selectedMetric,
      });
      setRawRows(data);
      setReportGenerated(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!rawRows || rawRows.length === 0) return;

    const headers = ["Time", "Source ID", "Metric", "Avg Value", "Min Value", "Max Value", "Count", "Unit", "Status"];
    const csvContent = [
      headers.join(","),
      ...rawRows.map(row => 
        [row.time, row.source_id, row.metric, row.avg, row.min, row.max, row.count, row.unit || "", row.status || ""].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report-${selectedSource}-${selectedMetric}-${timeRange.start}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = rawRows?.map(r => ({
    time: r.time,
    displayTime: new Date(r.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    value: parseFloat(r.avg.toFixed(2))
  })) || [];

  return (
    <div className="report-page">
      <style>
        {`
          @media print {
            .sidebar, .filter-controls, .action-buttons, .page-title, .page-subtitle {
              display: none !important;
            }
            .app-container {
              display: block !important;
            }
            .main-content {
              padding: 0 !important;
              margin: 0 !important;
            }
            .report-header-print {
              display: block !important;
              text-align: center;
              margin-bottom: 2rem;
            }
            .card {
              border: 1px solid #ccc !important;
              box-shadow: none !important;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="report-header-print" style={{ display: "none" }}>
        <h1>Telemetry Report</h1>
        <h3>{selectedSource} - {selectedMetric.replace("_", " ")}</h3>
        <p>{new Date(timeRange.start).toLocaleString()} to {new Date(timeRange.end).toLocaleString()}</p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2 className="page-title">Report Builder</h2>
        <p className="page-subtitle">Generate exportable and printable reports.</p>
      </div>

      <div className="card filter-controls" style={{ marginBottom: "2rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
        <div className="filter-group">
          <label className="filter-label">Source</label>
          <select className="input-control" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Metric</label>
          <select className="input-control" value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
            {metrics.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="filter-group" style={{ gridColumn: "1 / -1" }}>
          <TimeRangeSelector start={timeRange.start} end={timeRange.end} onChange={(start, end) => setTimeRange({ start, end })} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Interval</label>
          <select className="input-control" value={interval} onChange={e => setInterval(e.target.value)}>
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="1d">1 Day</option>
          </select>
        </div>
        <div className="filter-group" style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleGenerateReport} disabled={loading || !selectedSource || !selectedMetric}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {error && <div className="error-alert filter-controls" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      {reportGenerated && rawRows && (
        <div className="report-content">
          <div className="action-buttons filter-controls" style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginBottom: "1.5rem" }}>
            <button className="btn" style={{ background: "transparent", border: "1px solid hsl(var(--border-glass))" }} onClick={handlePrint}>
              <i className="ri-printer-line"></i> Print PDF
            </button>
            <button className="btn btn-primary" onClick={handleExportCSV}>
              <i className="ri-file-excel-2-line"></i> Export CSV
            </button>
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: "2rem", height: "400px" }}>
            <h3 style={{ marginBottom: "1rem" }}>Trend Overview</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--text-muted))" opacity={0.3} />
                  <XAxis dataKey="displayTime" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" name={selectedMetric.replace("_", " ")} stroke="#1A8FE3" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No chart data available for the selected range.</div>
            )}
          </div>

          {/* Table */}
          <div className="table-container" style={{ marginTop: 0 }}>
            <div className="table-header-box">
              <h3 className="table-title">Data Points</h3>
            </div>
            <div className="table-wrapper">
              {rawRows.length > 0 ? (
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th>Time Bucket</th>
                      <th>Avg Value</th>
                      <th>Min Value</th>
                      <th>Max Value</th>
                      <th>Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.map((row, idx) => (
                      <tr key={`rpt-row-${idx}`}>
                        <td className="text-muted-col">{new Date(row.time).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{row.avg.toFixed(2)}</td>
                        <td>{row.min.toFixed(2)}</td>
                        <td>{row.max.toFixed(2)}</td>
                        <td className="text-muted-col">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state" style={{ border: "none", borderRadius: 0 }}>No data to display.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
