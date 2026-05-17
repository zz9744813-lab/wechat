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
        arcPosition: body.arcPosition ?? "",
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.archetype !== undefined) data.archetype = updates.archetype;
    if (updates.physicalDesc !== undefined) data.physicalDesc = updates.physicalDesc;
    if (updates.coreWound !== undefined) data.coreWound = updates.coreWound;
    if (updates.defenseMechanisms !== undefined) data.defenseMechanisms = JSON.stringify(updates.defenseMechanisms);
    if (updates.growthEdge !== undefined) data.growthEdge = updates.growthEdge;
    if (updates.voicePattern !== undefined) data.voicePattern = updates.voicePattern;
    if (updates.arcPosition !== undefined) data.arcPosition = updates.arcPosition;
    if (updates.relationships !== undefined) data.relationships = JSON.stringify(updates.relationships);
    if (updates.secretKnowledge !== undefined) data.secretKnowledge = updates.secretKnowledge;
    if (updates.mirrorLink !== undefined) data.mirrorLink = JSON.stringify(updates.mirrorLink);
    if (updates.isProtagonist !== undefined) data.isProtagonist = updates.isProtagonist;

    const character = await prisma.character.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: character });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await prisma.character.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "删除失败" }, { status: 500 });
  }
}
