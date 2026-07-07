from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    influxdb_url: str
    influxdb_token: str
    influxdb_database: str
    influxdb_measurement: str

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
