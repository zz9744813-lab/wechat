import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeChapter } from "@/lib/ai/pipeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chapterId } = body;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { povCharacter: true },
    });
    if (!chapter) return NextResponse.json({ ok: false, error: "章节不存在" }, { status: 404 });

    const worldBible = await prisma.worldBible.findUnique({ where: { id: "main" } });
    const characterVoice = chapter.povCharacter
      ? `角色: ${chapter.povCharacter.name}\n原型: ${chapter.povCharacter.archetype}\n语言模式: ${chapter.povCharacter.voicePattern}\n核心创伤: ${chapter.povCharacter.coreWound}`
      : "";
    const worldContext = worldBible ? `调性: ${worldBible.tonalPalette}\n规则: ${worldBible.hardRules}` : "";

    const result = await writeChapter(chapter.passOutline, characterVoice, worldContext);

    // 更新章节
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        passDraft: result.passes[0]?.result?.text ?? "",
        passVoiceCheck: JSON.stringify(result.voiceCheck),
        passProsePolish: result.finalText,
        finalText: result.finalText,
        status: "final",
        tokenCount: result.totalTokens,
      },
    });

    // 记录成本
    for (const pass of result.passes) {
      await prisma.aIPassLog.create({
        data: {
          operation: "chapter_write",
          passName: pass.name,
          model: process.env.ANTHROPIC_MODEL ?? "",
          inputTokens: pass.tokens,
          outputTokens: 0,
          costUsd: pass.cost,
          targetId: chapterId,
          targetType: "chapter",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        chapterId,
        finalText: result.finalText,
        voiceCheck: result.voiceCheck,
        tokensUsed: result.totalTokens,
        costUsd: result.totalCost,
      },
    });
  } catch (error) {
    console.error("chapter write error:", error);
    return NextResponse.json({ ok: false, error: "写作失败" }, { status: 500 });
  }
}
