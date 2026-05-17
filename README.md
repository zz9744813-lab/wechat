# Mirror Epic — 镜像史诗

**你写一行,世界长一卷。**

一个把个人成长管理和长篇小说写作深度耦合的系统。你写日记,AI 写小说;你过人生,AI 替你的"镜像"过平行人生。

## 核心理念

- **日记**:把模糊的内心整理成清晰的语言
- **小说**:把清晰的内心包裹回戏剧性的形象
- **桥接层**:现实事件经过抽象化→主题化→意象重塑,注入小说世界

### 三种工作模式

| 模式 | 输入 | 输出 | 心理功能 |
|---|---|---|---|
| **镜像模式** | 你的真实事件 | 小说中"镜像角色"的对应经历 | 拉开距离,获得视角 |
| **推演模式** | 两难抉择 | 平行宇宙分支故事 | 决策预演 |
| **升华模式** | 不敢碰的情绪/创伤 | 角色去面对它的故事 | 情绪的安全表达 |

## 技术栈

| 层级 | 选型 |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| DB | SQLite + Prisma |
| UI | Tailwind CSS |
| AI | Anthropic Claude |
| Validation | Zod |

## 快速开始

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
# 编辑 .env 填入 ANTHROPIC_API_KEY
npm run dev
```

## 功能模块

### 日记 (Journal)
- 自然语言输入 + 心情/能量标记
- AI 7-pass 自动处理:事件抽取→情绪光谱→念头识别→模式匹配→主题提取→桥接信号→反思提示
- 隐私分级,日记原文不出库

### 小说 (Novel)
- 章节大纲生成 (基于世界设定 + 角色 + 用户信号包)
- 3-pass 写作管线:初稿→角色声音审查→散文打磨
- 阅读已完成章节

### 世界 (World)
- World Bible 编辑:宇宙规则、调性
- 角色管理:名字、原型、核心创伤、语言模式、成长边缘

### 模式 (Patterns)
- 自动识别反复出现的行为模式
- 模式与角色关联 (character_carriers)

## 章节写作管线

每章经过 3 个 pass (MVP):

| Pass | 任务 |
|---|---|
| 1. 初稿 | 根据大纲写出完整章节 |
| 2. 声音审查 | 检查角色台词是否符合语言模式 |
| 3. 散文打磨 | 句法、意象、节奏的工艺级润色 |

完全体将扩展到 10 pass,增加世界一致性、主题审计、情感弧线检查等。

## 安全机制

- **隐私铁律**:日记原文永远经过桥接层去敏,绝不原文出库
- **不诊断**:不输出任何医学/心理诊断标签
- **危机识别**:检测到风险信号 → 立即展示真实求助资源
- **现实优先**:小说不能替代行动决策

## 项目结构

```
app/
├── page.tsx              # 仪表盘
├── journal/page.tsx      # 日记
├── novel/page.tsx        # 小说
├── world/page.tsx        # 世界设定
├── patterns/page.tsx     # 个人模式
├── settings/page.tsx     # 设置
└── api/
    ├── journals/         # 日记 API
    ├── chapters/         # 章节 API
    ├── chapters/write/   # 章节写作
    ├── world/            # 世界设定 API
    ├── characters/       # 角色 API
    └── dashboard/        # 仪表盘

lib/
├── ai/
│   ├── client.ts         # Anthropic SDK
│   ├── prompts.ts        # 所有 Prompt 模板
│   ├── schemas.ts        # Zod Schema
│   └── pipeline.ts       # 日记处理 + 章节写作管线
├── bridge/
│   └── index.ts          # 桥接层 (事件变形、信号包构建)
├── db.ts                 # Prisma Client
└── utils.ts

prisma/
├── schema.prisma         # 数据模型
└── seed.ts               # 默认世界圣经
```

## 设计哲学

1. **这不是工具** — 是长期陪伴成长的活物
2. **慢即是快** — 一天一章,但每章经得起一年后回看
3. **小说是为用户写的,但不能是关于用户的** — 隐喻、变形、提纯
4. **AI 不替用户活** — 洞见以"也许"开头,建议以"你怎么看"结尾
5. **保留"沉默"** — 系统要有判断"今天不动笔"的智慧

## License

MIT
