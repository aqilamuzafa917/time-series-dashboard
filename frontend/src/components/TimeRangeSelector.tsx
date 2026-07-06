import React, { useState } from "react";

const TIME_PRESETS = [
  { label: "Past 1 minute", value: "1m", ms: 1 * 60 * 1000 },
  { label: "Past 5 minutes", value: "5m", ms: 5 * 60 * 1000 },
  { label: "Past 15 minutes", value: "15m", ms: 15 * 60 * 1000 },
  { label: "Past 1 hour", value: "1h", ms: 60 * 60 * 1000 },
  { label: "Past 3 hours", value: "3h", ms: 3 * 60 * 60 * 1000 },
  { label: "Past 6 hours", value: "6h", ms: 6 * 60 * 60 * 1000 },
  { label: "Past 12 hours", value: "12h", ms: 12 * 60 * 60 * 1000 },
  { label: "Past 24 hours", value: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "Past 2 days", value: "2d", ms: 2 * 24 * 60 * 60 * 1000 },
  { label: "Past 60 days", value: "60d", ms: 60 * 24 * 60 * 60 * 1000 },
  { label: "Past 90 days", value: "90d", ms: 90 * 24 * 60 * 60 * 1000 },
  { label: "Custom Range", value: "custom", ms: 0 },
];

interface TimeRangeSelectorProps {
  timeRange: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
}

export default function TimeRangeSelector({ timeRange, onChange }: TimeRangeSelectorProps) {
  const [preset, setPreset] = useState("24h");

  const formatLocal = (date: Date) => {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPreset(val);
    
    if (val !== "custom") {
      const presetObj = TIME_PRESETS.find(p => p.value === val);
      if (presetObj) {
        const now = new Date();
        const start = new Date(now.getTime() - presetObj.ms);
        onChange({
          start: formatLocal(start),
          end: formatLocal(now),
        });
      }
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({
      ...timeRange,
      [name]: value,
    });
  };

  return (
    <>
      <div className="filter-group">
        <label className="filter-label" htmlFor="preset-select">Time Range</label>
        <select
          id="preset-select"
          value={preset}
          onChange={handlePresetChange}
          className="input-control"
          style={{ width: "200px", cursor: "pointer" }}
        >
          {TIME_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {preset === "custom" && (
        <>
          <div className="filter-group">
            <label className="filter-label" htmlFor="custom-start">Start Time</label>
            <input
              id="custom-start"
              type="datetime-local"
              name="start"
              value={timeRange.start}
              onChange={handleCustomChange}
              className="input-control"
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label" htmlFor="custom-end">End Time</label>
            <input
              id="custom-end"
              type="datetime-local"
              name="end"
              value={timeRange.end}
              onChange={handleCustomChange}
              className="input-control"
            />
          </div>
        </>
      )}
    </>
  );
}
