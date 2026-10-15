import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

/**
 * Edge-safe Auth.js config (used by proxy.ts). The Credentials `authorize`
 * callback lazily imports the database so this module never pulls Prisma
 * into the Edge runtime at import time.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)
          ?.toLowerCase()
          .trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { db } = await import("@/lib/db");
        const user = await db.user.findFirst({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
          companyId: user.companyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.companyId = user.companyId as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
