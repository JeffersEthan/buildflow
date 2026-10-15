import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 connects through a driver adapter. Reuse a single client across
// hot reloads in development. The connection string falls back to the local
// dev default so importing this module never throws at build time; the pool
// only connects on the first real query.
function createClient(): PrismaClient {
  const connectionString =
    process.env["DATABASE_URL"] ??
    "postgresql://buildflow:buildflow@localhost:5432/buildflow";
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
