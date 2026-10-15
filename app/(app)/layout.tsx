import { requireSession } from "@/lib/auth-helpers";
import { AppShell } from "@/components/app-shell";

// All pages in this group need the request session — never prerender them.
export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
