import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 创建默认世界圣经
  const existing = await prisma.worldBible.findUnique({ where: { id: "main" } });
  if (!existing) {
    await prisma.worldBible.create({
      data: {
        id: "main",
        metaphysics: "待构建 — 通过与用户深度对话共建",
        tonalPalette: "克制、深远、不喧哗",
      },
    });
    console.log("Created default WorldBible");
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
