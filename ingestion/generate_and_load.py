import os
import sys
import random
import time
from datetime import datetime, timedelta, timezone
import httpx
from dotenv import load_dotenv

# Load environment variables from .env file (check current directory first, then parent)
load_dotenv()
load_dotenv("../.env")

INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8181")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN")
INFLUXDB_DATABASE = os.getenv("INFLUXDB_DATABASE", "monitoring")

# Fallback for host.docker.internal if running on host where it cannot be resolved
if "host.docker.internal" in INFLUXDB_URL:
    import socket
    try:
        socket.gethostbyname("host.docker.internal")
    except socket.gaierror:
        INFLUXDB_URL = INFLUXDB_URL.replace("host.docker.internal", "localhost")

print(f"DEBUG: INFLUXDB_URL={INFLUXDB_URL}")
print(f"DEBUG: INFLUXDB_DATABASE={INFLUXDB_DATABASE}")
print(f"DEBUG: INFLUXDB_TOKEN={INFLUXDB_TOKEN[:10] if INFLUXDB_TOKEN else 'None'}...")



if not INFLUXDB_TOKEN:
    print("Error: INFLUXDB_TOKEN is not set in environment or .env file.", file=sys.stderr)
    sys.exit(1)

# Definition of sources according to design.md
SOURCES = [
    {"id": "server-01", "type": "server"},
    {"id": "server-02", "type": "server"},
    {"id": "sensor-01", "type": "sensor"},
]

# Definition of metrics with baselines and noise factors according to design.md
METRICS = {
    "cpu_usage": {"unit": "percent", "baseline": 40.0, "noise": 5.0},
    "memory_usage": {"unit": "percent", "baseline": 55.0, "noise": 4.0},
    "temperature": {"unit": "celsius", "baseline": 45.0, "noise": 3.0},
    "disk_io": {"unit": "MB/s", "baseline": 120.0, "noise": 15.0},
}

def generate_data():
    """Generate 48 hours of 1-minute interval data for all sources and metrics."""
    data_points = []
    total_minutes = 48 * 60
    # Use Jakarta timezone (UTC+7)
    jakarta_tz = timezone(timedelta(hours=7))
    end_time = datetime.now(jakarta_tz).replace(second=0, microsecond=0)
    start_time = end_time - timedelta(minutes=total_minutes)

    print(f"Generating time-series data from {start_time.isoformat()} to {end_time.isoformat()}...")


    for m in range(total_minutes):
        timestamp = start_time + timedelta(minutes=m)
        timestamp_ns = int(timestamp.timestamp() * 1e9)
        hour_offset = m / 60.0

        for src in SOURCES:
            for metric, cfg in METRICS.items():
                baseline = cfg["baseline"]
                noise_std = cfg["noise"]
                unit = cfg["unit"]

                # Generate base value using Gaussian distribution (baseline + random deviation)
                value = random.gauss(baseline, noise_std)
                if value < 0:
                    value = 0.0

                # Inject deliberate spikes at hours 12, 24, and 36
                # SPIKE DURATION: 10 minutes at the start of hours 12, 24, and 36
                is_spike_hour = any(abs(hour_offset - h) < (10 / 60.0) for h in [12.0, 24.0, 36.0])
                if is_spike_hour:
                    if src["id"] == "server-01" and metric == "cpu_usage":
                        value = 97.0
                    elif src["id"] == "sensor-01" and metric == "temperature":
                        value = 88.0

                # Format as InfluxDB Line Protocol:
                # device_metrics,source_id=<sid>,source_type=<stype>,metric=<metric> value=<val>,unit="<unit>" <timestamp_ns>
                lp_line = f'device_metrics,source_id={src["id"]},source_type={src["type"]},metric={metric} value={value:.2f},unit="{unit}" {timestamp_ns}'
                data_points.append(lp_line)

    return data_points

def write_batch(client, lp_data):
    """Write a batch of line protocol lines to InfluxDB 3 Core."""
    url = f"{INFLUXDB_URL}/api/v3/write_lp"
    params = {"db": INFLUXDB_DATABASE}
    headers = {
        "Authorization": f"Token {INFLUXDB_TOKEN}",
        "Content-Type": "text/plain; charset=utf-8",
    }
    
    response = client.post(
        url,
        params=params,
        headers=headers,
        content=lp_data.encode("utf-8"),
        timeout=30.0,
    )
    if not response.is_success:
        print(f"Error: InfluxDB write endpoint returned non-2xx status code: {response.status_code}", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)

def write_log(client, records_ingested, records_rejected=0, error_message=""):
    """Write an ingestion event to ingestion_log table."""
    url = f"{INFLUXDB_URL}/api/v3/write_lp"
    params = {"db": INFLUXDB_DATABASE}
    headers = {
        "Authorization": f"Token {INFLUXDB_TOKEN}",
        "Content-Type": "text/plain; charset=utf-8",
    }
    
    timestamp_ns = int(time.time() * 1e9)
    err_field = f',error_message="{error_message}"' if error_message else ""
    lp_line = f'ingestion_log,source_id=generator,method=generator records_ingested={records_ingested}i,records_rejected={records_rejected}i{err_field} {timestamp_ns}'
    
    response = client.post(
        url,
        params=params,
        headers=headers,
        content=lp_line.encode("utf-8"),
        timeout=30.0,
    )
    if not response.is_success:
        print(f"Warning: Failed to write ingestion log: {response.status_code} {response.text}", file=sys.stderr)

def main():
    points = generate_data()
    total_points = len(points)
    print(f"Successfully generated {total_points} total rows.")

    batch_size = 500
    batches = [points[i:i + batch_size] for i in range(0, total_points, batch_size)]

    print(f"Writing data to InfluxDB database '{INFLUXDB_DATABASE}' in {len(batches)} batches of {batch_size}...")
    
    with httpx.Client() as client:
        for idx, batch in enumerate(batches):
            lp_batch = "\n".join(batch)
            write_batch(client, lp_batch)
            write_log(client, records_ingested=len(batch), records_rejected=0)
            
            if (idx + 1) % 10 == 0 or idx == len(batches) - 1:
                uploaded = min((idx + 1) * batch_size, total_points)
                print(f"Uploaded batch {idx + 1}/{len(batches)} ({uploaded}/{total_points} rows)")

    print("Data generator process finished successfully!")

if __name__ == "__main__":
    main()
