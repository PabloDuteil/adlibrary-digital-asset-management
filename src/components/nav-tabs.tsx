"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/library", label: "Library" },
  { href: "/distribution", label: "Distribution" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/nomenclature", label: "Nomenclature" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex h-full items-stretch gap-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center border-b-2 px-3 text-sm ${
              active
                ? "border-indigo-600 font-semibold text-indigo-700"
                : "border-transparent text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
