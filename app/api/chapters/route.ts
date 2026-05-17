import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAnthropic, getModel } from "@/lib/ai/client";
import { GLOBAL_RULES, CHAPTER_OUTLINE_PROMPT } from "@/lib/ai/prompts";

export async function GET(req: NextRequest) {
  const volume = req.nextUrl.searchParams.get("volume");
  const where = volume ? { volume: parseInt(volume) } : {};
  const chapters = await prisma.chapter.findMany({ where, orderBy: { chapterNum: "asc" } });
  return NextResponse.json({ ok: true, data: chapters });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { volume, chapterNum, povCharacterId, bridgeSignal } = body;

    // 获取世界圣经和角色信息
    const worldBible = await prisma.worldBible.findUnique({ where: { id: "main" } });
    const characters = await prisma.character.findMany({ where: { isProtagonist: true } });
    const povChar = povCharacterId
      ? await prisma.character.findUnique({ where: { id: povCharacterId } })
      : characters[0];

    // 获取之前的章节摘要作为上下文
    const prevChapters = await prisma.chapter.findMany({
      orderBy: { chapterNum: "desc" },
      take: 3,
      select: { chapterNum: true, title: true, synopsis: true },
    });

    const worldContext = `# 世界设定\n${worldBible?.metaphysics ?? "待构建"}\n# 调性\n${worldBible?.tonalPalette ?? "克制、深远"}`;
    const charContext = `# POV 角色\n${povChar ? `${povChar.name} — ${povChar.archetype}\n核心创伤: ${povChar.coreWound}\n成长边缘: ${povChar.growthEdge}\n语言模式: ${povChar.voicePattern}` : "未设定"}`;
    const prevContext = prevChapters.length > 0 ? `# 前几章\n${prevChapters.map((c) => `第${c.chapterNum}章 ${c.title}: ${c.synopsis}`).join("\n")}` : "";
    const signalContext = bridgeSignal ? `# 用户信号包（已去敏）\n${typeof bridgeSignal === "string" ? bridgeSignal : JSON.stringify(bridgeSignal)}` : "";

    // AI 生成大纲
    const client = getAnthropic();
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 2000,
      system: GLOBAL_RULES,
      messages: [{
        role: "user",
        content: `${CHAPTER_OUTLINE_PROMPT}\n\n${worldContext}\n\n${charContext}\n\n${prevContext}\n\n${signalContext}\n\n# 卷: ${volume ?? 1}, 章: ${chapterNum ?? "下一章"}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ ok: false, error: "AI 未返回有效大纲" }, { status: 500 });

    const outline = JSON.parse(jsonMatch[0]).outline;

    // 保存章节
    const lastChapter = await prisma.chapter.findFirst({ orderBy: { chapterNum: "desc" } });
    const num = chapterNum ?? (lastChapter?.chapterNum ?? 0) + 1;

    const chapter = await prisma.chapter.create({
      data: {
        volume: volume ?? 1,
        chapterNum: num,
        title: outline.chapter_title,
        povCharacterId: povChar?.id,
        synopsis: outline.synopsis,
        status: "outline",
        passOutline: JSON.stringify(outline),
      },
    });

    return NextResponse.json({ ok: true, data: { chapter, outline } });
  } catch (error) {
    console.error("chapter outline error:", error);
    return NextResponse.json({ ok: false, error: "生成大纲失败" }, { status: 500 });
  }
}
