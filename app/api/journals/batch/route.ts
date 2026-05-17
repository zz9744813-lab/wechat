import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processJournal } from "@/lib/ai/pipeline";
import { buildSanitizedSignal } from "@/lib/bridge";

/** 批量日记处理 — 用于回填或重新处理 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, journalIds } = body;

    if (action === "reprocess_all") {
      // 重新处理所有未处理的日记
      const unprocessed = await prisma.journalEntry.findMany({
        where: { processedAt: null },
        orderBy: { timestamp: "asc" },
        take: 10, // 限制批量大小
      });

      const results = [];
      for (const entry of unprocessed) {
        try {
          const patterns = await prisma.pattern.findMany({ where: { isActive: true } });
          const patternDescriptions = patterns.map((p) => `${p.id}: ${p.name} — ${p.description}`);
          const result = await processJournal(entry.rawText, patternDescriptions);
          const bridgeSignal = buildSanitizedSignal(result.events, result.emotions, result.themes, result.bridge);

          await prisma.journalEntry.update({
            where: { id: entry.id },
            data: {
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

          results.push({ id: entry.id, status: "ok", tokens: result.totalTokens });
        } catch (e) {
          results.push({ id: entry.id, status: "error", error: String(e) });
        }
      }

      return NextResponse.json({ ok: true, data: results });
    }

    if (action === "reprocess_selected" && journalIds?.length > 0) {
      const results = [];
      for (const id of journalIds) {
        const entry = await prisma.journalEntry.findUnique({ where: { id } });
        if (!entry) { results.push({ id, status: "not_found" }); continue; }

        try {
          const patterns = await prisma.pattern.findMany({ where: { isActive: true } });
          const patternDescriptions = patterns.map((p) => `${p.id}: ${p.name} — ${p.description}`);
          const result = await processJournal(entry.rawText, patternDescriptions);
          const bridgeSignal = buildSanitizedSignal(result.events, result.emotions, result.themes, result.bridge);

          await prisma.journalEntry.update({
            where: { id },
            data: {
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

          results.push({ id, status: "ok", tokens: result.totalTokens });
        } catch (e) {
          results.push({ id, status: "error", error: String(e) });
        }
      }

      return NextResponse.json({ ok: true, data: results });
    }

    return NextResponse.json({ ok: false, error: "无效的 action" }, { status: 400 });
  } catch (error) {
    console.error("batch process error:", error);
    return NextResponse.json({ ok: false, error: "批量处理失败" }, { status: 500 });
  }
}
