import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [
    journalCount, chapterCount, characterCount, patternCount, branchCount, arcCount,
    costLogs, totalCost, totalTokens,
    recentJournals, recentChapters, recentBranches, recentArcs,
    activePatterns, finalChapters,
  ] = await Promise.all([
    prisma.journalEntry.count(),
    prisma.chapter.count(),
    prisma.character.count(),
    prisma.pattern.count({ where: { isActive: true } }),
    prisma.branch.count(),
    prisma.growthArc.count(),
    prisma.aIPassLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, operation: true, passName: true, costUsd: true, inputTokens: true, outputTokens: true, createdAt: true },
    }),
    prisma.aIPassLog.aggregate({ _sum: { costUsd: true } }),
    prisma.aIPassLog.aggregate({ _sum: { inputTokens: true, outputTokens: true } }),
    prisma.journalEntry.findMany({
      orderBy: { timestamp: "desc" },
      take: 7,
      select: { id: true, mood: true, energy: true, timestamp: true, extractedThemes: true, rawText: true },
    }),
    prisma.chapter.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
      select: { id: true, volume: true, chapterNum: true, title: true, status: true, tokenCount: true, createdAt: true },
    }),
    prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, divergeFromId: true, divergeQuestion: true, status: true, createdAt: true },
    }),
    prisma.growthArc.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, phase: true, description: true, updatedAt: true },
    }),
    prisma.pattern.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, firstObserved: true, relatedThemes: true },
    }),
    prisma.chapter.findMany({
      where: { status: "final" },
      orderBy: { chapterNum: "desc" },
      take: 3,
      select: { id: true, chapterNum: true, title: true, tokenCount: true },
    }),
  ]);

  // 计算能量趋势
  const energyTrend = recentJournals.map(j => ({ date: j.timestamp, energy: j.energy })).reverse();

  // 计算主题分布
  const themeDistribution: Record<string, number> = {};
  for (const j of recentJournals) {
    try {
      const themes = JSON.parse(j.extractedThemes ?? "[]");
      for (const t of themes) {
        const name = t.name ?? t;
        themeDistribution[name] = (themeDistribution[name] ?? 0) + 1;
      }
    } catch {}
  }

  // 计算每日成本
  const dailyCosts: Record<string, number> = {};
  for (const log of costLogs) {
    const day = new Date(log.createdAt).toISOString().slice(0, 10);
    dailyCosts[day] = (dailyCosts[day] ?? 0) + log.costUsd;
  }

  // 计算总字数
  const totalWordCount = finalChapters.reduce((sum, c) => sum + (c.tokenCount ?? 0), 0);

  return NextResponse.json({
    ok: true,
    data: {
      counts: {
        journals: journalCount,
        chapters: chapterCount,
        characters: characterCount,
        activePatterns: patternCount,
        branches: branchCount,
        growthArcs: arcCount,
        finalChapters: finalChapters.length,
      },
      ai: {
        totalCostUsd: totalCost._sum.costUsd ?? 0,
        totalTokens: (totalTokens._sum.inputTokens ?? 0) + (totalTokens._sum.outputTokens ?? 0),
        recentLogs: costLogs,
        dailyCosts,
      },
      content: {
        totalWordCount,
        latestChapter: finalChapters[0] ?? null,
      },
      trends: {
        energy: energyTrend,
        themes: themeDistribution,
      },
      recentJournals,
      recentChapters,
      recentBranches,
      recentArcs,
      activePatterns,
    },
  });
}
