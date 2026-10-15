import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildFlow — Construction Project Management",
  description:
    "BuildFlow is an original, open-source platform for running construction projects: scheduling, budgets, daily logs, files, estimates, change orders, selections, and client communication in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
