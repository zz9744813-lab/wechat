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
      ? `角色: ${chapter.povCharacter.name}\n原型: ${chapter.povCharacter.archetype}\n语言模式: ${chapter.povCharacter.voicePattern}\n核心创伤: ${chapter.povCharacter.coreWound}\n成长边缘: ${chapter.povCharacter.growthEdge}\n防御机制: ${chapter.povCharacter.defenseMechanisms}`
      : "";
    const worldContext = worldBible
      ? `调性: ${worldBible.tonalPalette}\n宇宙规则: ${worldBible.metaphysics}\n地理: ${worldBible.geography}\n势力: ${worldBible.factions}\n历史: ${worldBible.history}\n规则: ${worldBible.hardRules}`
      : "";

    // 获取前一章文本用于衔接
    const prevChapter = await prisma.chapter.findFirst({
      where: { chapterNum: chapter.chapterNum - 1, status: "final" },
      select: { finalText: true },
    });

    const result = await writeChapter(
      chapter.passOutline,
      characterVoice,
      worldContext,
      prevChapter?.finalText ?? undefined,
    );

    // 更新章节 — 保存所有 pass 的结果
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        passDraft: result.passes.find(p => p.name === "draft")?.result?.text ?? "",
        passVoiceCheck: JSON.stringify(result.voiceCheck),
        passConsistency: JSON.stringify(result.consistency),
        passProsePolish: result.passes.find(p => p.name === "prose_polish")?.result?.text ?? "",
        passThemeAudit: JSON.stringify(result.themeAudit),
        passEmotionArc: JSON.stringify(result.emotionArc),
        passFinal: result.finalText,
        finalText: result.finalText,
        status: "final",
        tokenCount: result.totalTokens,
      },
    });

    // 记录每个 pass 的成本
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
        qualityScore: result.qualityScore,
        voiceCheck: result.voiceCheck,
        consistency: result.consistency,
        themeAudit: result.themeAudit,
        emotionArc: result.emotionArc,
        styleSpectrum: result.styleSpectrum,
        tokensUsed: result.totalTokens,
        costUsd: result.totalCost,
        passCount: result.passes.length,
      },
    });
  } catch (error) {
    console.error("chapter write error:", error);
    return NextResponse.json({ ok: false, error: "写作失败" }, { status: 500 });
  }
}
