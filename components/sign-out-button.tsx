"use client";

import { signOut } from "next-auth/react";
import { Button } from "./ui";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start !px-3 text-gray-300 hover:!bg-white/10 hover:text-white"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sign out
    </Button>
  );
}
