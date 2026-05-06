import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Carthage Market",
  description: "Carthage Market Tunisia multi-vendor e-commerce platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-950 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
