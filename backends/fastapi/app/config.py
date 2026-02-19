from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_connection_url: str
    db_min_connections: int = 2
    db_max_connections: int = 10


settings = Settings()
