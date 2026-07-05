export interface HealthResponse {
  status: "ok" | "degraded";
  influxdb_connected: boolean;
  timestamp: string;
}

export interface SummaryItem {
  source_id: string;
  metric: string;
  current: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  status: "ok" | "warning" | "critical";
}

export interface TimeseriesItem {
  time: string; // ISO 8601 bucket start
  source_id: string;
  metric: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface LatestItem {
  time: string;
  source_id: string;
  source_type: string;
  metric: string;
  value: number;
  unit: string;
}
