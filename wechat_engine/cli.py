"""CLI 入口"""

import click
import uvicorn
from rich.console import Console
from rich.table import Table

console = Console()


@click.group()
def main():
    """微信公众号内容引擎 — AI 写作 + 新闻采集 + 模板排版 + 定时发布"""
    pass


@main.command()
@click.option("--host", default="0.0.0.0", help="监听地址")
@click.option("--port", default=8000, type=int, help="监听端口")
@click.option("--reload", is_flag=True, help="开发模式热重载")
def serve(host: str, port: int, reload: bool):
    """启动 Web 服务"""
    console.print(f"[bold green]启动服务[/] http://{host}:{port}")
    console.print(f"[dim]API 文档: http://{host}:{port}/docs[/]")
    uvicorn.run(
        "wechat_engine.app:app",
        host=host,
        port=port,
        reload=reload,
    )


@main.command()
@click.option("--topic", "-t", required=True, help="文章主题")
@click.option("--style", default="informative", help="写作风格: informative/tutorial/story/hot_take")
@click.option("--words", "-w", default=2000, type=int, help="目标字数")
def write(topic: str, style: str, words: int):
    """AI 撰写文章"""
    import asyncio
    from wechat_engine.services.ai_writer import write_article

    console.print(f"[bold]正在撰写:[/] {topic}")

    async def _write():
        result = await write_article(topic=topic, style=style, target_words=words)
        if "error" in result:
            console.print(f"[red]错误: {result['error']}[/]")
            return
        console.print(f"\n[bold green]标题:[/] {result['title']}")
        console.print(f"[dim]摘要:[/] {result.get('summary', '')}")
        console.print(f"[dim]标签:[/] {', '.join(result.get('tags', []))}")
        console.print(f"[dim]成本:[/] ${result.get('cost_usd', 0):.4f}")
        console.print(f"\n[bold]正文:[]\n")
        console.print(result["content_md"])

    asyncio.run(_write())


@main.command()
def collect():
    """手动采集新闻"""
    import asyncio
    from wechat_engine.database import init_db, async_session
    from wechat_engine.services.news_collector import collect_all_news

    async def _collect():
        await init_db()
        async with async_session() as db:
            news = await collect_all_news(db)
            console.print(f"[bold green]采集到 {len(news)} 条新闻[/]")
            for n in news[:10]:
                console.print(f"  • {n['title'][:60]}")

    asyncio.run(_collect())


@main.command()
def init():
    """初始化数据库"""
    import asyncio
    from wechat_engine.database import init_db

    async def _init():
        await init_db()
        console.print("[bold green]数据库初始化完成[/]")

    asyncio.run(_init())


@main.command()
def stats():
    """查看统计信息"""
    import asyncio
    from wechat_engine.database import init_db, async_session
    from wechat_engine.models import Article, NewsItem, AICostLog
    from sqlalchemy import select, func
    from datetime import date

    async def _stats():
        await init_db()
        async with async_session() as db:
            total = (await db.execute(select(func.count(Article.id)))).scalar() or 0
            news = (await db.execute(select(func.count(NewsItem.id)))).scalar() or 0
            today = date.today()
            cost = (await db.execute(
                select(func.coalesce(func.sum(AICostLog.cost_usd), 0)).where(
                    func.date(AICostLog.created_at) == today
                )
            )).scalar() or 0

            table = Table(title="统计概览")
            table.add_column("指标", style="cyan")
            table.add_column("值", style="green")
            table.add_row("文章总数", str(total))
            table.add_row("新闻总数", str(news))
            table.add_row("今日 AI 成本", f"${float(cost):.4f}")
            console.print(table)

    asyncio.run(_stats())


if __name__ == "__main__":
    main()
