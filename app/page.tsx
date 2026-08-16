import { Navbar } from "@/components/navbar";
import { TasteHomepage } from "@/components/home/taste-homepage";
import { YouTubeStatusAlert } from "@/components/youtube-status-alert";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-paper)] text-[var(--color-ink)]">
      <Navbar />
      <div className="fixed inset-x-0 top-14 z-40 mx-auto w-full max-w-3xl px-4">
        <YouTubeStatusAlert />
      </div>
      <TasteHomepage />
    </div>
  );
}
