import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractResonance } from "@/lib/ai/pipeline";

/** 反思提示与共鸣段落 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "prompts";

  if (type === "resonance") {
    // 获取最近完成的章节,提取共鸣段落
    const latestChapter = await prisma.chapter.findFirst({
      where: { status: "final" },
      orderBy: { chapterNum: "desc" },
    });

    if (!latestChapter?.finalText) {
      return NextResponse.json({ ok: true, data: { passages: [], message: "还没有完成的章节" } });
    }

    // 获取用户最近的主题
    const recentJournals = await prisma.journalEntry.findMany({
      orderBy: { timestamp: "desc" },
      take: 5,
      select: { extractedThemes: true },
    });

    const allThemes: string[] = [];
    for (const j of recentJournals) {
      try {
        const themes = JSON.parse(j.extractedThemes ?? "[]");
        allThemes.push(...themes.map((t: any) => t.name ?? t));
      } catch {}
    }
    const uniqueThemes = [...new Set(allThemes)].slice(0, 5);

    if (uniqueThemes.length === 0) {
      return NextResponse.json({ ok: true, data: { passages: [], message: "还没有足够的主题数据" } });
    }

    const result = await extractResonance(latestChapter.finalText, uniqueThemes);

    await prisma.aIPassLog.create({
      data: {
        operation: "resonance_extraction",
        passName: "resonance",
        model: process.env.ANTHROPIC_FAST_MODEL ?? "",
        inputTokens: result.tokens,
        outputTokens: 0,
        costUsd: result.cost,
        targetId: latestChapter.id,
        targetType: "chapter",
      },
    });

    return NextResponse.json({ ok: true, data: result.resonance });
  }

  // 默认:返回反思提示 (从最近日记中提取)
  const latestJournal = await prisma.journalEntry.findFirst({
    orderBy: { timestamp: "desc" },
    where: { processedAt: { not: null } },
  });

  if (!latestJournal) {
    return NextResponse.json({ ok: true, data: { prompts: [], message: "写一篇日记后,反思提示会自动生成" } });
  }

  try {
    const prompts = JSON.parse(latestJournal.processPasses ?? "[]");
    const reflectionPass = prompts.find((p: any) => p.name === "reflection_prompts");
    const reflection = prompts.find((p: any) => p.name === "reflection");

    return NextResponse.json({
      ok: true,
      data: {
        prompts: reflectionPass?.result?.prompts ?? [],
        reflection: reflection?.result?.text ?? "",
        journalId: latestJournal.id,
        timestamp: latestJournal.timestamp,
      },
    });
  } catch {
    return NextResponse.json({ ok: true, data: { prompts: [], reflection: "" } });
  }
}
