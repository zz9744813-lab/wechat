"""系统健康 + 仪表盘 API"""

from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from wechat_engine.database import get_db
from wechat_engine.models import Article, NewsItem, NewsSource, AICostLog, ArticleStatus
from wechat_engine.config import get_settings

router = APIRouter(prefix="/api", tags=["system"])
settings = get_settings()


@router.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db)):
    # 文章统计
    total_articles = (await db.execute(select(func.count(Article.id)))).scalar() or 0
    published = (await db.execute(
        select(func.count(Article.id)).where(Article.status == ArticleStatus.PUBLISHED.value)
    )).scalar() or 0
    drafts = (await db.execute(
        select(func.count(Article.id)).where(Article.status == ArticleStatus.DRAFT.value)
    )).scalar() or 0
    scheduled = (await db.execute(
        select(func.count(Article.id)).where(Article.status == ArticleStatus.SCHEDULED.value)
    )).scalar() or 0

    # 新闻统计
    total_news = (await db.execute(select(func.count(NewsItem.id)))).scalar() or 0
    unused_news = (await db.execute(
        select(func.count(NewsItem.id)).where(NewsItem.used_in_article == False)  # noqa: E712
    )).scalar() or 0
    sources_count = (await db.execute(
        select(func.count(NewsSource.id)).where(NewsSource.status == NewsSourceStatus.ACTIVE.value)
    )).scalar() or 0

    # 今日 AI 成本
    today = date.today()
    today_cost = (await db.execute(
        select(func.coalesce(func.sum(AICostLog.cost_usd), 0)).where(
            func.date(AICostLog.created_at) == today
        )
    )).scalar() or 0

    # 最近文章
    recent = await db.execute(
        select(Article).order_by(Article.created_at.desc()).limit(5)
    )
    recent_articles = [
        {"id": a.id, "title": a.title, "status": a.status, "created_at": a.created_at.isoformat()}
        for a in recent.scalars()
    ]

    return {
        "ok": True,
        "data": {
            "articles": {"total": total_articles, "published": published, "drafts": drafts, "scheduled": scheduled},
            "news": {"total": total_news, "unused": unused_news, "active_sources": sources_count},
            "ai": {"today_cost_usd": round(float(today_cost), 4), "daily_limit_usd": settings.ai_daily_limit_usd},
            "recent_articles": recent_articles,
        },
    }
