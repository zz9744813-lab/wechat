#!/usr/bin/env python3
"""
公众号推文自动写作系统 - 主程序
流程：采集热点 → AI写作 → HTML排版 → 邮件发送
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime

# 确保能找到同目录模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import yaml

# 加载 .env 文件
def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

_load_env()

from collect_news import collect_all as collect_all_news
from writer import generate_article
from formatter import render_article, render_email_subject
from sender import send_html_email

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            os.path.join(LOG_DIR, f"run_{datetime.now().strftime('%Y%m%d')}.log"),
            encoding="utf-8"
        )
    ]
)
logger = logging.getLogger(__name__)


def load_config() -> dict:
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(config_path) as f:
        return yaml.safe_load(f)


def run(dry_run: bool = False):
    """执行完整流程"""
    config = load_config()
    
    logger.info("=" * 50)
    logger.info("🚀 公众号推文自动写作系统启动")
    logger.info("=" * 50)
    
    # 第一步：采集热点
    logger.info("📰 第一步：采集热点新闻...")
    news = collect_all_news()
    
    if not news:
        logger.error("❌ 未采集到任何新闻，退出")
        return False
    
    logger.info(f"✅ 共采集 {len(news)} 条热点")
    
    # 保存原始新闻数据
    output_dir = config.get("output", {}).get("dir", "/root/wechat/output")
    os.makedirs(output_dir, exist_ok=True)
    news_file = os.path.join(output_dir, f"news_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(news_file, "w", encoding="utf-8") as f:
        json.dump(news, f, ensure_ascii=False, indent=2)
    
    # 取前N条用于写作
    selected = news[:config.get("news", {}).get("selected_count", 5)]
    logger.info(f"📝 选取 {len(selected)} 条热点用于写作")
    for item in selected:
        logger.info(f"  - [{item['source']}] {item['title']}")
    
    # 第二步：AI 写作
    logger.info("✍️ 第二步：AI 生成推文...")
    try:
        article = generate_article(selected, config)
    except Exception as e:
        logger.error(f"❌ 推文生成失败: {e}")
        return False
    
    logger.info(f"✅ 标题: {article['title']}")
    logger.info(f"   标签: {', '.join(article.get('tags', []))}")
    
    # 保存文章数据
    article_file = os.path.join(output_dir, f"article_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(article_file, "w", encoding="utf-8") as f:
        json.dump(article, f, ensure_ascii=False, indent=2)
    
    # 第三步：HTML 排版
    logger.info("🎨 第三步：HTML 排版...")
    html_path = render_article(article, output_dir)
    logger.info(f"✅ HTML 已生成: {html_path}")
    
    if dry_run:
        logger.info("🏁 试运行模式，跳过邮件发送")
        print(f"\n📄 HTML 文件: {html_path}")
        print(f"📰 标题: {article['title']}")
        print(f"📋 摘要: {article.get('summary', '')}")
        return True
    
    # 第四步：邮件发送
    logger.info("📧 第四步：发送邮件...")
    subject = render_email_subject(article)
    recipient = config.get("email", {}).get("recipient", "1873298001@qq.com")
    sender = config.get("email", {}).get("sender", "1873298001@qq.com")
    
    success = send_html_email(html_path, subject, recipient, sender)
    
    if success:
        logger.info("🎉 全流程完成！邮件已发送")
    else:
        logger.error("❌ 邮件发送失败")
    
    # 清理旧文件
    cleanup_old_files(output_dir, config.get("output", {}).get("keep_days", 30))
    
    return success


def cleanup_old_files(output_dir: str, keep_days: int):
    """清理超过保留天数的旧文件"""
    import glob
    import time
    
    cutoff = time.time() - keep_days * 86400
    removed = 0
    
    for pattern in ["*.html", "*.json"]:
        for fpath in glob.glob(os.path.join(output_dir, pattern)):
            if os.path.getmtime(fpath) < cutoff:
                os.remove(fpath)
                removed += 1
    
    if removed:
        logger.info(f"🧹 清理了 {removed} 个过期文件")


def main():
    parser = argparse.ArgumentParser(description="公众号推文自动写作系统")
    parser.add_argument("--dry-run", action="store_true", help="试运行，不发送邮件")
    parser.add_argument("--news-only", action="store_true", help="只采集新闻，不写作")
    args = parser.parse_args()
    
    if args.news_only:
        news = collect_all_news()
        for i, item in enumerate(news[:15], 1):
            print(f"{i:2d}. [{item['source']}] {item['title']}")
        return
    
    success = run(dry_run=args.dry_run)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
