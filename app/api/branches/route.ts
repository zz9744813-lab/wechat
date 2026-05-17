import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBranch } from "@/lib/ai/pipeline";

export async function GET() {
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, data: branches });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chapterId, divergeQuestion } = body;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { povCharacter: true },
    });
    if (!chapter) return NextResponse.json({ ok: false, error: "章节不存在" }, { status: 404 });
    if (!chapter.finalText) return NextResponse.json({ ok: false, error: "章节尚未写作完成" }, { status: 400 });

    const worldBible = await prisma.worldBible.findUnique({ where: { id: "main" } });
    const characterContext = chapter.povCharacter
      ? `角色: ${chapter.povCharacter.name}\n原型: ${chapter.povCharacter.archetype}\n核心创伤: ${chapter.povCharacter.coreWound}`
      : "";
    const worldContext = worldBible ? `调性: ${worldBible.tonalPalette}\n规则: ${worldBible.hardRules}` : "";

    const result = await generateBranch(chapter.finalText, characterContext, worldContext);

    const branch = await prisma.branch.create({
      data: {
        divergeFromId: chapterId,
        divergeQuestion: divergeQuestion ?? result.branch.diverge_point ?? "",
        generatedChapters: JSON.stringify(result.branch.alternative_scenes ?? []),
        status: "exploring",
      },
    });

    // 记录成本
    for (const pass of result.passes) {
      await prisma.aIPassLog.create({
        data: {
          operation: "branch_generation",
          passName: pass.name,
          model: process.env.ANTHROPIC_MODEL ?? "",
          inputTokens: pass.tokens,
          outputTokens: 0,
          costUsd: pass.cost,
          targetId: branch.id,
          targetType: "branch",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: { branch, generation: result.branch, tokensUsed: result.totalTokens, costUsd: result.totalCost },
    });
  } catch (error) {
    console.error("branch generation error:", error);
    return NextResponse.json({ ok: false, error: "分支生成失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const branch = await prisma.branch.update({
      where: { id },
      data: { status: status ?? "exploring" },
    });
    return NextResponse.json({ ok: true, data: branch });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}
