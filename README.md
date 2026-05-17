# 微信公众号内容引擎 v2.0

AI 驱动的微信公众号内容生产平台 — 从新闻采集到文章发布的全自动流水线。

## 功能架构

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  新闻采集    │───▶│  AI 写作      │───▶│  模板排版     │───▶│  发布上线     │
│  RSS + 网页  │    │  Claude 生成  │    │  Markdown→HTML│    │  微信公众号   │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                  │                   │                   │
   定时自动抓取       自定义风格/字数       3 套精美模板         草稿+定时发布
   AI 相关性评分      参考新闻素材          自适应手机阅读        发布日志审计
   多源管理          预算控制              封面自动提取          失败自动重试
```

## 核心特性

- **AI 写作**：输入主题，Claude 自动生成公众号文章，支持多种风格和目标字数
- **新闻采集**：RSS 多源自动采集 + AI 相关性评分，定时抓取
- **模板排版**：Markdown → 微信公众号 HTML，3 套精美模板（默认/快讯/社论）
- **定时发布**：支持定时发布、发布日志审计
- **成本控制**：AI 每日预算上限，防止超支
- **CLI 工具**：命令行快速操作，适合自动化脚本
- **REST API**：完整 API，支持所有功能的程序化操作

## 快速开始

```bash
# 1. 安装
pip install -e .

# 2. 配置
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY

# 3. 初始化数据库
wechat init

# 4. 启动服务
wechat serve
```

打开 http://localhost:8000 查看控制面板，http://localhost:8000/docs 查看 API 文档。

## CLI 命令

```bash
# 启动 Web 服务
wechat serve [--port 8000] [--reload]

# AI 撰写文章
wechat write --topic "AI 对教育的影响" --style informative --words 2000

# 手动采集新闻
wechat collect

# 查看统计
wechat stats

# 初始化数据库
wechat init
```

## API 端点

### AI 写作

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/ai/write` | AI 撰写文章 |
| `POST` | `/api/ai/rewrite` | AI 重写/优化文章 |
| `POST` | `/api/ai/summarize` | AI 摘要新闻 |

### 文章管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/articles` | 文章列表 |
| `POST` | `/api/articles` | 创建文章 |
| `GET` | `/api/articles/:id` | 文章详情 |
| `PATCH` | `/api/articles/:id` | 更新文章 |
| `DELETE` | `/api/articles/:id` | 删除文章 |
| `POST` | `/api/articles/:id/schedule` | 定时发布 |

### 新闻管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/news/items` | 新闻列表 |
| `POST` | `/api/news/collect` | 触发采集 |
| `GET` | `/api/news/sources` | 源列表 |
| `POST` | `/api/news/sources` | 添加源 |
| `DELETE` | `/api/news/sources/:id` | 删除源 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/dashboard` | 仪表盘数据 |

## 模板

| 模板名 | 风格 | 适用场景 |
|--------|------|----------|
| `default` | 清新绿 | 日常内容、产品介绍 |
| `newsflash` | 新闻红 | 快讯、热点追踪 |
| `editorial` | 社论金 | 深度评论、专栏文章 |

## 技术栈

| 层级 | 选型 |
|------|------|
| Framework | FastAPI |
| Language | Python 3.11+ |
| Database | SQLite + SQLAlchemy (async) |
| AI | Anthropic Claude (Sonnet + Haiku) |
| Templates | Jinja2 |
| Scheduler | APScheduler |
| News | feedparser + httpx + BeautifulSoup |
| CLI | Click + Rich |

## 项目结构

```
wechat/
├── wechat_engine/
│   ├── __init__.py
│   ├── __main__.py          # python -m 入口
│   ├── app.py               # FastAPI 主应用
│   ├── cli.py               # CLI 入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models.py            # SQLAlchemy 模型
│   ├── api/
│   │   ├── articles.py      # 文章 API
│   │   ├── ai.py            # AI 写作 API
│   │   ├── dashboard.py     # 仪表盘 API
│   │   └── news.py          # 新闻 API
│   ├── services/
│   │   ├── ai_writer.py     # AI 写作服务
│   │   ├── news_collector.py # 新闻采集服务
│   │   ├── formatter.py     # 模板格式化服务
│   │   ├── sender.py        # 微信发送服务
│   │   └── scheduler.py     # 定时任务调度
│   └── templates/
│       ├── default.html     # 默认模板
│       ├── newsflash.html   # 快讯模板
│       └── editorial.html   # 社论模板
├── pyproject.toml
├── .env.example
└── README.md
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | (必填) |
| `ANTHROPIC_MODEL` | 主力 AI 模型 | claude-sonnet-4-5 |
| `ANTHROPIC_FAST_MODEL` | 简单任务模型 | claude-haiku-4-5 |
| `DATABASE_URL` | 数据库路径 | sqlite+aiosqlite:///./data/wechat.db |
| `WECHAT_APP_ID` | 微信 AppID | (发布功能必填) |
| `WECHAT_APP_SECRET` | 微信 AppSecret | (发布功能必填) |
| `NEWS_RSS_URLS` | RSS 源（逗号分隔） | (空) |
| `AI_DAILY_LIMIT_USD` | AI 每日预算上限 | 5.00 |

## License

MIT
