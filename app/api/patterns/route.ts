import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { trackPatternEvolution } from "@/lib/ai/pipeline";

export async function GET(req: NextRequest) {
  const activeOnly = req.nextUrl.searchParams.get("active") !== "false";
  const where = activeOnly ? { isActive: true } : {};
  const patterns = await prisma.pattern.findMany({ where, orderBy: { createdAt: "desc" } });

  // 解析 JSON 字段
  const parsed = patterns.map(p => ({
    ...p,
    triggerSignatures: tryParse(p.triggerSignatures),
    typicalResponse: tryParse(p.typicalResponse),
    relatedThemes: tryParse(p.relatedThemes),
    characterCarriers: tryParse(p.characterCarriers),
    evolutionLog: tryParse(p.evolutionLog),
  }));

  return NextResponse.json({ ok: true, data: parsed });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pattern = await prisma.pattern.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        triggerSignatures: JSON.stringify(body.triggerSignatures ?? []),
        typicalResponse: JSON.stringify(body.typicalResponse ?? []),
        relatedThemes: JSON.stringify(body.relatedThemes ?? []),
        characterCarriers: JSON.stringify(body.characterCarriers ?? []),
      },
    });
    return NextResponse.json({ ok: true, data: pattern });
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
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.triggerSignatures !== undefined) data.triggerSignatures = JSON.stringify(updates.triggerSignatures);
    if (updates.typicalResponse !== undefined) data.typicalResponse = JSON.stringify(updates.typicalResponse);
    if (updates.relatedThemes !== undefined) data.relatedThemes = JSON.stringify(updates.relatedThemes);
    if (updates.characterCarriers !== undefined) data.characterCarriers = JSON.stringify(updates.characterCarriers);
    if (updates.evolutionLog !== undefined) data.evolutionLog = JSON.stringify(updates.evolutionLog);

    const pattern = await prisma.pattern.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: pattern });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await prisma.pattern.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "删除失败" }, { status: 500 });
  }
}

function tryParse(json: string): any {
  try { return JSON.parse(json); } catch { return json; }
}
