"""
新闻采集模块
采集全球热点新闻，重点关注政治、安全、科技
"""

import logging
from datetime import datetime, timezone

import feedparser
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

FEEDS = {
    # 政治与国际关系
    "BBC World": "http://feeds.bbci.co.uk/news/world/rss.xml",
    "Reuters World": "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best",
    "The Guardian": "https://www.theguardian.com/world/rss",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
    
    # 安全与黑客
    "Krebs on Security": "https://krebsonsecurity.com/feed/",
    "The Hacker News": "https://feeds.feedburner.com/TheHackersNews",
    "BleepingComputer": "https://www.bleepingcomputer.com/feed/",
    "SecurityWeek": "https://www.securityweek.com/feed",
    
    # 科技竞争
    "Ars Technica": "https://feeds.arstechnica.com/arstechnica/index",
    "TechCrunch": "https://techcrunch.com/feed/",
    "Wired": "https://www.wired.com/feed/rss",
    "Verge": "https://www.theverge.com/rss/index.xml",
    
    # 综合热点
    "CNN": "http://rss.cnn.com/rss/edition_world.rss",
    "NPR": "https://feeds.npr.org/1001/rss.xml",
}


def _parse_pub_date(entry):
    """解析发布时间"""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
    return None


def collect_news(max_per_feed: int = 3) -> list[dict]:
    """
    采集新闻，优先返回最新的政治/安全/科技新闻
    """
    all_items = []
    
    for source, url in FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:max_per_feed]:
                title = entry.get("title", "").strip()
                desc = entry.get("summary", "")
                if desc:
                    soup = BeautifulSoup(desc, "html.parser")
                    desc = soup.get_text()[:300].strip()
                
                pub_date = _parse_pub_date(entry)
                link = entry.get("link", "")
                
                if title:
                    all_items.append({
                        "title": title,
                        "desc": desc,
                        "source": source,
                        "url": link,
                        "pub_date": pub_date,
                    })
        except Exception as e:
            logger.warning(f"采集 {source} 失败: {e}")
    
    # 按时间排序，最新的在前
    all_items.sort(key=lambda x: x.get("pub_date") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    # 优先选择政治/安全相关内容
    priority_keywords = [
        "china", "russia", "ukraine", "war", "attack", "hack", "breach", "security",
        "cyber", "military", "nuclear", "sanction", "tariff", "espionage", "spy",
        "election", "vote", "intelligence", "classified", "leak", "surveillance",
        "ban", "restrict", "weapon", "conflict", "threat", "vulnerability", "malware",
        "ransomware", "zero-day", "apt", "state-sponsored", "geopolitical",
    ]
    
    priority_items = []
    other_items = []
    
    for item in all_items:
        title_lower = item["title"].lower()
        desc_lower = (item.get("desc") or "").lower()
        text = title_lower + " " + desc_lower
        
        if any(kw in text for kw in priority_keywords):
            priority_items.append(item)
        else:
            other_items.append(item)
    
    # 优先返回政治/安全新闻，不足则补充其他
    result = priority_items[:8] + other_items[:4]
    
    logger.info(f"共采集 {len(result)} 条新闻（优先 {len(priority_items)} 条，其他 {len(other_items)} 条）")
    return result[:10]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    news = collect_news()
    for i, item in enumerate(news, 1):
        print(f"{i}. [{item['source']}] {item['title']}")
