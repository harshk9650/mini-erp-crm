import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance across the app (avoids exhausting DB connections in dev)
export const prisma = new PrismaClient();
