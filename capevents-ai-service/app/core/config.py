from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    app_name: str = "CapEvents AI Service"
    app_env: str = "dev"
    app_host: str = "127.0.0.1"
    app_port: int = 8001

    # Security
    ai_service_key: str

    # Database
    database_url: str

    # Ollama / LLM
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:0.6b"

    # Recommendation
    recommendation_model_task: str = "recommendation"

    # Planning LLM
    planning_llm_enabled: bool = True
    planning_llm_provider: str = "ollama"
    planning_llm_base_url: str = "http://127.0.0.1:11434"
    planning_llm_model: str = "qwen2.5:3b"
    planning_llm_timeout_seconds: int = 180

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()