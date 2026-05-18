from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    model_id: str = 'Qwen/Qwen3-0.6B'
    use_fake_trace: bool = True
    preload_model: bool = False
    max_prompt_tokens: int = 48
    max_selected_layers: int = 6
    require_backend_secret: bool = False
    backend_shared_secret: str | None = None


def get_settings() -> Settings:
    return Settings()
