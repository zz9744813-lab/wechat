"""AI 写作 API"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from wechat_engine.database import get_db
from wechat_engine.models import Article, ArticleStatus, AICostLog, NewsItem
from wechat_engine.services.ai_writer import write_article, rewrite_article, summarize_news
from wechat_engine.services.formatter import format_article
from wechat_engine.config import get_settings

router = APIRouter(prefix="/api/ai", tags=["ai"])
settings = get_settings()


class WriteRequest(BaseModel):
    topic: str
    news_ids: list[int] = []
    style: str = "informative"
    target_words: int = 2000
    template_name: str = "default"


class RewriteRequest(BaseModel):
    article_id: int
    instruction: str


class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 200


@router.post("/write")
async def ai_write(body: WriteRequest, db: AsyncSession = Depends(get_db)):
    # 检查预算
    cost_today = await _get_today_cost(db)
    if cost_today >= settings.ai_daily_limit_usd:
        raise HTTPException(429, f"今日 AI 预算已用完 (${cost_today:.2f} / ${settings.ai_daily_limit_usd})")

    # 收集新闻素材
    news_context = ""
    if body.news_ids:
        result = await db.execute(
            select(NewsItem).where(NewsItem.id.in_(body.news_ids))
        )
        news_items = result.scalars().all()
        news_context = "\n\n".join(
            f"### {n.title}\n{n.summary or n.content or ''}\n来源: {n.link}"
            for n in news_items
        )

    # AI 写作
    result = await write_article(
        topic=body.topic,
        news_context=news_context,
        style=body.style,
        target_words=body.target_words,
    )

    if "error" in result:
        raise HTTPException(500, result["error"])

    # 保存文章
    content_html = format_article(
        title=result["title"],
        content_md=result["content_md"],
        summary=result.get("summary", ""),
        template_name=body.template_name,
    )

    article = Article(
        title=result["title"],
        summary=result.get("summary", ""),
        content_md=result["content_md"],
        content_html=content_html,
        tags=",".join(result.get("tags", [])),
        word_count=len(result["content_md"]),
        ai_model=result.get("model", ""),
        ai_cost_usd=result.get("cost_usd", 0),
        source_news_ids=str(body.news_ids),
        status=ArticleStatus.AI_WRITTEN.value,
    )
    db.add(article)
    await db.flush()

    # 记录成本
    cost_log = AICostLog(
        operation="write",
        model=result.get("model", ""),
        input_tokens=result.get("input_tokens", 0),
        output_tokens=result.get("output_tokens", 0),
        cost_usd=result.get("cost_usd", 0),
        article_id=article.id,
    )
    db.add(cost_log)
    await db.commit()
    await db.refresh(article)

    return {"ok": True, "data": {"article_id": article.id, "title": article.title, "cost_usd": article.ai_cost_usd}}


@router.post("/rewrite")
async def ai_rewrite(body: RewriteRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == body.article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(404, "文章不存在")

    rewrite_result = await rewrite_article(article.content_md, body.instruction)

    if "error" in rewrite_result:
        raise HTTPException(500, rewrite_result["error"])

    article.content_md = rewrite_result["content_md"]
    article.content_html = format_article(
        title=article.title,
        content_md=article.content_md,
        author=article.author,
        summary=article.summary,
        template_name=article.template_name,
    )
    article.word_count = len(article.content_md)
    article.status = ArticleStatus.AI_WRITTEN.value

    cost_log = AICostLog(
        operation="rewrite",
        model=settings.anthropic_model,
        cost_usd=rewrite_result.get("cost_usd", 0),
        article_id=article.id,
    )
    db.add(cost_log)
    await db.commit()

    return {"ok": True, "data": {"article_id": article.id, "cost_usd": rewrite_result.get("cost_usd", 0)}}


@router.post("/summarize")
async def ai_summarize(body: SummarizeRequest, db: AsyncSession = Depends(get_db)):
    result = await summarize_news(body.text, body.max_length)
    return {"ok": True, "data": result}


async def _get_today_cost(db: AsyncSession) -> float:
    today = __import__("datetime").date.today()
    result = await db.execute(
        select(func.coalesce(func.sum(AICostLog.cost_usd), 0)).where(
            func.date(AICostLog.created_at) == today
        )
    )
    return float(result.scalar() or 0)
