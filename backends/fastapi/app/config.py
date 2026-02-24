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

    db_connection_url: str
    db_min_connections: int = 2
    db_max_connections: int = 10


_settings = None


def get_settings(reload: bool = False, **kwargs) -> Settings:
    """Return application settings singleton.

    Set `reload` to `True` to force a new Settings object creation,
    which reads from current environment variables.

    Any additional kwags passed to this function will override those env variables,
    allowing more fine-tuned control.
    """
    global _settings  # noqa: PLW0603
    if reload or _settings is None:
        _settings = Settings(**kwargs)
    return _settings


SettingsDep = Annotated[Settings, Depends(get_settings)]
