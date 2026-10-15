import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration. The connection URL is used by `prisma migrate`
// commands. The running app connects through a driver adapter instead
// (see lib/db.ts).
export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
