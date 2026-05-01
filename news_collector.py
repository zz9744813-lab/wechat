"""
热点新闻采集模块
从百度热搜、微博热搜等渠道采集当日热点
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


def fetch_baidu_hot() -> list[dict]:
    """百度热搜"""
    items = []
    try:
        # 百度热搜页面
        resp = requests.get(
            "https://top.baidu.com/board?tab=realtime",
            headers=HEADERS,
            timeout=15
        )
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # 从页面提取热搜条目
        scripts = soup.find_all("script")
        for script in scripts:
            if script.string and "hotData" in script.string:
                # 尝试从JSON数据中提取
                match = re.search(r'var\s+\w+\s*=\s*(\[.*?\]);', script.string, re.DOTALL)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        for item in data[:15]:
                            if isinstance(item, dict):
                                items.append({
                                    "title": item.get("word", item.get("query", "")),
                                    "desc": item.get("desc", ""),
                                    "source": "百度热搜",
                                    "hot": item.get("hotScore", 0)
                                })
                    except json.JSONDecodeError:
                        pass
        
        # 备用：直接从HTML解析
        if not items:
            cards = soup.select(".category-wrap_iQLoo")
            for card in cards[:15]:
                title_el = card.select_one(".c-single-text-ellipsis")
                desc_el = card.select_one(".hot-desc_1m_jR")
                if title_el:
                    items.append({
                        "title": title_el.get_text(strip=True),
                        "desc": desc_el.get_text(strip=True) if desc_el else "",
                        "source": "百度热搜",
                        "hot": 0
                    })
        
        logger.info(f"百度热搜: 获取 {len(items)} 条")
    except Exception as e:
        logger.warning(f"百度热搜获取失败: {e}")
    
    return items


def fetch_weibo_hot() -> list[dict]:
    """微博热搜（通过移动端API）"""
    items = []
    try:
        resp = requests.get(
            "https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot",
            headers={**HEADERS, "Referer": "https://m.weibo.cn/"},
            timeout=15
        )
        data = resp.json()
        cards = data.get("data", {}).get("cards", [])
        for card in cards:
            card_group = card.get("card_group", [])
            for item in card_group[:15]:
                desc = item.get("desc", "")
                if desc:
                    items.append({
                        "title": desc,
                        "desc": item.get("desc_extr", ""),
                        "source": "微博热搜",
                        "hot": item.get("desc_extr", 0)
                    })
        logger.info(f"微博热搜: 获取 {len(items)} 条")
    except Exception as e:
        logger.warning(f"微博热搜获取失败: {e}")
    
    return items


def fetch_zhihu_hot() -> list[dict]:
    """知乎热榜"""
    items = []
    try:
        resp = requests.get(
            "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=15",
            headers={**HEADERS, "Referer": "https://www.zhihu.com/"},
            timeout=15
        )
        data = resp.json()
        for item in data.get("data", [])[:15]:
            target = item.get("target", {})
            items.append({
                "title": target.get("title", ""),
                "desc": target.get("excerpt", ""),
                "source": "知乎热榜",
                "hot": int(item.get("detail_text", "0").replace("万热度", "0000").replace(" 热度", ""))
            })
        logger.info(f"知乎热榜: 获取 {len(items)} 条")
    except Exception as e:
        logger.warning(f"知乎热榜获取失败: {e}")
    
    return items


def collect_all_news() -> list[dict]:
    """采集所有渠道的热点新闻并去重"""
    all_news = []
    
    for fetcher in [fetch_baidu_hot, fetch_weibo_hot, fetch_zhihu_hot]:
        try:
            news = fetcher()
            all_news.extend(news)
        except Exception as e:
            logger.error(f"采集器 {fetcher.__name__} 失败: {e}")
    
    # 去重（基于标题相似度）
    seen = set()
    unique_news = []
    for item in all_news:
        title = item["title"].strip()
        if not title or len(title) < 4:
            continue
        # 简单去重：标题前15个字符
        key = title[:15]
        if key not in seen:
            seen.add(key)
            unique_news.append(item)
    
    # 按热度排序
    unique_news.sort(key=lambda x: x.get("hot", 0), reverse=True)
    
    logger.info(f"共采集 {len(unique_news)} 条不重复热点")
    return unique_news


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    news = collect_all_news()
    for i, item in enumerate(news[:10], 1):
        print(f"{i}. [{item['source']}] {item['title']}")
        if item['desc']:
            print(f"   {item['desc'][:60]}")
