from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_connection_url: str
    db_min_connections: int = 2
    db_max_connections: int = 10


settings = Settings()  # ty:ignore[missing-argument]
# NOTE We expect this to load from environment variables
# If it fails because of a missing required value,
# update the environment associated with this app.
