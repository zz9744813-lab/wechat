import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQuarterlyNarrative, generateAnnualNarrative } from "@/lib/ai/pipeline";

/** 生成季度生命叙事 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, periodLabel } = body; // type: "quarterly" | "annual"

    if (type === "annual") {
      return await generateAnnual(body.year ?? "2025");
    }

    return await generateQuarterly(periodLabel ?? "最近");
  } catch (error) {
    console.error("narrative generation error:", error);
    return NextResponse.json({ ok: false, error: "生成失败" }, { status: 500 });
  }
}

async function generateQuarterly(periodLabel: string) {
  // 获取最近 3 个月的数据
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const journals = await prisma.journalEntry.findMany({
    where: { timestamp: { gte: threeMonthsAgo } },
    orderBy: { timestamp: "desc" },
  });

  if (journals.length === 0) {
    return NextResponse.json({ ok: false, error: "没有足够的日记数据" }, { status: 400 });
  }

  // 汇总主题
  const allThemes: Record<string, number> = {};
  const allPatterns: string[] = [];
  for (const j of journals) {
    try {
      const themes = JSON.parse(j.extractedThemes ?? "[]");
      for (const t of themes) {
        const name = t.name ?? t;
        allThemes[name] = (allThemes[name] ?? 0) + (t.intensity ?? 1);
      }
      const patterns = JSON.parse(j.matchedPatterns ?? "[]");
      allPatterns.push(...patterns);
    } catch {}
  }

  const themeSummary = Object.entries(allThemes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, intensity]) => `${name}: ${intensity.toFixed(1)}`)
    .join("\n");

  const patternSummary = [...new Set(allPatterns)].join(", ") || "暂无明确模式";

  const result = await generateQuarterlyNarrative(themeSummary, patternSummary, journals.length, periodLabel);

  // 记录成本
  await prisma.aIPassLog.create({
    data: {
      operation: "quarterly_narrative",
      passName: "narrative_generation",
      model: process.env.ANTHROPIC_MODEL ?? "",
      inputTokens: result.tokens,
      outputTokens: 0,
      costUsd: result.cost,
      targetType: "narrative",
    },
  });

  return NextResponse.json({ ok: true, data: result.narrative, tokensUsed: result.tokens, costUsd: result.cost });
}

async function generateAnnual(year: string) {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  const journals = await prisma.journalEntry.findMany({
    where: { timestamp: { gte: startDate, lte: endDate } },
    orderBy: { timestamp: "asc" },
  });

  const chapters = await prisma.chapter.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    orderBy: { chapterNum: "asc" },
  });

  // 构建年度数据摘要
  const monthCounts: Record<string, number> = {};
  const allThemes: Record<string, number> = {};
  for (const j of journals) {
    const month = new Date(j.timestamp).toISOString().slice(0, 7);
    monthCounts[month] = (monthCounts[month] ?? 0) + 1;
    try {
      const themes = JSON.parse(j.extractedThemes ?? "[]");
      for (const t of themes) {
        const name = t.name ?? t;
        allThemes[name] = (allThemes[name] ?? 0) + (t.intensity ?? 1);
      }
    } catch {}
  }

  const yearData = [
    `年份: ${year}`,
    `日记总数: ${journals.length}`,
    `章节总数: ${chapters.length}`,
    `月度分布: ${JSON.stringify(monthCounts)}`,
    `主题分布: ${JSON.stringify(Object.fromEntries(Object.entries(allThemes).sort(([,a],[,b]) => b-a).slice(0, 15)))}`,
    `能量变化: ${journals.map(j => j.energy).join("→")}`,
  ].join("\n");

  const result = await generateAnnualNarrative(yearData, year);

  await prisma.aIPassLog.create({
    data: {
      operation: "annual_narrative",
      passName: "narrative_generation",
      model: process.env.ANTHROPIC_MODEL ?? "",
      inputTokens: result.tokens,
      outputTokens: 0,
      costUsd: result.cost,
      targetType: "narrative",
    },
  });

  return NextResponse.json({ ok: true, data: result.narrative, tokensUsed: result.tokens, costUsd: result.cost });
}
