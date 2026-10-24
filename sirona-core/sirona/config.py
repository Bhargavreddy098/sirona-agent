import os
from pathlib import Path
from typing import Any, Dict, Optional
import yaml
from pydantic import BaseModel, Field

DEFAULT_SIRONA_HOME = Path.home() / ".sirona"

class DatabaseConfig(BaseModel):
    path: str = Field(default=str(DEFAULT_SIRONA_HOME / "sirona.db"))
    journal_mode: str = Field(default="wal")
    synchronous: str = Field(default="NORMAL")

class ModelConfig(BaseModel):
    default: str = Field(default="gemini-2.5-flash")
    provider: str = Field(default="gemini")
    reasoning_effort: str = Field(default="medium")

class ServerConfig(BaseModel):
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000)
    api_key: Optional[str] = Field(default=None)

class SironaConfig(BaseModel):
    sirona_home: str = Field(default=str(DEFAULT_SIRONA_HOME))
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    model: ModelConfig = Field(default_factory=ModelConfig)
    server: ServerConfig = Field(default_factory=ServerConfig)

def load_config(config_path: Optional[str] = None) -> SironaConfig:
    if config_path is None:
        env_home = os.getenv("SIRONA_HOME")
        home = Path(env_home) if env_home else DEFAULT_SIRONA_HOME
        config_file = home / "config.yaml"
    else:
        config_file = Path(config_path)

    if config_file.exists():
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            return SironaConfig(**data)
        except Exception:
            return SironaConfig()
    return SironaConfig()
