"""新闻管理 API"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from wechat_engine.database import get_db
from wechat_engine.models import NewsItem, NewsSource, NewsSourceStatus
from wechat_engine.services.news_collector import collect_all_news, fetch_rss

router = APIRouter(prefix="/api/news", tags=["news"])


class SourceCreate(BaseModel):
    name: str
    url: str
    source_type: str = "rss"
    fetch_interval_minutes: int = 60


@router.get("/items")
async def list_news(
    category: str | None = None,
    used: bool | None = None,
    min_score: float = 0,
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(NewsItem).order_by(NewsItem.collected_at.desc())
    if category:
        query = query.where(NewsItem.category == category)
    if used is not None:
        query = query.where(NewsItem.used_in_article == used)
    if min_score > 0:
        query = query.where(NewsItem.relevance_score >= min_score)

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "ok": True,
        "data": [_news_to_dict(n) for n in items],
    }


@router.post("/collect")
async def trigger_collect(db: AsyncSession = Depends(get_db)):
    """手动触发新闻采集"""
    news = await collect_all_news(db)
    return {"ok": True, "data": {"collected": len(news)}}


@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NewsSource).order_by(NewsSource.created_at.desc()))
    sources = result.scalars().all()
    return {"ok": True, "data": [_source_to_dict(s) for s in sources]}


@router.post("/sources")
async def create_source(body: SourceCreate, db: AsyncSession = Depends(get_db)):
    # 验证 URL 有效
    try:
        items = await fetch_rss(body.url)
        if items and items[0].get("error"):
            raise HTTPException(400, f"RSS 解析失败: {items[0]['error']}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"URL 验证失败: {e}")

    source = NewsSource(
        name=body.name,
        url=body.url,
        source_type=body.source_type,
        fetch_interval_minutes=body.fetch_interval_minutes,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return {"ok": True, "data": _source_to_dict(source)}


@router.delete("/sources/{source_id}")
async def delete_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NewsSource).where(NewsSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "源不存在")
    await db.delete(source)
    return {"ok": True}


def _news_to_dict(n: NewsItem) -> dict:
    return {
        "id": n.id,
        "source_name": n.source_name,
        "title": n.title,
        "link": n.link,
        "summary": n.summary,
        "category": n.category,
        "relevance_score": n.relevance_score,
        "used_in_article": n.used_in_article,
        "published_at": n.published_at.isoformat() if n.published_at else None,
        "collected_at": n.collected_at.isoformat(),
    }


def _source_to_dict(s: NewsSource) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "url": s.url,
        "source_type": s.source_type,
        "status": s.status,
        "fetch_interval_minutes": s.fetch_interval_minutes,
        "last_fetched_at": s.last_fetched_at.isoformat() if s.last_fetched_at else None,
        "created_at": s.created_at.isoformat(),
    }
