"""定时任务调度服务"""

import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from wechat_engine.database import async_session
from wechat_engine.services.news_collector import collect_all_news

scheduler = AsyncIOScheduler()


async def scheduled_collect_news():
    """定时采集新闻"""
    async with async_session() as db:
        news = await collect_all_news(db)
        print(f"[{datetime.now().isoformat()}] 采集到 {len(news)} 条新闻")


async def scheduled_publish():
    """定时发布待发布文章"""
    from sqlalchemy import select
    from wechat_engine.models import Article, ArticleStatus
    from wechat_engine.services.sender import publish_article

    async with async_session() as db:
        result = await db.execute(
            select(Article).where(
                Article.status == ArticleStatus.SCHEDULED.value,
                Article.scheduled_at <= datetime.utcnow(),
            )
        )
        articles = result.scalars().all()

        for article in articles:
            result = await publish_article(db, article.id)
            print(f"[{datetime.now().isoformat()}] 发布文章 #{article.id}: {result}")


def setup_scheduler():
    """配置定时任务"""
    # 每小时采集新闻
    scheduler.add_job(
        scheduled_collect_news,
        CronTrigger(minute=0),
        id="collect_news",
        replace_existing=True,
    )

    # 每 5 分钟检查待发布文章
    scheduler.add_job(
        scheduled_publish,
        CronTrigger(minute="*/5"),
        id="publish_scheduled",
        replace_existing=True,
    )

    scheduler.start()
    return scheduler


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
