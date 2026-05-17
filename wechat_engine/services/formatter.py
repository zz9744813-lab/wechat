"""模板格式化服务 — Markdown → 微信公众号 HTML"""

import os
import re
import markdown
from jinja2 import Environment, FileSystemLoader, select_autoescape
from wechat_engine.config import get_settings

settings = get_settings()

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")


def get_jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html"]),
    )


def md_to_html(md_text: str) -> str:
    """Markdown → HTML，适配微信公众号样式"""
    html = markdown.markdown(
        md_text,
        extensions=["extra", "codehilite", "toc", "nl2br"],
    )

    # 微信公众号不支持 <h1>，用 <h2> 替代
    html = html.replace("<h1", "<h2").replace("</h1>", "</h2>")

    # 给图片加微信样式
    html = re.sub(
        r'<img(.*?)/?>',
        r'<img\1 style="max-width:100%;height:auto;border-radius:8px;margin:16px 0;" />',
        html,
    )

    return html


def format_article(
    title: str,
    content_md: str,
    author: str = "",
    summary: str = "",
    template_name: str = "default",
    **kwargs,
) -> str:
    """使用模板渲染最终 HTML"""
    content_html = md_to_html(content_md)

    env = get_jinja_env()
    try:
        template = env.get_template(f"{template_name}.html")
    except Exception:
        template = env.get_template("default.html")

    return template.render(
        title=title,
        content_html=content_html,
        author=author,
        summary=summary,
        **kwargs,
    )


def extract_first_image(html: str) -> str | None:
    """从 HTML 中提取第一张图片 URL"""
    match = re.search(r'<img[^>]+src="([^"]+)"', html)
    return match.group(1) if match else None


def strip_html_tags(html: str) -> str:
    """去除 HTML 标签，返回纯文本"""
    return re.sub(r"<[^>]+>", "", html).strip()
