import httpx
from fastapi import HTTPException

from app.config import Settings


async def ping(settings: Settings) -> bool:
    """GET /health on InfluxDB; return False on any exception."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.influxdb_url}/health",
                headers={"Authorization": f"Token {settings.influxdb_token}"},
                timeout=5.0,
            )
            return response.is_success
    except Exception:
        return False


async def query_sql(sql: str, params: dict, settings: Settings) -> list[dict]:
    """POST /api/v3/query_sql; raise HTTP 503 on network error or non-2xx.

    The request body must include `db` — without it InfluxDB returns an error.
    `params` is passed as a JSON object for parameterized queries ($param syntax).
    `format` is `json` so the response deserializes directly to list[dict].
    """
    body: dict = {
        "db": settings.influxdb_database,
        "q": sql,
        "format": "json",
    }
    # Only include params key when there are actual parameters to send
    if params:
        body["params"] = params

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.influxdb_url}/api/v3/query_sql",
                headers={
                    "Authorization": f"Token {settings.influxdb_token}",
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=30.0,
            )
    except httpx.RequestError as e:
        print(f"DEBUG: InfluxDB query_sql RequestError: {e}")
        raise HTTPException(status_code=503, detail="InfluxDB unavailable")

    if not response.is_success:
        error_text = response.text
        print(f"DEBUG: InfluxDB query_sql non-2xx response: {response.status_code} {error_text}")
        raise HTTPException(status_code=503, detail=f"InfluxDB error: {error_text}")

    return response.json()



async def write_lp(lp: str, settings: Settings) -> None:
    """POST /api/v3/write_lp; raise HTTP 503 on non-2xx."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.influxdb_url}/api/v3/write_lp",
                params={"db": settings.influxdb_database},
                headers={
                    "Authorization": f"Token {settings.influxdb_token}",
                    "Content-Type": "text/plain; charset=utf-8",
                },
                content=lp.encode("utf-8"),
                timeout=30.0,
            )
    except httpx.RequestError as e:
        print(f"DEBUG: InfluxDB write_lp RequestError: {e}")
        raise HTTPException(status_code=503, detail="InfluxDB unavailable")

    if not response.is_success:
        error_text = response.text
        print(f"DEBUG: InfluxDB write_lp non-2xx response: {response.status_code} {error_text}")
        raise HTTPException(status_code=503, detail=f"InfluxDB error: {error_text}")


async def query_influxql(sql: str, settings: Settings) -> dict:
    """GET /query for InfluxQL queries like SHOW TAG VALUES.
    This bypasses the Parquet file scan limit by using the metadata catalog.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.influxdb_url}/query",
                params={"db": settings.influxdb_database, "q": sql},
                headers={"Authorization": f"Token {settings.influxdb_token}"},
                timeout=10.0,
            )
    except httpx.RequestError as e:
        print(f"DEBUG: InfluxDB query_influxql RequestError: {e}")
        raise HTTPException(status_code=503, detail="InfluxDB unavailable")

    if not response.is_success:
        error_text = response.text
        print(f"DEBUG: InfluxDB query_influxql non-2xx response: {response.status_code} {error_text}")
        raise HTTPException(status_code=503, detail=f"InfluxDB error: {error_text}")

    return response.json()
