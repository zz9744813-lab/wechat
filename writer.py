"""
LLM 推文写作模块
调用大模型 API 生成爆款公众号推文
"""

import os
import json
import logging
import requests
import yaml

logger = logging.getLogger(__name__)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.yaml")


def _repair_json(text: str) -> dict:
    """尝试修复截断或格式错误的 JSON"""
    import re
    # 提取已有的字段
    result = {}
    
    # 提取 title
    m = re.search(r'"title"\s*:\s*"([^"]*)"', text)
    if m:
        result["title"] = m.group(1)
    
    # 提取 subtitle
    m = re.search(r'"subtitle"\s*:\s*"([^"]*)"', text)
    if m:
        result["subtitle"] = m.group(1)
    
    # 提取 lead
    m = re.search(r'"lead"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    if m:
        result["lead"] = m.group(1)
    
    # 提取 content_html（可能被截断，取最大块）
    m = re.search(r'"content_html"\s*:\s*"((?:[^"\\]|\\.)*)', text, re.DOTALL)
    if m:
        content = m.group(1)
        # 修复被截断的HTML标签
        open_tags = re.findall(r'<(\w+)[^>]*>', content)
        close_tags = re.findall(r'</(\w+)>', content)
        # 关闭未关闭的标签
        open_stack = []
        for tag in open_tags:
            if f'</{tag}>' not in content[content.find(tag):]:
                open_stack.append(tag)
        for tag in reversed(open_stack):
            content += f'</{tag}>'
        result["content_html"] = content
    
    # 提取 tags
    m = re.search(r'"tags"\s*:\s*\[(.*?)\]', text, re.DOTALL)
    if m:
        tags = re.findall(r'"([^"]*)"', m.group(1))
        result["tags"] = tags
    
    # 提取 summary
    m = re.search(r'"summary"\s*:\s*"([^"]*)"', text)
    if m:
        result["summary"] = m.group(1)
    
    if "title" not in result or "content_html" not in result:
        raise ValueError(f"修复后仍缺少必要字段: {list(result.keys())}")
    
    result.setdefault("subtitle", "")
    result.setdefault("lead", "")
    result.setdefault("tags", [])
    result.setdefault("summary", result["title"])
    
    return result


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def call_llm(prompt: str, system_prompt: str = "", config: dict = None) -> str:
    """调用 LLM API"""
    if config is None:
        config = load_config()
    
    llm_cfg = config["llm"]
    api_key = llm_cfg.get("api_key") or os.environ.get(llm_cfg.get("api_key_env", ""), "")
    if not api_key:
        raise ValueError(f"环境变量 {llm_cfg['api_key_env']} 未设置")
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    resp = requests.post(
        llm_cfg["api_url"],
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": llm_cfg["model"],
            "messages": messages,
            "max_tokens": llm_cfg.get("max_tokens", 4096),
            "temperature": llm_cfg.get("temperature", 0.8),
        },
        timeout=120
    )
    resp.raise_for_status()
    result = resp.json()
    
    content = result["choices"][0]["message"]["content"]
    # 清理可能的 markdown 代码块
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
    return content.strip()


SYSTEM_PROMPT = """你是一位顶级公众号爆款文章写手。你的文章特点：

1. **标题**：抓人眼球，善用数字、悬念、对比、情绪词，让人忍不住点开
2. **导语**：一两句话点明核心，制造好奇心
3. **正文结构清晰**：使用小标题分段，每段聚焦一个要点
4. **语言风格**：
   - 口语化但不失专业感
   - 善用短句、金句
   - 绝对禁止使用任何emoji/表情符号（如🔴、📰、✨等），只用文字
   - 善用"你"拉近与读者距离
5. **数据支撑**：引用具体数字、案例增强说服力
6. **结尾有力**：总结观点，引发思考或讨论
7. **SEO思维**：关键词自然融入，适合搜索传播

你输出的是纯 HTML 片段（不需要 <html><body> 等外层标签），用于嵌入邮件模板。
- 使用 <h2> 作为小标题
- 使用 <p> 作为正文段落
- 使用 <blockquote> 作为引用/金句
- 使用 <strong> 加粗重点
- 使用 <ul><li> 列举要点
- 适当使用 <br> 换行增强可读性"""


def generate_article(news_items: list[dict], config: dict = None) -> dict:
    """
    根据热点新闻生成推文
    
    返回:
        {
            "title": "文章标题",
            "subtitle": "副标题",
            "lead": "导语",
            "content_html": "正文HTML",
            "tags": ["标签1", "标签2"],
            "summary": "摘要"
        }
    """
    if config is None:
        config = load_config()
    
    # 构建新闻素材
    news_text = ""
    for i, item in enumerate(news_items, 1):
        news_text += f"\n{i}. 【{item['source']}】{item['title']}"
        if item.get("desc"):
            news_text += f"\n   详情：{item['desc'][:200]}"
    
    prompt = f"""以下是今日热点新闻素材，请从中选取最有话题性和传播力的 2-3 个相关联的热点，
写一篇爆款公众号推文。

📰 今日热点素材：
{news_text}

📝 输出要求：
请严格按以下 JSON 格式输出（不要输出其他内容）：

{{
  "title": "吸引人的文章标题（15-25字）",
  "subtitle": "一句话副标题",
  "lead": "导语段落（2-3句话，制造好奇心）",
  "content_html": "正文HTML（使用h2/p/blockquote/strong/ul/li等标签，2000-3000字）",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话摘要（50字内）"
}}"""

    logger.info("正在调用 LLM 生成推文...")
    raw = call_llm(prompt, SYSTEM_PROMPT, config)
    
    # 解析 JSON
    try:
        article = json.loads(raw)
    except json.JSONDecodeError:
        import re
        # 尝试从文本中提取 JSON
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                article = json.loads(match.group())
            except json.JSONDecodeError:
                # 尝试修复截断的 JSON
                article = _repair_json(match.group())
        else:
            raise ValueError(f"LLM 输出无法解析为 JSON:\n{raw[:500]}")
    
    # 验证必要字段
    required = ["title", "content_html"]
    for field in required:
        if field not in article:
            raise ValueError(f"缺少必要字段: {field}")
    
    article.setdefault("subtitle", "")
    article.setdefault("lead", "")
    article.setdefault("tags", [])
    article.setdefault("summary", article["title"])
    
    logger.info(f"推文生成完成: {article['title']}")
    return article


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # 测试用
    test_news = [
        {"title": "GPT-5发布在即", "desc": "OpenAI即将发布新一代模型", "source": "科技"},
        {"title": "A股突破3500点", "desc": "沪指创年内新高", "source": "财经"},
    ]
    result = generate_article(test_news)
    print(json.dumps(result, ensure_ascii=False, indent=2))
