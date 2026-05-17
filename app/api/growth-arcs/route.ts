import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const arcs = await prisma.growthArc.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, data: arcs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const arc = await prisma.growthArc.create({
      data: {
        name: body.name,
        phase: body.phase ?? "觉察",
        description: body.description ?? "",
        keyMilestones: JSON.stringify(body.keyMilestones ?? []),
        linkedJournalIds: JSON.stringify(body.linkedJournalIds ?? []),
        linkedChapterIds: JSON.stringify(body.linkedChapterIds ?? []),
      },
    });
    return NextResponse.json({ ok: true, data: arc });
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
    if (updates.phase !== undefined) data.phase = updates.phase;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.keyMilestones !== undefined) data.keyMilestones = JSON.stringify(updates.keyMilestones);
    if (updates.linkedJournalIds !== undefined) data.linkedJournalIds = JSON.stringify(updates.linkedJournalIds);
    if (updates.linkedChapterIds !== undefined) data.linkedChapterIds = JSON.stringify(updates.linkedChapterIds);

    const arc = await prisma.growthArc.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: arc });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await prisma.growthArc.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "删除失败" }, { status: 500 });
  }
}
