"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页", icon: "\u2600" },
  { href: "/journal", label: "日记", icon: "\u270D" },
  { href: "/novel", label: "小说", icon: "\u2606" },
  { href: "/world", label: "世界", icon: "\u2302" },
  { href: "/patterns", label: "模式", icon: "\u2261" },
  { href: "/settings", label: "设置", icon: "\u2699" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-52 border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">Mirror Epic</h1>
        <p className="text-xs text-muted-foreground">你写一行,世界长一卷</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}>
              <span>{item.icon}</span><span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
