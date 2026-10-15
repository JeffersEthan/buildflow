import "next-auth";
import "next-auth/jwt";
import type { Role } from "@prisma/client";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    companyId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    companyId?: string;
  }
}
