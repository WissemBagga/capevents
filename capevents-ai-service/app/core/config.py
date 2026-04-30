from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CapEvents AI Service"
    app_env: str = "dev"
    app_host: str = "127.0.0.1"
    app_port: int = 8001

    database_url: str
    ai_service_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()