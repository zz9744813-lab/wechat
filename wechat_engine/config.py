from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Anthropic AI
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"
    anthropic_fast_model: str = "claude-haiku-4-5"

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/wechat.db"

    # WeChat
    wechat_app_id: str = ""
    wechat_app_secret: str = ""
    wechat_token: str = ""
    wechat_encoding_aes_key: str = ""

    # News
    news_rss_urls: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # AI Budget
    ai_daily_limit_usd: float = 5.00

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def rss_url_list(self) -> list[str]:
        if not self.news_rss_urls.strip():
            return []
        return [u.strip() for u in self.news_rss_urls.split(",") if u.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
