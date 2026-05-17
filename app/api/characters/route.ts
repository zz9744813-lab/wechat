import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const characters = await prisma.character.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, data: characters });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const character = await prisma.character.create({
      data: {
        name: body.name,
        archetype: body.archetype ?? "",
        physicalDesc: body.physicalDesc ?? "",
        coreWound: body.coreWound ?? "",
        defenseMechanisms: JSON.stringify(body.defenseMechanisms ?? []),
        growthEdge: body.growthEdge ?? "",
        voicePattern: body.voicePattern ?? "",
        relationships: JSON.stringify(body.relationships ?? {}),
        secretKnowledge: body.secretKnowledge ?? "",
        mirrorLink: JSON.stringify(body.mirrorLink ?? []),
        isProtagonist: body.isProtagonist ?? false,
      },
    });
    return NextResponse.json({ ok: true, data: character });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "创建失败" }, { status: 500 });
  }
}
