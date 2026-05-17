from datetime import datetime
from sqlalchemy import String, Text, Float, Boolean, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from wechat_engine.database import Base
import enum


class ArticleStatus(str, enum.Enum):
    DRAFT = "draft"
    AI_WRITTEN = "ai_written"
    REVIEWED = "reviewed"
    PUBLISHED = "published"
    SCHEDULED = "scheduled"
    FAILED = "failed"


class NewsSourceStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_md: Mapped[str] = mapped_column(Text, default="")
    content_html: Mapped[str] = mapped_column(Text, default="")
    cover_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    author: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(
        SAEnum(ArticleStatus, values_callable=lambda x: [e.value for e in x]),
        default=ArticleStatus.DRAFT.value,
    )
    template_name: Mapped[str] = mapped_column(String(100), default="default")
    tags: Mapped[str] = mapped_column(String(500), default="")  # comma-separated
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    ai_model: Mapped[str] = mapped_column(String(100), default="")
    ai_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    source_news_ids: Mapped[str] = mapped_column(Text, default="")  # JSON array of news IDs
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    wechat_media_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NewsItem(Base):
    __tablename__ = "news_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_url: Mapped[str] = mapped_column(String(1000))
    source_name: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(500))
    link: Mapped[str] = mapped_column(String(1000))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    used_in_article: Mapped[bool] = mapped_column(Boolean, default=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)  # AI 评分 0-10
    category: Mapped[str] = mapped_column(String(100), default="general")


class NewsSource(Base):
    __tablename__ = "news_sources"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(1000), unique=True)
    source_type: Mapped[str] = mapped_column(String(50), default="rss")  # rss / api / scrape
    status: Mapped[str] = mapped_column(
        SAEnum(NewsSourceStatus, values_callable=lambda x: [e.value for e in x]),
        default=NewsSourceStatus.ACTIVE.value,
    )
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fetch_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PublishLog(Base):
    __tablename__ = "publish_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id"))
    action: Mapped[str] = mapped_column(String(50))  # upload / publish / schedule
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    response_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AICostLog(Base):
    __tablename__ = "ai_cost_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    operation: Mapped[str] = mapped_column(String(100))  # write / rewrite / summarize / score
    model: Mapped[str] = mapped_column(String(100))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    article_id: Mapped[int | None] = mapped_column(ForeignKey("articles.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
