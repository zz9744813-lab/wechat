"""文章管理 API"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from wechat_engine.database import get_db
from wechat_engine.models import Article, ArticleStatus
from wechat_engine.services.formatter import format_article

router = APIRouter(prefix="/api/articles", tags=["articles"])


class ArticleCreate(BaseModel):
    title: str
    content_md: str = ""
    summary: str = ""
    author: str = ""
    tags: str = ""
    template_name: str = "default"


class ArticleUpdate(BaseModel):
    title: str | None = None
    content_md: str | None = None
    summary: str | None = None
    author: str | None = None
    tags: str | None = None
    template_name: str | None = None
    status: str | None = None


@router.get("")
async def list_articles(
    status: str | None = None,
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(Article).order_by(Article.created_at.desc())
    if status:
        query = query.where(Article.status == status)
    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    articles = result.scalars().all()

    count_q = select(func.count(Article.id))
    if status:
        count_q = count_q.where(Article.status == status)
    total = (await db.execute(count_q)).scalar() or 0

    return {
        "ok": True,
        "data": [_article_to_dict(a) for a in articles],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/{article_id}")
async def get_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(404, "文章不存在")
    return {"ok": True, "data": _article_to_dict(article)}


@router.post("")
async def create_article(body: ArticleCreate, db: AsyncSession = Depends(get_db)):
    content_html = format_article(
        title=body.title,
        content_md=body.content_md,
        author=body.author,
        summary=body.summary,
        template_name=body.template_name,
    )

    article = Article(
        title=body.title,
        content_md=body.content_md,
        content_html=content_html,
        summary=body.summary,
        author=body.author,
        tags=body.tags,
        template_name=body.template_name,
        word_count=len(body.content_md),
        status=ArticleStatus.DRAFT.value,
    )
    db.add(article)
    await db.flush()
    await db.refresh(article)

    return {"ok": True, "data": _article_to_dict(article)}


@router.patch("/{article_id}")
async def update_article(article_id: int, body: ArticleUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(404, "文章不存在")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(article, field, value)

    # 重新渲染 HTML
    article.content_html = format_article(
        title=article.title,
        content_md=article.content_md,
        author=article.author,
        summary=article.summary,
        template_name=article.template_name,
    )
    article.word_count = len(article.content_md)
    article.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(article)
    return {"ok": True, "data": _article_to_dict(article)}


@router.delete("/{article_id}")
async def delete_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(404, "文章不存在")
    await db.delete(article)
    return {"ok": True}


@router.post("/{article_id}/schedule")
async def schedule_article(article_id: int, scheduled_at: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(404, "文章不存在")

    article.scheduled_at = datetime.fromisoformat(scheduled_at)
    article.status = ArticleStatus.SCHEDULED.value
    await db.commit()
    return {"ok": True, "data": _article_to_dict(article)}


def _article_to_dict(a: Article) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "summary": a.summary,
        "content_md": a.content_md,
        "content_html": a.content_html,
        "cover_image_url": a.cover_image_url,
        "author": a.author,
        "status": a.status,
        "template_name": a.template_name,
        "tags": a.tags,
        "word_count": a.word_count,
        "ai_model": a.ai_model,
        "ai_cost_usd": a.ai_cost_usd,
        "published_at": a.published_at.isoformat() if a.published_at else None,
        "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
        "created_at": a.created_at.isoformat(),
        "updated_at": a.updated_at.isoformat(),
    }
