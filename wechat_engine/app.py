"""FastAPI 主应用"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from wechat_engine.database import init_db
from wechat_engine.api import articles, ai, news, dashboard
from wechat_engine.services.scheduler import setup_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动
    os.makedirs("data", exist_ok=True)
    await init_db()
    scheduler = setup_scheduler()
    yield
    # 关闭
    shutdown_scheduler()


app = FastAPI(
    title="微信公众号内容引擎",
    description="AI 写作 + 新闻采集 + 模板排版 + 定时发布",
    version="2.0.0",
    lifespan=lifespan,
)

# 注册路由
app.include_router(articles.router)
app.include_router(ai.router)
app.include_router(news.router)
app.include_router(dashboard.router)

# 静态文件
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=HTMLResponse)
async def index():
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>微信公众号内容引擎</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;line-height:1.6}
.container{max-width:1200px;margin:0 auto;padding:20px}
.header{text-align:center;padding:40px 0;border-bottom:1px solid #21262d}
.header h1{font-size:2em;color:#58a6ff}
.header p{color:#8b949e;margin-top:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:32px}
.card{background:#161b22;border:1px solid #21262d;border-radius:12px;padding:24px;transition:border-color .2s}
.card:hover{border-color:#58a6ff}
.card h3{color:#58a6ff;margin-bottom:8px;font-size:1.1em}
.card p{color:#8b949e;font-size:0.9em}
.stat-row{display:flex;gap:24px;justify-content:center;margin-top:24px;flex-wrap:wrap}
.stat{text-align:center;padding:16px 24px;background:#161b22;border-radius:8px;border:1px solid #21262d}
.stat .num{font-size:2em;font-weight:700;color:#58a6ff}
.stat .label{color:#8b949e;font-size:0.85em}
.btn{display:inline-block;padding:10px 24px;background:#238636;color:#fff;border:none;border-radius:6px;font-size:0.95em;cursor:pointer;text-decoration:none;margin-top:20px}
.btn:hover{background:#2ea043}
.api-link{color:#58a6ff;text-decoration:none}
.api-link:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>微信公众号内容引擎</h1>
    <p>AI 写作 + 新闻采集 + 模板排版 + 定时发布</p>
  </div>

  <div class="stat-row" id="stats">
    <div class="stat"><div class="num" id="s-articles">-</div><div class="label">文章</div></div>
    <div class="stat"><div class="num" id="s-published">-</div><div class="label">已发布</div></div>
    <div class="stat"><div class="num" id="s-news">-</div><div class="label">新闻</div></div>
    <div class="stat"><div class="num" id="s-cost">-</div><div class="label">今日AI成本</div></div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>AI 写作</h3>
      <p>输入主题，AI 自动撰写公众号文章。支持参考新闻素材、自定义风格、目标字数。</p>
      <p style="margin-top:12px"><code>POST /api/ai/write</code></p>
    </div>
    <div class="card">
      <h3>新闻采集</h3>
      <p>RSS 自动采集 + AI 相关性评分。支持多源管理，定时抓取。</p>
      <p style="margin-top:12px"><code>POST /api/news/collect</code></p>
    </div>
    <div class="card">
      <h3>文章管理</h3>
      <p>创建、编辑、排版、定时发布。Markdown → 微信公众号 HTML 自动转换。</p>
      <p style="margin-top:12px"><code>GET /api/articles</code></p>
    </div>
    <div class="card">
      <h3>API 文档</h3>
      <p>完整的 REST API，支持所有功能的程序化操作。</p>
      <p style="margin-top:12px"><a class="api-link" href="/docs">Swagger UI →</a> &nbsp; <a class="api-link" href="/redoc">ReDoc →</a></p>
    </div>
  </div>
</div>
<script>
fetch("/api/dashboard").then(r=>r.json()).then(j=>{
  if(!j.ok)return;
  const d=j.data;
  document.getElementById("s-articles").textContent=d.articles.total;
  document.getElementById("s-published").textContent=d.articles.published;
  document.getElementById("s-news").textContent=d.news.total;
  document.getElementById("s-cost").textContent="$"+d.ai.today_cost_usd.toFixed(2);
});
</script>
</body>
</html>"""
