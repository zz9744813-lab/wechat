"""
LLM 推文写作模块
调用大模型 API 生成爆款公众号推文
"""

import os
import json
import logging
import requests
import yaml
from datetime import datetime

logger = logging.getLogger(__name__)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.yaml")


def _repair_json(text: str) -> dict:
    """尝试修复截断或格式错误的 JSON"""
    import re
    result = {}
    
    m = re.search(r'"title"\s*:\s*"([^"]*)"', text)
    if m:
        result["title"] = m.group(1)
    
    m = re.search(r'"subtitle"\s*:\s*"([^"]*)"', text)
    if m:
        result["subtitle"] = m.group(1)
    
    m = re.search(r'"lead"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    if m:
        result["lead"] = m.group(1)
    
    m = re.search(r'"content_html"\s*:\s*"((?:[^"\\]|\\.)*)', text, re.DOTALL)
    if m:
        content = m.group(1)
        open_tags = re.findall(r'<(\w+)[^>]*>', content)
        open_stack = []
        for tag in open_tags:
            if f'</{tag}>' not in content[content.find(tag):]:
                open_stack.append(tag)
        for tag in reversed(open_stack):
            content += f'</{tag}>'
        result["content_html"] = content
    
    m = re.search(r'"tags"\s*:\s*\[(.*?)\]', text, re.DOTALL)
    if m:
        tags = re.findall(r'"([^"]*)"', m.group(1))
        result["tags"] = tags
    
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
            "max_tokens": llm_cfg.get("max_tokens", 16384),
            "temperature": llm_cfg.get("temperature", 0.85),
        },
        timeout=300
    )
    resp.raise_for_status()
    result = resp.json()
    
    content = result["choices"][0]["message"]["content"]
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
    return content.strip()


SYSTEM_PROMPT = """你是一位顶级公众号爆款文章写手，擅长将国际新闻深度改编为中文爆款文章。

你的写作风格特点：
- 深度分析型，不是简单翻译，而是加入背景、解读、影响分析
- 善于制造悬念和冲突，让读者欲罢不能
- 政治、安全、科技类新闻是你的强项
- 每篇文章必须2000字以上，内容充实有料
- 重要：文章中必须多次引用具体日期（如"5月1日"、"4月30日"），增强时效感和真实感

具体要求：

1. **选题策略**：优先选择涉及国际政治、网络安全、地缘冲突、科技竞争等自带流量的话题
2. **标题**：必须抓人眼球，善用数字、悬念、对比、情绪词，让人忍不住点开
3. **导语**：3-4句话，制造强烈好奇心，暗示后续有猛料
4. **正文结构**：
   - 使用小标题分段，每段聚焦一个要点
   - 至少5-7个小标题段落
   - 每段至少200-300字
   - 加入背景分析、多方观点、深层影响
   - 必须引用新闻发生的具体日期，如"据5月1日报道"、"4月30日当天"
5. **语言风格**：
   - 口语化但不失专业感
   - 善用短句、金句
   - 绝对禁止使用任何emoji/表情符号，只用文字
   - 善用"你"拉近与读者距离
6. **数据支撑**：引用具体数字、案例、历史事件增强说服力
7. **结尾有力**：总结观点，引发思考，留下悬念或讨论空间
8. **SEO思维**：关键词自然融入，适合搜索传播

你输出的是纯 HTML 片段（不需要 <html><body> 等外层标签），用于嵌入邮件模板。
- 使用 <h2> 作为小标题
- 使用 <p> 作为正文段落（每段至少3-4句话）
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
    
    today = datetime.now()
    today_str = today.strftime("%Y年%m月%d日")
    
    news_text = ""
    for i, item in enumerate(news_items, 1):
        pub_date = item.get("pub_date")
        if pub_date:
            date_str = pub_date.strftime("%m月%d日")
        else:
            date_str = "今日"
        
        news_text += f"\n{i}. 【{item['source']} | {date_str}】{item['title']}"
        if item.get("desc"):
            news_text += f"\n   详情：{item['desc'][:300]}"
        if item.get("url"):
            news_text += f"\n   链接：{item['url']}"
    
    prompt = f"""以下是{today_str}的热点新闻素材，请从中选取最有话题性和传播力的 2-3 个相关联的热点，
写一篇深度爆款公众号推文。

重点关注方向：
- 国际政治博弈、地缘冲突
- 网络安全、数据泄露、黑客攻击
- 科技竞争、芯片战争、AI监管
- 中美关系、贸易摩擦

📰 {today_str}热点素材：
{news_text}

📝 输出要求：
1. 文章必须2000字以上，深度分析，不是简单翻译新闻
2. 文章中必须多次引用具体日期（如"{today.strftime('%m月%d日')}"、"近日"等），增强时效感
3. 标题或导语中要体现今天是{today_str}

请严格按以下 JSON 格式输出（不要输出其他内容）：

{{
  "title": "吸引人的文章标题（15-25字）",
  "subtitle": "一句话副标题",
  "lead": "导语段落（3-4句话，制造强烈好奇心）",
  "content_html": "正文HTML（使用h2/p/blockquote/strong/ul/li等标签，必须2000字以上，至少5-7个小标题段落）",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话摘要（50字内）"
}}"""

    logger.info("正在调用 LLM 生成推文...")
    raw = call_llm(prompt, SYSTEM_PROMPT, config)
    
    try:
        article = json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                article = json.loads(match.group())
            except json.JSONDecodeError:
                article = _repair_json(match.group())
        else:
            raise ValueError(f"LLM 输出无法解析为 JSON:\n{raw[:500]}")
    
    required = ["title", "content_html"]
    for field in required:
        if field not in article:
            raise ValueError(f"缺少必要字段: {field}")
    
    article.setdefault("subtitle", "")
    article.setdefault("lead", "")
    article.setdefault("tags", [])
    article.setdefault("summary", article["title"])
    
    # 检查字数
    content = article["content_html"]
    char_count = len(content)
    logger.info(f"推文生成完成: {article['title']} ({char_count}字)")
    
    return article


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_news = [
        {"title": "US-China tech war escalates", "desc": "New chip export restrictions announced", "source": "Reuters", "pub_date": datetime.now()},
        {"title": "Major data breach at US agency", "desc": "Millions of records exposed", "source": "CNN", "pub_date": datetime.now()},
    ]
    result = generate_article(test_news)
    print(json.dumps(result, ensure_ascii=False, indent=2))
