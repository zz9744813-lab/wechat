#!/usr/bin/env python3
"""
热点新闻采集脚本
从新浪新闻、财联社、36kr等渠道采集当日热点
输出 JSON 到 stdout
"""

import json
import sys
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
TIMEOUT = 12


def fetch_sina() -> list[dict]:
    """新浪新闻首页"""
    items = []
    try:
        resp = requests.get("https://news.sina.com.cn/", headers=HEADERS, timeout=TIMEOUT)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        seen = set()
        for a in soup.find_all("a"):
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if 15 < len(text) < 80 and text not in seen and "http" in href:
                seen.add(text)
                items.append({"title": text, "desc": "", "url": href, "source": "新浪新闻"})
                if len(items) >= 20:
                    break
    except Exception as e:
        print(f"[WARN] 新浪新闻: {e}", file=sys.stderr)
    return items


def fetch_cls() -> list[dict]:
    """财联社电报"""
    items = []
    try:
        resp = requests.get("https://www.cls.cn/telegraph", headers=HEADERS, timeout=TIMEOUT)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        seen = set()
        # 财联社的标题通常在特定 class 中
        for el in soup.find_all(["span", "a", "div"]):
            text = el.get_text(strip=True)
            if 15 < len(text) < 100 and text not in seen:
                seen.add(text)
                items.append({"title": text, "desc": "", "url": "", "source": "财联社"})
                if len(items) >= 15:
                    break
    except Exception as e:
        print(f"[WARN] 财联社: {e}", file=sys.stderr)
    return items


def fetch_163() -> list[dict]:
    """网易新闻"""
    items = []
    try:
        resp = requests.get("https://www.163.com/", headers=HEADERS, timeout=TIMEOUT)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        seen = set()
        for a in soup.find_all("a"):
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if 15 < len(text) < 80 and text not in seen and "http" in href:
                seen.add(text)
                items.append({"title": text, "desc": "", "url": href, "source": "网易新闻"})
                if len(items) >= 20:
                    break
    except Exception as e:
        print(f"[WARN] 网易新闻: {e}", file=sys.stderr)
    return items


def collect_all() -> list[dict]:
    """采集所有渠道并去重"""
    all_news = []
    
    for fetcher in [fetch_sina, fetch_163, fetch_cls]:
        try:
            news = fetcher()
            all_news.extend(news)
            print(f"[INFO] {fetcher.__name__}: {len(news)} 条", file=sys.stderr)
        except Exception as e:
            print(f"[ERROR] {fetcher.__name__}: {e}", file=sys.stderr)
    
    # 去重
    seen = set()
    unique = []
    for item in all_news:
        key = item["title"][:12]
        if key not in seen and len(item["title"]) > 10:
            seen.add(key)
            unique.append(item)
    
    print(f"[INFO] 共采集 {len(unique)} 条不重复热点", file=sys.stderr)
    return unique


if __name__ == "__main__":
    news = collect_all()
    print(json.dumps(news, ensure_ascii=False, indent=2))
