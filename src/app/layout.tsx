import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/auth";
import { NavTabs } from "@/components/nav-tabs";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ad Library",
  description: "Alan Ad Creative Lab — digital asset management",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-6 px-4">
            <Link href="/library" className="text-sm font-bold tracking-tight">
              Ad&nbsp;Library
            </Link>
            <NavTabs />
            <div className="ml-auto text-xs text-neutral-500">{user?.email}</div>
          </div>
        </header>
        <main className="mx-auto max-w-screen-2xl px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
