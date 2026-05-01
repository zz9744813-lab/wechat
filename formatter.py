"""
HTML 排版模块
将生成的文章渲染为公众号风格 HTML
"""

import os
import random
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")

# 配色方案（每次随机选一组）
COLOR_SCHEMES = [
    {"header_color_1": "#1a1a2e", "header_color_2": "#16213e", "accent_color": "#e94560"},  # 深蓝+红
    {"header_color_1": "#0f0c29", "header_color_2": "#302b63", "accent_color": "#ff6b6b"},  # 紫+珊瑚
    {"header_color_1": "#141e30", "header_color_2": "#243b55", "accent_color": "#f7797d"},  # 深海蓝+粉
    {"header_color_1": "#1f1c2c", "header_color_2": "#928dab", "accent_color": "#e74c3c"},  # 灰紫+红
    {"header_color_1": "#0c0c0c", "header_color_2": "#1a1a2e", "accent_color": "#e94560"},  # 纯黑+红
    {"header_color_1": "#2d1b69", "header_color_2": "#11001c", "accent_color": "#ff6f91"},  # 深紫+粉
]


def render_article(article: dict, output_dir: str = None) -> str:
    """
    渲染文章为 HTML 文件
    
    Args:
        article: generate_article() 返回的文章数据
        output_dir: 输出目录
    
    Returns:
        生成的 HTML 文件路径
    """
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template("wechat_style.html")
    
    # 随机配色
    colors = random.choice(COLOR_SCHEMES)
    
    now = datetime.now()
    
    html = template.render(
        title=article["title"],
        subtitle=article.get("subtitle", ""),
        lead=article.get("lead", ""),
        content_html=article["content_html"],
        tags=article.get("tags", []),
        date=now.strftime("%Y年%m月%d日"),
        generated_at=now.strftime("%Y-%m-%d %H:%M"),
        **colors
    )
    
    # 保存文件
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    filename = f"wechat_{now.strftime('%Y%m%d_%H%M%S')}.html"
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
    
    return filepath


def render_email_subject(article: dict) -> str:
    """生成邮件标题"""
    date_str = datetime.now().strftime("%m/%d")
    return f"📰 每日爆款推文 | {date_str} | {article.get('title', '今日热点')}"
