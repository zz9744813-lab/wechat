import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** 危机检测状态查询 */
export async function GET() {
  // 获取最近的危机检测记录
  const recentCrises = await prisma.aIPassLog.findMany({
    where: { passName: "crisis_detection" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const crises = recentCrises.map(log => {
    try {
      const result = JSON.parse(log.result ?? "{}");
      return {
        id: log.id,
        targetId: log.targetId,
        riskLevel: result.risk_level ?? "none",
        signals: result.signals ?? [],
        shouldContinue: result.should_continue ?? true,
        createdAt: log.createdAt,
      };
    } catch {
      return { id: log.id, riskLevel: "none", signals: [], shouldContinue: true, createdAt: log.createdAt };
    }
  });

  const hasHighRisk = crises.some(c => c.riskLevel === "high" || c.riskLevel === "critical");

  return NextResponse.json({
    ok: true,
    data: {
      recentCrises: crises,
      hasHighRisk,
      helplines: [
        { name: "全国心理援助热线", phone: "400-161-9995" },
        { name: "北京心理危机研究与干预中心", phone: "010-82951332" },
        { name: "生命热线", phone: "400-821-1215" },
        { name: "希望24热线", phone: "400-161-9995" },
      ],
    },
  });
}
