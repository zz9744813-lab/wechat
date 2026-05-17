"""新闻采集服务 — RSS + 网页抓取"""

import asyncio
from datetime import datetime
from typing import Optional
import feedparser
import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from wechat_engine.models import NewsItem, NewsSource
from wechat_engine.config import get_settings

settings = get_settings()


async def fetch_rss(url: str) -> list[dict]:
    """解析 RSS feed，返回新闻列表"""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()
    except Exception as e:
        return [{"error": str(e), "source_url": url}]

    feed = feedparser.parse(resp.text)
    items = []
    for entry in feed.entries[:20]:  # 每个源最多 20 条
        published = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                published = datetime(*entry.published_parsed[:6])
            except Exception:
                pass

        items.append({
            "source_url": url,
            "source_name": feed.feed.get("title", url),
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "summary": entry.get("summary", ""),
            "content": entry.get("description", entry.get("summary", "")),
            "published_at": published,
        })

    return items


async def scrape_article_content(url: str) -> Optional[str]:
    """抓取网页正文"""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, follow_redirects=True, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # 移除无关元素
        for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()

        # 尝试找正文
        article = soup.find("article") or soup.find("main") or soup.find("div", class_="content")
        if article:
            return article.get_text(separator="\n", strip=True)

        return soup.get_text(separator="\n", strip=True)[:5000]
    except Exception:
        return None


async def collect_all_news(db: AsyncSession) -> list[dict]:
    """从所有活跃源采集新闻"""
    result = await db.execute(
        select(NewsSource).where(NewsSource.status == "active")
    )
    sources = result.scalars().all()

    all_news = []

    # 也可以从配置中的 RSS URL 采集（不在数据库中的源）
    rss_urls = settings.rss_url_list
    db_urls = {s.url for s in sources}
    extra_urls = [u for u in rss_urls if u not in db_urls]

    tasks = []
    for source in sources:
        if source.source_type == "rss":
            tasks.append(fetch_rss(source.url))
    for url in extra_urls:
        tasks.append(fetch_rss(url))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, list):
            all_news.extend(result)

    # 存入数据库
    saved = []
    for item in all_news:
        if item.get("error") or not item.get("title"):
            continue

        # 去重（按 link）
        existing = await db.execute(
            select(NewsItem).where(NewsItem.link == item["link"])
        )
        if existing.scalar_one_or_none():
            continue

        news = NewsItem(**item)
        db.add(news)
        saved.append(item)

    await db.commit()

    # 更新源的最后抓取时间
    for source in sources:
        source.last_fetched_at = datetime.utcnow()
    await db.commit()

    return saved


async def get_news_for_article(db: AsyncSession, category: str = "", limit: int = 10) -> list[NewsItem]:
    """获取可用于写文章的新闻素材"""
    query = select(NewsItem).where(NewsItem.used_in_article == False)  # noqa: E712
    if category:
        query = query.where(NewsItem.category == category)
    query = query.order_by(NewsItem.relevance_score.desc(), NewsItem.collected_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
