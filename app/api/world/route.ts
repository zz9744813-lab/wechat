import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const world = await prisma.worldBible.findUnique({ where: { id: "main" } });
  const characters = await prisma.character.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, data: { world, characters } });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { metaphysics, geography, factions, history, tonalPalette, hardRules, recurringMotifs } = body;

    const world = await prisma.worldBible.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        metaphysics: metaphysics ?? "",
        geography: geography ?? "",
        factions: factions ?? "",
        history: history ?? "",
        tonalPalette: tonalPalette ?? "",
        hardRules: JSON.stringify(hardRules ?? []),
        recurringMotifs: JSON.stringify(recurringMotifs ?? []),
      },
      update: {
        ...(metaphysics !== undefined && { metaphysics }),
        ...(geography !== undefined && { geography }),
        ...(factions !== undefined && { factions }),
        ...(history !== undefined && { history }),
        ...(tonalPalette !== undefined && { tonalPalette }),
        ...(hardRules !== undefined && { hardRules: JSON.stringify(hardRules) }),
        ...(recurringMotifs !== undefined && { recurringMotifs: JSON.stringify(recurringMotifs) }),
      },
    });

    return NextResponse.json({ ok: true, data: world });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}
