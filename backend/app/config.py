from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # str_strip_whitespace: valores colados no painel da hospedagem costumam vir com espaço ou
    # quebra de linha no fim, o que invalida chaves de API.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", str_strip_whitespace=True)

    database_url: str = "sqlite:///./dev.db"
    cors_origins: str = "http://localhost:5173"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash,gemini-3.1-flash-lite,gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash-lite"
    youtube_api_key: str = ""


settings = Settings()
