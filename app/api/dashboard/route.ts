import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [journalCount, chapterCount, characterCount, patternCount, costLogs] = await Promise.all([
    prisma.journalEntry.count(),
    prisma.chapter.count(),
    prisma.character.count(),
    prisma.pattern.count({ where: { isActive: true } }),
    prisma.aIPassLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { operation: true, passName: true, costUsd: true, createdAt: true },
    }),
  ]);

  const totalCost = await prisma.aIPassLog.aggregate({ _sum: { costUsd: true } });
  const totalTokens = await prisma.aIPassLog.aggregate({ _sum: { inputTokens: true, outputTokens: true } });

  const recentJournals = await prisma.journalEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: 5,
    select: { id: true, mood: true, energy: true, timestamp: true, extractedThemes: true },
  });

  const recentChapters = await prisma.chapter.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, volume: true, chapterNum: true, title: true, status: true },
  });

  return NextResponse.json({
    ok: true,
    data: {
      counts: { journals: journalCount, chapters: chapterCount, characters: characterCount, activePatterns: patternCount },
      ai: {
        totalCostUsd: totalCost._sum.costUsd ?? 0,
        totalTokens: (totalTokens._sum.inputTokens ?? 0) + (totalTokens._sum.outputTokens ?? 0),
        recentLogs: costLogs,
      },
      recentJournals,
      recentChapters,
    },
  });
}
