import { Navbar } from "@/components/navbar";
import { TasteHomepage } from "@/components/home/taste-homepage";
import { YouTubeStatusAlert } from "@/components/youtube-status-alert";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080b0f] text-white">
      <Navbar />
      <div className="fixed inset-x-0 top-14 z-40 mx-auto w-full max-w-3xl px-4">
        <YouTubeStatusAlert />
      </div>
      <TasteHomepage />
    </div>
  );
}
