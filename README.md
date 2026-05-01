# 公众号推文自动写作系统 🤖✍️

全自动公众号推文生成系统：每天自动采集热点新闻 → AI写作爆款推文 → 公众号风格排版 → 邮件推送

## 🏗️ 系统架构

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  热点采集     │───▶│  AI 写作     │───▶│  HTML 排版   │───▶│  邮件发送    │
│ news_collector│    │   writer    │    │  formatter  │    │   sender    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
  百度热搜                                                    himalaya
  微博热搜         Kimi K2.5 via      公众号风格模板
  知乎热榜         NVIDIA API         随机配色方案       QQ邮箱推送
```

## 📁 文件结构

```
wechat/
├── auto_write.py          # 主程序入口
├── news_collector.py      # 热点新闻采集
├── writer.py              # LLM 推文写作
├── formatter.py           # HTML 排版
├── sender.py              # 邮件发送
├── config.yaml            # 配置文件
├── templates/
│   └── wechat_style.html  # 公众号风格模板
├── output/                # 生成的文章和数据
├── logs/                  # 运行日志
└── README.md
```

## 🚀 使用方式

```bash
# 完整运行（采集→写作→排版→发送）
python3 auto_write.py

# 试运行（不发送邮件）
python3 auto_write.py --dry-run

# 只采集新闻
python3 auto_write.py --news-only
```

## ⚙️ 配置

编辑 `config.yaml`:

- **llm**: LLM API 配置（默认使用 Kimi K2.5 via NVIDIA）
- **news.topics**: 新闻搜索话题
- **news.selected_count**: 用于写作的热点条数
- **email.recipient**: 接收邮箱
- **output.keep_days**: 文章保留天数

## 📋 环境变量

- `NVIDIA_API_KEY`: NVIDIA API 密钥（用于调用 Kimi K2.5）

## ⏰ 定时任务

通过 Hermes cron 每天自动运行：
```
每天 08:00 自动执行 → 采集热点 → AI写作 → 邮件推送
```
