import { PrismaClient } from "@prisma/client";
import { PrismaClient as DesktopPrismaClient } from "../generated/desktop-client";

export type { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  if (process.env.LAWDESK_MODE === "desktop") {
    return new DesktopPrismaClient() as unknown as PrismaClient;
  }

  return new PrismaClient();
}
