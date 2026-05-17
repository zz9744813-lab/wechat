import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processJournal } from "@/lib/ai/pipeline";
import { buildSanitizedSignal } from "@/lib/bridge";

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const size = parseInt(req.nextUrl.searchParams.get("size") ?? "20");

  const entries = await prisma.journalEntry.findMany({
    orderBy: { timestamp: "desc" },
    skip: (page - 1) * size,
    take: size,
  });
  const total = await prisma.journalEntry.count();

  return NextResponse.json({ ok: true, data: entries, total, page, size });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, mood, energy, tags, privacyLevel } = body;

    if (!rawText?.trim()) {
      return NextResponse.json({ ok: false, error: "rawText required" }, { status: 400 });
    }

    // 获取已知模式用于匹配
    const patterns = await prisma.pattern.findMany({ where: { isActive: true } });
    const patternDescriptions = patterns.map((p) => `${p.id}: ${p.name} — ${p.description}`);

    // 运行 7-pass 处理
    const result = await processJournal(rawText, patternDescriptions);

    // 构建去敏信号包
    const bridgeSignal = buildSanitizedSignal(result.events, result.emotions, result.themes, result.bridge);

    // 保存
    const entry = await prisma.journalEntry.create({
      data: {
        rawText,
        mood: mood ?? "calm",
        energy: energy ?? 5,
        tags: JSON.stringify(tags ?? []),
        privacyLevel: privacyLevel ?? 2,
        extractedEvents: JSON.stringify(result.events),
        extractedEmotions: JSON.stringify(result.emotions),
        extractedThoughts: JSON.stringify(result.thoughts),
        extractedThemes: JSON.stringify(result.themes),
        matchedPatterns: JSON.stringify(result.patterns),
        bridgeSignal,
        processPasses: JSON.stringify(result.passes),
        processedAt: new Date(),
      },
    });

    // 记录 AI 成本
    await prisma.aIPassLog.create({
      data: {
        operation: "journal_process",
        passName: "7_pass_pipeline",
        model: process.env.ANTHROPIC_MODEL ?? "",
        inputTokens: result.totalTokens,
        outputTokens: 0,
        costUsd: result.totalCost,
        targetId: entry.id,
        targetType: "journal",
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: entry.id,
        events: result.events,
        emotions: result.emotions,
        themes: result.themes,
        bridge: result.bridge,
        reflection: result.reflection,
        tokensUsed: result.totalTokens,
        costUsd: result.totalCost,
      },
    });
  } catch (error) {
    console.error("journal process error:", error);
    return NextResponse.json({ ok: false, error: "处理失败" }, { status: 500 });
  }
}
