import { PrismaClient } from "./generated/prisma/client";
import path from "path";

// Prisma 6 new client resolves SQLite paths from lib/generated/prisma/.
// We force an absolute path to avoid "Unable to open database" errors in Next.js.
const datasourceUrl = `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"], datasourceUrl });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
