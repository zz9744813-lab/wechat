"""微信公众号发送服务 — 上传素材 + 发布文章"""

import httpx
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from wechat_engine.models import Article, PublishLog, ArticleStatus
from wechat_engine.config import get_settings

settings = get_settings()

WECHAT_API_BASE = "https://api.weixin.qq.com/cgi-bin"


async def get_access_token() -> str:
    """获取微信 access_token"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{WECHAT_API_BASE}/token", params={
            "grant_type": "client_credential",
            "appid": settings.wechat_app_id,
            "secret": settings.wechat_app_secret,
        })
        data = resp.json()
        if "access_token" not in data:
            raise RuntimeError(f"获取 access_token 失败: {data}")
        return data["access_token"]


async def upload_thumb_media(access_token: str, image_url: str) -> str:
    """上传封面图为临时素材，返回 media_id"""
    async with httpx.AsyncClient() as client:
        # 下载图片
        img_resp = await client.get(image_url, follow_redirects=True)
        img_resp.raise_for_status()

        # 上传到微信
        resp = await client.post(
            f"{WECHAT_API_BASE}/media/upload",
            params={"access_token": access_token, "type": "image"},
            files={"media": ("cover.jpg", img_resp.content, "image/jpeg")},
        )
        data = resp.json()
        if "media_id" not in data:
            raise RuntimeError(f"上传封面失败: {data}")
        return data["media_id"]


async def upload_article_draft(
    access_token: str,
    title: str,
    content: str,
    author: str = "",
    digest: str = "",
    thumb_media_id: str = "",
) -> dict:
    """上传图文消息草稿"""
    articles = [{
        "title": title,
        "author": author,
        "digest": digest,
        "content": content,
        "thumb_media_id": thumb_media_id,
        "need_open_comment": 1,
        "only_fans_can_comment": 0,
    }]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{WECHAT_API_BASE}/draft/add",
            params={"access_token": access_token},
            json={"articles": articles},
        )
        return resp.json()


async def publish_draft(access_token: str, media_id: str) -> dict:
    """发布草稿"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{WECHAT_API_BASE}/freepublish/submit",
            params={"access_token": access_token},
            json={"media_id": media_id},
        )
        return resp.json()


async def publish_article(db: AsyncSession, article_id: int) -> dict:
    """完整的文章发布流程"""
    from sqlalchemy import select

    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        return {"error": "文章不存在"}

    log = PublishLog(article_id=article_id, action="publish")

    try:
        token = await get_access_token()

        # 上传封面（如果有）
        thumb_id = ""
        if article.cover_image_url:
            thumb_id = await upload_thumb_media(token, article.cover_image_url)

        # 上传草稿
        draft_result = await upload_article_draft(
            token,
            title=article.title,
            content=article.content_html,
            author=article.author,
            digest=article.summary or "",
            thumb_media_id=thumb_id,
        )

        if "media_id" not in draft_result:
            log.success = False
            log.error_message = str(draft_result)
            db.add(log)
            await db.commit()
            return {"error": "上传草稿失败", "details": draft_result}

        article.wechat_media_id = draft_result["media_id"]
        article.status = ArticleStatus.PUBLISHED.value
        article.published_at = datetime.utcnow()

        log.success = True
        log.response_data = str(draft_result)
        db.add(log)
        await db.commit()

        return {"success": True, "media_id": draft_result["media_id"]}

    except Exception as e:
        log.success = False
        log.error_message = str(e)
        article.status = ArticleStatus.FAILED.value
        db.add(log)
        await db.commit()
        return {"error": str(e)}
