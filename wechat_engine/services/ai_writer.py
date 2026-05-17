"""AI 写作服务 — 基于 Anthropic Claude 的内容生成"""

import json
import anthropic
from wechat_engine.config import get_settings

settings = get_settings()

# 价格（USD per 1M tokens）— 2025 年 Claude Sonnet 价格
PRICE_INPUT = 3.0 / 1_000_000
PRICE_OUTPUT = 15.0 / 1_000_000

WRITING_SYSTEM_PROMPT = """你是一位资深微信公众号内容编辑。你的写作风格：
- 标题吸引人但不标题党，点出核心价值
- 开头 3 秒内抓住读者注意力（用故事、数据或反常识开头）
- 正文用短段落（每段 2-4 句），适当使用 emoji 和加粗强调
- 结尾有明确的行动号召或引发思考的反问
- 语言自然口语化，避免学术腔和翻译腔
- 适配手机阅读习惯（微信 80% 用户手机阅读）
- 每篇控制在 1500-3000 字之间"""


async def write_article(
    topic: str,
    news_context: str = "",
    style: str = "informative",
    target_words: int = 2000,
) -> dict:
    """根据主题和新闻素材，AI 生成公众号文章"""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = f"""请根据以下信息撰写一篇微信公众号文章：

# 主题
{topic}

# 风格要求
{style}

# 目标字数
约 {target_words} 字

{"# 参考素材" + chr(10) + news_context if news_context else ""}

请输出严格 JSON 格式：
{{
  "title": "文章标题",
  "summary": "一句话摘要（用于分享卡片，≤120字）",
  "content_md": "Markdown 格式正文",
  "tags": ["标签1", "标签2"],
  "cover_suggestion": "封面图建议描述"
}}"""

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=4096,
        system=WRITING_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text if response.content[0].type == "text" else ""
    cost = response.usage.input_tokens * PRICE_INPUT + response.usage.output_tokens * PRICE_OUTPUT

    json_match = __import__("re").search(r"\{[\s\S]*\}", text)
    if not json_match:
        return {"error": "AI 未返回有效 JSON", "raw": text, "cost_usd": cost}

    data = json.loads(json_match[0])
    data["cost_usd"] = round(cost, 6)
    data["input_tokens"] = response.usage.input_tokens
    data["output_tokens"] = response.usage.output_tokens
    data["model"] = settings.anthropic_model
    return data


async def rewrite_article(content_md: str, instruction: str) -> dict:
    """根据指令重写/优化文章"""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=4096,
        system=WRITING_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"请根据以下指令优化这篇文章：\n\n## 指令\n{instruction}\n\n## 原文\n{content_md}\n\n请输出优化后的 Markdown 全文。"
        }],
    )

    text = response.content[0].text if response.content[0].type == "text" else ""
    cost = response.usage.input_tokens * PRICE_INPUT + response.usage.output_tokens * PRICE_OUTPUT
    return {"content_md": text, "cost_usd": round(cost, 6)}


async def summarize_news(text: str, max_length: int = 200) -> dict:
    """AI 摘要新闻"""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model=settings.anthropic_fast_model,
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"请用中文总结以下新闻，不超过 {max_length} 字，突出关键信息：\n\n{text}"
        }],
    )

    result_text = response.content[0].text if response.content[0].type == "text" else ""
    cost = response.usage.input_tokens * PRICE_INPUT + response.usage.output_tokens * PRICE_OUTPUT
    return {"summary": result_text.strip(), "cost_usd": round(cost, 6)}


async def score_news_relevance(title: str, summary: str, categories: list[str]) -> dict:
    """AI 评估新闻与公众号定位的相关性（0-10 分）"""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model=settings.anthropic_fast_model,
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": f"""评估这条新闻对微信公众号内容的相关性（0-10 分）。
关注领域：{', '.join(categories)}

标题：{title}
摘要：{summary}

只输出 JSON：{{"score": 数字, "reason": "理由（≤30字）"}}"""
        }],
    )

    text = response.content[0].text if response.content[0].type == "text" else ""
    json_match = __import__("re").search(r"\{[\s\S]*?\}", text)
    if json_match:
        data = json.loads(json_match[0])
        return {"score": float(data.get("score", 5)), "reason": data.get("reason", "")}
    return {"score": 5.0, "reason": "无法评估"}
