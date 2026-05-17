import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processJournal } from "@/lib/ai/pipeline";
import { buildSanitizedSignal, privacyCheck, assessPrivacyLevel } from "@/lib/bridge";

/** 语音输入处理 — 接收转写文本并处理 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, mood, energy, source } = body;

    if (!transcript?.trim()) {
      return NextResponse.json({ ok: false, error: "transcript required" }, { status: 400 });
    }

    // 隐私检查
    const privacy = privacyCheck(transcript);
    const textToProcess = privacy.safe ? transcript : privacy.sanitizedText;

    // 自动评估隐私级别
    const privacyLevel = assessPrivacyLevel(transcript);

    // 获取已知模式
    const patterns = await prisma.pattern.findMany({ where: { isActive: true } });
    const patternDescriptions = patterns.map((p) => `${p.id}: ${p.name} — ${p.description}`);

    // 运行 7-pass 处理
    const result = await processJournal(textToProcess, patternDescriptions);

    // 构建去敏信号包
    const bridgeSignal = buildSanitizedSignal(result.events, result.emotions, result.themes, result.bridge);

    // 保存
    const entry = await prisma.journalEntry.create({
      data: {
        rawText: textToProcess,
        mood: mood ?? "平静",
        energy: energy ?? 5,
        tags: JSON.stringify(source === "voice" ? ["语音输入"] : []),
        privacyLevel,
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

    // 危机检测结果
    const crisisResult = result.crisis;
    if (crisisResult?.risk_level === "high" || crisisResult?.risk_level === "critical") {
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
          crisis: {
            detected: true,
            riskLevel: crisisResult.risk_level,
            helplines: [
              { name: "全国心理援助热线", phone: "400-161-9995" },
              { name: "生命热线", phone: "400-821-1215" },
              { name: "希望24热线", phone: "400-161-9995" },
            ],
          },
          privacyWarnings: privacy.warnings,
        },
      });
    }

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
        privacyWarnings: privacy.warnings,
      },
    });
  } catch (error) {
    console.error("voice process error:", error);
    return NextResponse.json({ ok: false, error: "处理失败" }, { status: 500 });
  }
}
