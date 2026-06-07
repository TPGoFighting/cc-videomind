import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, string> = {
  user: "/icons/user.svg",
  menu: "/icons/menu.svg",
  crown: "/icons/crown.svg",
  settings: "/icons/settings.svg",
  fire: "/icons/fire.svg",
  book: "/icons/book.svg",
  bookmark: "/icons/bookmark.svg",
  notebook: "/icons/notebook.svg",
  download: "/icons/download.svg",
  play: "/icons/play.svg",
  time: "/icons/time.svg",
  alarm: "/icons/alarm.svg",
  home: "/icons/home.svg",
  video: "/icons/video.svg",
  search: "/icons/search.svg",
  pause: "/icons/pause.svg",
  phone: "/icons/phone.svg",
} as const;

export type GameIconName = keyof typeof ICONS;

export function GameIcon({
  name,
  size = 16,
  className,
}: {
  name: GameIconName;
  size?: number;
  className?: string;
}) {
  const src = ICONS[name];
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className={cn("inline-block shrink-0", className)}
    />
  );
}
