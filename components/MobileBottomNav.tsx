"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/", label: "Ana Sayfa", icon: "⌂" },
  { href: "/search", label: "Ara", icon: "⌕" },
  { href: "/shopping", label: "Sepet", icon: "🛒" },
  { href: "/scanner", label: "Barkod", icon: "▣" },
  { href: "/login", label: "Hesabım", icon: "●" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobil ana menü"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                isActive
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`text-xl leading-none ${
                  isActive ? "scale-110" : ""
                }`}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
