"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";
import { GameIcon, type GameIconName } from "./game-icon";

const ICON_MAP: Record<string, GameIconName> = {
  Play: "play",
  Clock: "time",
  BookOpen: "book",
  User: "user",
};

export function MobileTabBar({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="slide-up-fade md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/8 bg-black/90 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
    >
      <div className="flex items-center justify-around h-[56px]">
        {MAIN_NAV_ITEMS.map((item) => {
          const iconName = ICON_MAP[item.iconName];
          const isActive = item.matchPattern(pathname);

          // 需要登录的标签，未登录时跳转 /login
          const href =
            item.authRequired && !isAuthenticated ? "/login" : item.href;

          return (
            <Link
              key={item.id}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[64px]",
                "transition-all duration-200",
                isActive
                  ? "text-[#0099ff]"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              <GameIcon
                name={iconName}
                size={20}
                className={isActive ? "opacity-100" : "opacity-50"}
              />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
