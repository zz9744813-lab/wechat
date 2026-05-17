import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeCharacterPsychology } from "@/lib/ai/pipeline";

/** 角色心理分析 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { characterId } = body;

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return NextResponse.json({ ok: false, error: "角色不存在" }, { status: 404 });

    const worldBible = await prisma.worldBible.findUnique({ where: { id: "main" } });
    const worldContext = worldBible ? `调性: ${worldBible.tonalPalette}\n规则: ${worldBible.hardRules}` : "";

    // 获取该角色 POV 的最近章节
    const recentChapters = await prisma.chapter.findMany({
      where: { povCharacterId: characterId, status: "final" },
      orderBy: { chapterNum: "desc" },
      take: 3,
      select: { finalText: true, chapterNum: true, title: true },
    });

    const chapterTexts = recentChapters.map(c => `第${c.chapterNum}章 ${c.title}:\n${c.finalText?.slice(0, 500) ?? ""}`);

    const result = await analyzeCharacterPsychology(character, chapterTexts, worldContext);

    // 记录成本
    await prisma.aIPassLog.create({
      data: {
        operation: "character_psychology",
        passName: "psychology_analysis",
        model: process.env.ANTHROPIC_MODEL ?? "",
        inputTokens: result.tokens,
        outputTokens: 0,
        costUsd: result.cost,
        targetId: characterId,
        targetType: "character",
      },
    });

    return NextResponse.json({ ok: true, data: result.psychology, tokensUsed: result.tokens, costUsd: result.cost });
  } catch (error) {
    console.error("character psychology error:", error);
    return NextResponse.json({ ok: false, error: "分析失败" }, { status: 500 });
  }
}
