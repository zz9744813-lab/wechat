"""
热点新闻采集模块
从美国新闻源采集热点，翻译为中文
"""

import requests
import re
import json
import logging
from datetime import datetime
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
TIMEOUT = 15


def fetch_reddit_popular() -> list[dict]:
    """Reddit 热门帖子"""
    items = []
    try:
        resp = requests.get(
            "https://www.reddit.com/r/popular.json?limit=20",
            headers={**HEADERS, "Accept": "application/json"},
            timeout=TIMEOUT
        )
        data = resp.json()
        for post in data.get("data", {}).get("children", [])[:15]:
            p = post.get("data", {})
            if p.get("title"):
                items.append({
                    "title": p["title"],
                    "desc": p.get("selftext", "")[:200],
                    "source": "Reddit",
                    "url": f"https://reddit.com{p.get('permalink', '')}",
                    "hot": p.get("ups", 0)
                })
        logger.info(f"Reddit: {len(items)} posts")
    except Exception as e:
        logger.warning(f"Reddit failed: {e}")
    return items


def fetch_hackernews() -> list[dict]:
    """Hacker News 热门"""
    items = []
    try:
        resp = requests.get(
            "https://hacker-news.firebaseio.com/v0/topstories.json",
            timeout=TIMEOUT
        )
        story_ids = resp.json()[:15]
        for sid in story_ids:
            try:
                story = requests.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{sid}.json",
                    timeout=5
                ).json()
                if story and story.get("title"):
                    items.append({
                        "title": story["title"],
                        "desc": "",
                        "source": "Hacker News",
                        "url": story.get("url", f"https://news.ycombinator.com/item?id={sid}"),
                        "hot": story.get("score", 0)
                    })
            except:
                continue
        logger.info(f"Hacker News: {len(items)} items")
    except Exception as e:
        logger.warning(f"Hacker News failed: {e}")
    return items


def fetch_techcrunch() -> list[dict]:
    """TechCrunch 头条"""
    items = []
    try:
        resp = requests.get("https://techcrunch.com/", headers=HEADERS, timeout=TIMEOUT)
        soup = BeautifulSoup(resp.text, "html.parser")
        seen = set()
        for a in soup.find_all("a"):
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if 20 < len(text) < 100 and text not in seen and "techcrunch.com" in href:
                seen.add(text)
                items.append({
                    "title": text,
                    "desc": "",
                    "source": "TechCrunch",
                    "url": href,
                    "hot": 0
                })
                if len(items) >= 15:
                    break
        logger.info(f"TechCrunch: {len(items)} items")
    except Exception as e:
        logger.warning(f"TechCrunch failed: {e}")
    return items


def fetch_cnn_top() -> list[dict]:
    """CNN 头条"""
    items = []
    try:
        resp = requests.get(
            "https://lite.cnn.com",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        soup = BeautifulSoup(resp.text, "html.parser")
        seen = set()
        for li in soup.find_all("li"):
            a = li.find("a")
            if a:
                text = a.get_text(strip=True)
                href = a.get("href", "")
                if 15 < len(text) < 100 and text not in seen:
                    seen.add(text)
                    url = href if href.startswith("http") else f"https://lite.cnn.com{href}"
                    items.append({
                        "title": text,
                        "desc": "",
                        "source": "CNN",
                        "url": url,
                        "hot": 0
                    })
                    if len(items) >= 15:
                        break
        logger.info(f"CNN: {len(items)} items")
    except Exception as e:
        logger.warning(f"CNN failed: {e}")
    return items


def collect_all_news() -> list[dict]:
    """采集所有渠道的热点新闻并去重"""
    all_news = []
    
    for fetcher in [fetch_reddit_popular, fetch_hackernews, fetch_techcrunch, fetch_cnn_top]:
        try:
            news = fetcher()
            all_news.extend(news)
        except Exception as e:
            logger.error(f"Fetcher {fetcher.__name__} failed: {e}")
    
    # 去重
    seen = set()
    unique_news = []
    for item in all_news:
        title = item["title"].strip()
        if not title or len(title) < 4:
            continue
        key = title[:15]
        if key not in seen:
            seen.add(key)
            unique_news.append(item)
    
    # 按热度排序
    unique_news.sort(key=lambda x: x.get("hot", 0), reverse=True)
    
    logger.info(f"Total: {len(unique_news)} unique headlines")
    return unique_news


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    news = collect_all_news()
    for i, item in enumerate(news[:10], 1):
        print(f"{i}. [{item['source']}] {item['title']}")
        if item['desc']:
            print(f"   {item['desc'][:60]}")
