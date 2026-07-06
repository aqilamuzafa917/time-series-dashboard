import asyncio
from app import influx
from app.config import get_settings

async def main():
    settings = get_settings()
    try:
        rows = await influx.query_sql("SHOW TABLES", {}, settings)
        print("SHOW TABLES:", rows)
    except Exception as e:
        print("Error SHOW TABLES:", e)
        
    try:
        rows = await influx.query_sql("SELECT table_name FROM information_schema.tables", {}, settings)
        print("information_schema:", rows)
    except Exception as e:
        print("Error info schema:", e)

if __name__ == "__main__":
    asyncio.run(main())
