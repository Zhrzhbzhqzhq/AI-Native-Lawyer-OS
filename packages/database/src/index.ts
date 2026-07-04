import { PrismaClient } from "@prisma/client";

export type { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
