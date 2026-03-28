from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    database_url: str
    db_min_connections: int = 2
    db_max_connections: int = 10
    session_expire_days: int = 30


_settings = None


def get_settings(reload: bool = False) -> Settings:
    """Return application settings singleton.

    Set `reload` to `True` to force a new Settings object creation,
    which reads from current environment variables.
    """
    global _settings  # noqa: PLW0603
    if reload or _settings is None:
        # Ignore missing argument lint error.
        # Settings SHOULD load from the environment.
        # If you got an error from here, check .env settings.
        _settings = Settings()  # ty:ignore[missing-argument]
    return _settings


SettingsDep = Annotated[Settings, Depends(get_settings)]
