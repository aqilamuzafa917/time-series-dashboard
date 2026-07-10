export interface HealthResponse {
  status: "ok" | "degraded";
  influxdb_connected: boolean;
  database: string;
  latest_ingested_at: string | null;
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
  unit: string;
  status: "ok" | "warning" | "critical";
  status_avg: "ok" | "warning" | "critical";
  status_min: "ok" | "warning" | "critical";
  status_max: "ok" | "warning" | "critical";
}

export interface TimeseriesItem {
  time: string; // ISO 8601 bucket start
  source_id: string;
  source_type: string;
  metric: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  unit: string;
  status: "ok" | "warning" | "critical";
  status_min?: "ok" | "warning" | "critical";
  status_max?: "ok" | "warning" | "critical";
}

export interface LatestItem {
  time: string;
  source_id: string;
  source_type: string;
  metric: string;
  value: number;
  unit: string;
}

export interface IngestionSummary {
  latest_success_at: string | null;
  last_batch_records: number | null;
  last_batch_source: string | null;
  last_batch_method: string | null;
}

export interface IngestionError {
  time: string;
  source_id: string;
  method: string;
  records_rejected: number;
  error_message: string;
}

export interface SourceItem {
  source_id: string;
  display_name: string;
  source_type: string;
  description: string;
  active: boolean;
  latest_at: string | null;
  record_count: number;
}

export interface ThresholdItem {
  metric: string;
  warning_high: number;
  critical_high: number;
  active: boolean;
}

export interface IngestResult {
  records_ingested: number;
  records_rejected?: number;
  errors?: any[];
  ok?: boolean;
}

export interface IngestionLogItem {
  time: string;
  source_id: string;
  method: string;
  records_ingested: number;
  records_rejected: number | null;
}

export interface DetailResponse {
  summary: SummaryItem | null;
  timeseries: TimeseriesItem[];
}

export interface MetricsList {
  sources: string[];
  metrics: string[];
}
